// Audio-core functional tests in a real browser: offline renders through buildEngine and the
// real output chain (worklets included). The safety suite (safety-cases.js) covers limits;
// these cover behaviour: every synth sounds and stops, pitch, levels, envelopes, the newer
// params, determinism, voice caps, mute/solo and the offline song render.

import { buildEngine } from '../../audio/engine.js';
import { loadWorklets } from '../../audio/worklet-loader.js';
import { conditionSample } from '../../audio/sample.js';
import { defaultParams, PARAM_DEFS, SYNTH_TYPES } from '../../audio/synths/param-defs.js';
import { renderSongToWav } from '../../audio/recording/offline-render.js';
import { createOfflineScheduler } from '../../playback/scheduler.js';
import { parseMidi } from '../../midi/parse.js';

const SR = 48000;
const MASTER = 0.25;                   // default master (−12 dB); the limiter stays transparent
const CEILING = Math.pow(10, -1 / 20);

let nextId = 1;
function widget(type, params = {}, fields = {}) {
  return { id: `c${nextId++}`, type, muted: false, solo: false, armed: false, volumeDb: -6, part: 'all', ...fields, params: { ...defaultParams(type), ...params } };
}

/** Renders `widgets` for `seconds`; `play(engine, ctx)` schedules notes. Returns channel 0. */
async function render(widgets, play, { seconds = 3, sampleRate = SR } = {}) {
  const ctx = new OfflineAudioContext({ numberOfChannels: 2, length: Math.round(seconds * sampleRate), sampleRate });
  const engine = await buildEngine(ctx, 1, widgets, { masterGain: MASTER });
  const targets = engine.targets();
  play(engine, targets.map((t) => t.inst), ctx);
  engine.pump(seconds);
  await engine.flush();                // pluck: note messages reach the worklet before rendering
  const buf = await ctx.startRendering();
  return { x: buf.getChannelData(0), sr: sampleRate, engine };
}

/** One note per instrument: on at `on`, off at `off`. */
const note = (pitch = 60, vel = 100, on = 0.1, off = 1.0) => (engine, insts) => {
  for (const inst of insts) {
    inst.noteOn(pitch, vel, on, 'file');
    if (off !== null) inst.noteOff(pitch, off, 'file');
  }
};

function span(x, sr, a, b) {
  return x.subarray(Math.max(0, Math.round(a * sr)), Math.min(x.length, Math.round(b * sr)));
}
function peak(s) { let m = 0; for (const v of s) { const a = Math.abs(v); if (a > m) m = a; } return m; }
function rms(s) { let q = 0; for (const v of s) q += v * v; return Math.sqrt(q / Math.max(1, s.length)); }
function finite(x) { for (const v of x) if (!Number.isFinite(v)) return false; return true; }
function maxDiff(a, b) { let m = 0; for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i])); return m; }
/** RMS of the first difference over RMS: a brightness proxy (higher = more high-frequency energy). */
function brightness(s) { let d = 0; for (let i = 1; i < s.length; i++) d += (s[i] - s[i - 1]) ** 2; return Math.sqrt(d / s.length) / Math.max(1e-12, rms(s)); }

/** Fundamental by normalised autocorrelation over 30–2000 Hz, refined by parabolic interpolation. */
function f0(s, sr) {
  const minLag = Math.floor(sr / 2000), maxLag = Math.ceil(sr / 30);
  const n = s.length - maxLag;
  const r = (lag) => { let a = 0, e0 = 0, e1 = 0; for (let i = 0; i < n; i++) { a += s[i] * s[i + lag]; e0 += s[i] * s[i]; e1 += s[i + lag] * s[i + lag]; } return a / Math.sqrt(e0 * e1 || 1); };
  const vals = [];
  for (let lag = minLag; lag <= maxLag; lag++) vals.push(r(lag));
  // First lag whose correlation is within 5 % of the best avoids octave errors.
  const best = Math.max(...vals);
  let i = vals.findIndex((v, k) => v >= best * 0.95 && k > 0 && v >= vals[k - 1] && (k + 1 >= vals.length || v >= vals[k + 1]));
  if (i < 0) i = vals.indexOf(best);
  const y0 = vals[i - 1] ?? vals[i], y1 = vals[i], y2 = vals[i + 1] ?? vals[i];
  const shift = (y0 - y2) / (2 * (y0 - 2 * y1 + y2) || 1);
  return sr / (minLag + i + (Number.isFinite(shift) ? shift : 0));
}

const check = (name, value, pass) => ({ name, value, pass: !!pass });
const within = (v, target, tol) => Math.abs(v - target) <= tol * Math.abs(target);

/** A 2 s conditioned sample: first half silent, second half a 220 Hz sine. */
function halfSineSample() {
  const raw = Float32Array.from({ length: 2 * SR }, (_, i) => (i < SR ? 0 : 0.5 * Math.sin((2 * Math.PI * 220 * i) / SR)));
  const { data } = conditionSample([raw], SR);
  const buf = new AudioBuffer({ length: data.length, numberOfChannels: 1, sampleRate: SR });
  buf.copyToChannel(data, 0);
  return buf;
}

/** Every number param at its min (or max); enums keep their default. */
function extremes(type, end) {
  const out = {};
  for (const d of PARAM_DEFS[type]) {
    if (d.kind === 'number') out[d.name] = d[end];
    else if (d.kind === 'array') out[d.name] = new Array(d.length).fill(d[end]);
  }
  return out;
}

const GENTLE = {                       // per type: params for clean pitch measurement
  subtractive: { waveform: 'sine', cutoff: 16000 },
  fm: { index: 0 },
  additive: { harmonics: [1, 0, 0, 0, 0, 0, 0, 0] },
  pluck: { damping: 0.5, brightness: 0.3, decay: 4 },
  granular: { source: 'saw', grainSize: 0.12, density: 30, spray: 0 },
};

const CASES = [];
const add = (id, name, run) => CASES.push({ id, name, run });

for (const type of SYNTH_TYPES) {
  add(`${type}-life`, `${type}: silent before the note, sounds during it, silent after the release`, async () => {
    const { x, sr } = await render([widget(type)], note());
    const tail = type === 'granular' ? 2.5 : 2.4;
    return [
      check('finite', finite(x) ? 1 : 0, finite(x)),
      check('peak before note-on < 1e-6', peak(span(x, sr, 0, 0.095)), peak(span(x, sr, 0, 0.095)) < 1e-6),
      check('peak while held > 1e-3', peak(span(x, sr, 0.2, 0.95)), peak(span(x, sr, 0.2, 0.95)) > 1e-3),
      check(`peak after ${tail} s < 1e-5`, peak(span(x, sr, tail, 3)), peak(span(x, sr, tail, 3)) < 1e-5),
      check('peak ≤ ceiling', peak(x), peak(x) <= CEILING + 1e-6),
    ];
  });
  for (const end of ['min', 'max']) {
    add(`${type}-${end}`, `${type}: every param at its ${end}, 8 notes`, async () => {
      const { x } = await render([widget(type, extremes(type, end))], (e, insts) => {
        for (let k = 0; k < 8; k++) insts[0].noteOn(36 + k * 9, 127, 0.05 * k, 'file');
      });
      return [check('finite', finite(x) ? 1 : 0, finite(x)), check('peak ≤ ceiling', peak(x), peak(x) <= CEILING + 1e-6)];
    });
  }
  add(`${type}-pitch`, `${type}: A4 (MIDI 69) measures 440 Hz at 44.1 and 48 kHz`, async () => {
    const out = [];
    for (const sampleRate of [44100, 48000]) {
      const { x, sr } = await render([widget(type, GENTLE[type])], note(69, 100, 0, null), { seconds: 1, sampleRate });
      const hz = f0(span(x, sr, 0.3, 0.6), sr);
      out.push(check(`${sampleRate / 1000} kHz: f0 (Hz), ±0.5 %`, hz, within(hz, 440, 0.005)));
    }
    return out;
  });
  // Renders are normally bit-identical. Once (2026-10-08, Chromium) two subtractive renders
  // differed by 2.9e-8 (−151 dBFS) and repeats were identical again, so the bound is
  // −120 dBFS: far below audibility, far above that browser-level float noise.
  add(`${type}-determinism`, `${type}: two identical offline renders match (≤ 1e-6)`, async () => {
    const a = (await render([widget(type)], note())).x;
    const b = (await render([widget(type)], note())).x;
    return [check('max difference', maxDiff(a, b), maxDiff(a, b) <= 1e-6)];
  });
}

add('volume', 'Widget volume: −12 dB is half the level of −6 dB', async () => {
  const at = async (db) => rms(span((await render([widget('subtractive', GENTLE.subtractive, { volumeDb: db })], note(60, 100, 0, null), { seconds: 1 })).x, SR, 0.3, 0.9));
  const ratio = (await at(-12)) / (await at(-6));
  return [check('RMS ratio (expect 0.501 ±1 %)', ratio, within(ratio, Math.pow(10, -6 / 20), 0.01))];
});

add('velocity', 'Velocity: 64 against 127 follows the square law', async () => {
  const at = async (vel) => rms(span((await render([widget('subtractive', GENTLE.subtractive)], note(60, vel, 0, null), { seconds: 1 })).x, SR, 0.3, 0.9));
  const ratio = (await at(64)) / (await at(127));
  return [check('RMS ratio (expect (64/127)² = 0.254 ±1 %)', ratio, within(ratio, (64 / 127) ** 2, 0.01))];
});

add('sustain', 'ADSR: sustain 0.25 holds a quarter of the peak level', async () => {
  const at = async (sustain) => rms(span((await render([widget('subtractive', { ...GENTLE.subtractive, decay: 0.05, sustain })], note(60, 100, 0, null), { seconds: 1 })).x, SR, 0.5, 0.9));
  const ratio = (await at(0.25)) / (await at(1));
  return [check('sustain RMS ratio (expect 0.25 ±3 %)', ratio, within(ratio, 0.25, 0.03))];
});

add('release', 'Envelope release: 0.05 s is silent 0.3 s after note-off, 2 s still sounds', async () => {
  const at = async (release) => peak(span((await render([widget('subtractive', { ...GENTLE.subtractive, release })], note(60, 100, 0.1, 0.5), { seconds: 1.5 })).x, SR, 0.8, 1.0));
  const fast = await at(0.05), slow = await at(2);
  return [check('fast release, peak 0.3 s after off < 1e-5', fast, fast < 1e-5), check('slow release, peak 0.3 s after off > 1e-3', slow, slow > 1e-3)];
});

add('all-notes-off', 'allNotesOff: silent within 30 ms', async () => {
  const { x, sr } = await render([widget('fm'), widget('additive')], (e, insts) => {
    for (const inst of insts) inst.noteOn(60, 100, 0.1, 'file');
    e.releaseAll(0.5);
  }, { seconds: 1 });
  return [check('peak from 0.53 s', peak(span(x, sr, 0.53, 1)), peak(span(x, sr, 0.53, 1)) < 1e-5)];
});

add('filter-env', 'Subtractive filter env: bright at the attack, dark after the decay; off keeps it steady', async () => {
  // Sustain 0.2, not 0: the filter env shares the amp envelope's shape, and sustain 0 would
  // also silence the note, making the late window meaningless.
  const p = { waveform: 'sawtooth', cutoff: 200, attack: 0.002, decay: 0.15, sustain: 0.2 };
  const env = (await render([widget('subtractive', { ...p, envAmount: 5 })], note(48, 100, 0, null), { seconds: 1 })).x;
  const flat = (await render([widget('subtractive', { ...p, envAmount: 0 })], note(48, 100, 0, null), { seconds: 1 })).x;
  const early = brightness(span(env, SR, 0.005, 0.03)), late = brightness(span(env, SR, 0.7, 0.9));
  const fEarly = brightness(span(flat, SR, 0.05, 0.1)), fLate = brightness(span(flat, SR, 0.7, 0.9));
  return [
    check('env: early / late brightness (expect > 2)', early / late, early / late > 2),
    check('no env: early / late brightness (expect 0.9–1.1)', fEarly / fLate, fEarly / fLate > 0.9 && fEarly / fLate < 1.1),
  ];
});

add('fm-fine', 'FM fine 0.37 changes the spectrum; ratio 2 + fine 0.5 equals ratio 2.5', async () => {
  const at = async (ratio, fine) => (await render([widget('fm', { ratio, fine })], note(60, 100, 0, null), { seconds: 1 })).x;
  const base = await at(2, 0), fine = await at(2, 0.37), sum = await at(2, 0.5), plain = await at(2.5, 0);
  return [
    check('difference with fine 0.37 > 1e-3', maxDiff(base, fine), maxDiff(base, fine) > 1e-3),
    check('ratio 2 + 0.5 vs ratio 2.5 (max difference)', maxDiff(sum, plain), maxDiff(sum, plain) < 1e-6),
  ];
});

add('vibrato', 'Additive vibrato: 100 cents moves the pitch; depth 0 leaves it fixed', async () => {
  const p = { ...GENTLE.additive, vibratoRate: 2, vibratoDepth: 100 };
  const { x, sr } = await render([widget('additive', p)], note(69, 100, 0, null), { seconds: 1.2 });
  const a = f0(span(x, sr, 0.1, 0.2), sr), b = f0(span(x, sr, 0.35, 0.45), sr);   // near +1 and −1 of a 2 Hz sine
  const flat = await render([widget('additive', { ...p, vibratoDepth: 0 })], note(69, 100, 0, null), { seconds: 1.2 });
  const c = f0(span(flat.x, sr, 0.1, 0.2), sr), d = f0(span(flat.x, sr, 0.35, 0.45), sr);
  return [
    check('pitch swing with 100 cents (expect > 5 %)', Math.abs(a - b) / 440, Math.abs(a - b) / 440 > 0.05),
    check('pitch swing with 0 cents (expect < 0.5 %)', Math.abs(c - d) / 440, Math.abs(c - d) / 440 < 0.005),
  ];
});

add('pluck-release', 'Pluck release: 0.02 s mutes far faster than 2 s', async () => {
  const at = async (release) => rms(span((await render([widget('pluck', { decay: 10, release })], note(57, 100, 0.1, 0.5), { seconds: 1.5 })).x, SR, 0.6, 0.9));
  const short = await at(0.02), long = await at(2);
  return [check('RMS after note-off, short / long (expect < 0.01)', short / long, short / long < 0.01)];
});

add('pluck-pick', 'Pluck pick position 0.5 changes the tone, not the level', async () => {
  const at = async (pickPosition) => (await render([widget('pluck', { pickPosition })], note(45, 100, 0, null), { seconds: 1 })).x;
  const a = await at(0), b = await at(0.5);
  const lv = peak(b) / peak(a);
  return [check('difference > 1e-3', maxDiff(a, b), maxDiff(a, b) > 1e-3), check('peak ratio (expect 0.5–2)', lv, lv > 0.5 && lv < 2)];
});

add('granular-position', 'Granular position picks the part of the sample that plays', async () => {
  const at = async (position) => {
    const w = widget('granular', { source: 'sample', position, spray: 0, grainSize: 0.06 }, { sample: { name: 'half.wav', buffer: halfSineSample(), seconds: 2 } });
    return rms(span((await render([w], note(60, 100, 0, null), { seconds: 1 })).x, SR, 0.2, 0.9));
  };
  const start = await at(0), end = await at(1);
  return [check('RMS at position 0 (silent half) < 1e-5', start, start < 1e-5), check('RMS at position 1 (sine half) > 1e-3', end, end > 1e-3)];
});

add('granular-missing-sample', 'Granular File source without a sample is silent', async () => {
  const { x } = await render([widget('granular', { source: 'sample' })], note());
  return [check('peak', peak(x), peak(x) === 0)];
});

add('granular-spread', 'Granular pitch spread changes the output; spread 0 keeps the earlier sequence', async () => {
  const a = (await render([widget('granular', { pitchSpread: 0 })], note())).x;
  const b = (await render([widget('granular', { pitchSpread: 1200 })], note())).x;
  return [check('difference with 1200 cents > 1e-3', maxDiff(a, b), maxDiff(a, b) > 1e-3)];
});

add('voice-cap', 'Voice caps: 24 notes on one widget keep ≤ 16 voices; 5 × 16 notes keep ≤ 64', async () => {
  let perWidget = 0, global = 0;
  const { x } = await render(SYNTH_TYPES.map((t) => widget(t)), (e, insts) => {
    for (let k = 0; k < 24; k++) insts[0].noteOn(40 + k, 100, 0.1, 'file');
    perWidget = insts[0].activeVoices().length;
    for (const inst of insts.slice(1)) for (let k = 0; k < 16; k++) inst?.noteOn(40 + k, 100, 0.2, 'file');
    global = e.pool.voices.filter((v) => !v.stolen && v.end > 0.2).length;
  }, { seconds: 1.5 });
  return [
    check('voices on the first widget', perWidget, perWidget <= 16),
    check('voices in the pool', global, global <= 64),
    check('finite and ≤ ceiling', peak(x), finite(x) && peak(x) <= CEILING + 1e-6),
  ];
});

add('mute-solo', 'Mute and solo: a muted widget and a non-solo widget add nothing', async () => {
  const solo = (await render([widget('fm', {}, { solo: true }), widget('additive')], note(), {})).x;
  const alone = (await render([widget('fm'), widget('additive', {}, { muted: true })], note(), {})).x;
  const only = (await render([widget('fm')], note(), {})).x;
  return [check('solo vs only (max difference)', maxDiff(solo, only), maxDiff(solo, only) < 1e-7), check('muted vs only (max difference)', maxDiff(alone, only), maxDiff(alone, only) < 1e-7)];
});

for (const type of SYNTH_TYPES) add(`${type}-song-render`, `${type}: Render to WAV of a 2 s MIDI file has the right length and sound`, async () => {
  const song = parseMidi(tinySong());
  const widgets = [widget(type)];
  const deps = {
    loadWorklets,
    buildEngine: (ctx, seed) => buildEngine(ctx, seed, widgets, { masterGain: MASTER }),
    createOfflineScheduler: (ctx, engine) => createOfflineScheduler(ctx, song, engine),
  };
  const blob = await renderSongToWav(song.durationSeconds, deps, { sampleRate: SR, format: 'float32', dither: false, seed: 1 }, () => {}, null);
  const decoded = await new OfflineAudioContext(1, 1, SR).decodeAudioData(await blob.arrayBuffer());
  const x = decoded.getChannelData(0);
  const expected = Math.ceil((song.durationSeconds + 3) * SR);
  return [
    check('length (frames) = song + 3 s tail (±1 %)', decoded.length, within(decoded.length, expected, 0.01)),
    check('peak while notes play > 1e-3', peak(span(x, SR, 0.05, song.durationSeconds)), peak(span(x, SR, 0.05, song.durationSeconds)) > 1e-3),
    check('finite and ≤ ceiling', peak(x), finite(x) && peak(x) <= CEILING + 1e-6),
  ];
});

/** Format 0, 480 PPQ, 120 bpm: C4 E4 G4 C5 quarter notes on channel 0 (2 s). */
function tinySong() {
  const vlq = (n) => { const b = [n & 0x7f]; while ((n >>= 7)) b.unshift((n & 0x7f) | 0x80); return b; };
  const ev = [];
  for (const p of [60, 64, 67, 72]) ev.push(...vlq(0), 0x90, p, 100, ...vlq(480), 0x80, p, 0);
  ev.push(0, 0xff, 0x2f, 0);
  const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  const bytes = [0x4d, 0x54, 0x68, 0x64, ...u32(6), 0, 0, 0, 1, 0x01, 0xe0, 0x4d, 0x54, 0x72, 0x6b, ...u32(ev.length), ...ev];
  return new Uint8Array(bytes).buffer;
}

export async function runCoreSuite(onResult, filter = null) {
  const results = [];
  for (const c of CASES) {
    if (filter && !filter.test(c.id)) continue;
    let row;
    try {
      row = { id: c.id, name: c.name, checks: await c.run() };
    } catch (err) {
      row = { id: c.id, name: c.name, error: String(err && err.stack ? err.stack : err) };
    }
    results.push(row);
    onResult?.(row);
  }
  return results;
}
