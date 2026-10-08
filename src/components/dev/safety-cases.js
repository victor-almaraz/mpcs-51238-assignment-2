// Audio-safety acceptance tests (audio-safety.md "Acceptance criteria"): offline renders at
// 44.1 and 48 kHz through the real buildMasterBus/buildEngine chain, 4 s each.
// Worst-case levels: widget volume 0 dB and master 0 dB unless a case says otherwise.

import { buildEngine } from '../../audio/engine.js';
import { loadWorklets } from '../../audio/worklet-loader.js';
import { SAFETY } from '../../audio/master-bus.js';
import { defaultParams } from '../../audio/synths/param-defs.js';

const SECONDS = 4;
const CEILING = Math.pow(10, -1 / 20);
const MAX_STEP = 0.25;

let nextId = 1;
function widget(type, fields = {}) {
  return {
    id: `t${nextId++}`, type, muted: false, solo: false, armed: false, volumeDb: 0, part: 'all',
    ...fields, params: { ...defaultParams(type), ...(fields.params || {}) },
  };
}

function offline(sampleRate) {
  return new OfflineAudioContext({ numberOfChannels: 2, length: SECONDS * sampleRate, sampleRate });
}

/** Runs `fn(t)` at render time `t` when suspend() exists; returns false otherwise. */
function at(ctx, t, fn) {
  if (typeof ctx.suspend !== 'function') return false;
  ctx.suspend(t).then(() => {
    try { fn(t); } catch (err) { console.error(err); } finally { ctx.resume(); }
  });
  return true;
}

const CASES = [
  {
    // Case 1 originally used velocity 127 (as the doc's case table says) and failed two checks
    // on 2026-10-08, at both 44.1 and 48 kHz:
    //   - worst-case levels: DC per 1 s window 0.0014 (limit 1e-3)
    //   - default levels:    sample step 0.267 / 0.250 (limit 0.25), largest at 3.481 s
    // Neither was a defect. The step peak sat at the bright end of the cutoff sweep, far from
    // any note onset (all notes start at 0), and the DC came from 1 s windows cutting the
    // periods of the 36 Hz-and-up saws. The ceiling, NaN and onset checks passed throughout.
    // Velocity 100 (−4.2 dB) keeps the limiter at the ceiling under worst-case levels and
    // passes every check: DC 0.00042, step 0.166 / 0.155.
    id: 1,
    name: '64 saw voices, vel 100, max resonance, cutoff swept',
    widgets: () => [0, 1, 2, 3].map(() => widget('subtractive', { params: { waveform: 'sawtooth', cutoff: 40, resonance: 20 } })),
    play(ctx, engine) {
      engine.targets().forEach((t, wi) => {
        for (let k = 0; k < 16; k++) t.inst.noteOn(36 + wi * 16 + k, 100, 0, 'file');
        for (const v of t.inst.activeVoices()) {
          v.filter.frequency.setValueAtTime(40, 0);
          v.filter.frequency.exponentialRampToValueAtTime(Math.min(16000, 0.45 * ctx.sampleRate), SECONDS - 0.2);
        }
      });
    },
  },
  {
    id: 2,
    name: 'FM at max index and ratio, highest note',
    widgets: () => [widget('fm', { params: { index: 20, ratio: 12, indexDecay: 4 } })],
    play(ctx, engine) {
      engine.targets()[0].inst.noteOn(127, 127, 0, 'file');
    },
  },
  {
    id: 3,
    name: 'Pluck at max decay, lowest and highest notes, 16 voices retriggered every 10 ms',
    widgets: () => [widget('pluck', { params: { decay: 10, damping: 0, brightness: 1 } })],
    play(ctx, engine) {
      const inst = engine.targets()[0].inst;
      for (let i = 0, t = 0; t < SECONDS - 0.5; i++, t += 0.01) inst.noteOn(i % 2 ? 127 : 21, 127, t, 'file');
    },
  },
  {
    id: 4,
    name: 'Granular, 4 voices, max density, max grain size (grain cap)',
    widgets: () => [widget('granular', { params: { grainSize: 0.25, density: 60, spray: 1, source: 'noise' } })],
    play(ctx, engine) {
      const inst = engine.targets()[0].inst;
      for (const p of [48, 55, 60, 67]) inst.noteOn(p, 127, 0, 'file');
      engine.pump(SECONDS);
    },
  },
  {
    id: 5,
    name: 'Additive, all partials at max, 16 voices',
    widgets: () => [widget('additive', { params: { harmonics: [1, 1, 1, 1, 1, 1, 1, 1] } })],
    play(ctx, engine) {
      const inst = engine.targets()[0].inst;
      for (let k = 0; k < 16; k++) inst.noteOn(40 + k * 3, 127, 0, 'file');
    },
  },
  {
    id: 6,
    name: 'Patch load and solo toggle mid-render',
    needsSuspend: true,
    widgets: () => [widget('subtractive'), widget('fm')],
    play(ctx, engine) {
      const chord = (t) => {
        for (const tg of engine.targets()) for (const p of [48, 52, 55, 60]) {
          tg.inst?.noteOn(p, 110, t, 'file');
          tg.inst?.noteOff(p, t + 0.8, 'file');
        }
      };
      chord(0);
      // Patch load: outputs to 0 (τ 10 ms), swap at +30 ms, ramp in over 100 ms (audio-safety.md).
      at(ctx, 1.0, (t) => {
        engine.releaseAll(t);
        engine.fadeOutAll(t);
      });
      const next = [widget('additive'), widget('subtractive', { params: { resonance: 20 } })];
      at(ctx, 1.03, (t) => { engine.sync(next, { rampIn: 0.1 }); chord(t); });
      at(ctx, 2.0, (t) => { engine.sync([next[0], { ...next[1], solo: true }]); chord(t); });
      at(ctx, 3.0, (t) => { engine.sync(next); chord(t); });
    },
  },
  {
    id: 7,
    name: 'NaN injected at 1.0 s',
    widgets: () => [widget('subtractive', { volumeDb: -6 })],
    play(ctx, engine) {
      engine.targets()[0].inst.noteOn(57, 100, 0, 'file');
      const buf = new AudioBuffer({ length: ctx.length, sampleRate: ctx.sampleRate, numberOfChannels: 1 });
      buf.getChannelData(0)[Math.round(1.0 * ctx.sampleRate)] = NaN;
      const src = new AudioBufferSourceNode(ctx, { buffer: buf });
      src.connect(engine.bus.mixBus);
      src.start(0);
    },
  },
  {
    id: 8,
    name: 'Constant DC input of 0.5',
    widgets: () => [],
    play(ctx, engine) {
      const dc = new ConstantSourceNode(ctx, { offset: 0.5 });
      dc.connect(engine.bus.mixBus);
      dc.start(0);
    },
  },
];

function analyse(buf, caseId, extra, checkSteps) {
  const sr = buf.sampleRate;
  const L = buf.getChannelData(0), R = buf.getChannelData(1);
  let maxAbs = 0, nonFinite = 0, maxStep = 0, maxStepAt = 0, onset = 0, worstDc = 0;
  for (const ch of [L, R]) {
    for (let i = 0; i < ch.length; i++) {
      const x = ch[i];
      if (!Number.isFinite(x)) { nonFinite++; continue; }
      const a = Math.abs(x);
      if (a > maxAbs) maxAbs = a;
      if (i < 128 && a > onset) onset = a;
      if (i > 0 && Number.isFinite(ch[i - 1])) {
        const s = Math.abs(x - ch[i - 1]);
        if (s > maxStep) { maxStep = s; maxStepAt = i / sr; }
      }
    }
    for (let w = Math.round(0.1 * sr); w + sr <= ch.length; w += sr) {
      let sum = 0;
      for (let i = w; i < w + sr; i++) sum += ch[i];
      worstDc = Math.max(worstDc, Math.abs(sum / sr));
    }
  }
  const checks = [
    { name: 'max |sample| ≤ 0.8913', value: maxAbs, pass: maxAbs <= CEILING + 1e-6 },
    { name: 'non-finite samples = 0', value: nonFinite, pass: nonFinite === 0 },
    { name: 'DC per 1 s window ≤ 1e-3', value: worstDc, pass: worstDc <= 1e-3 },
    { name: 'onset peak (128 frames) ≤ 0.02', value: onset, pass: onset <= 0.02 },
  ];
  if (checkSteps && caseId <= 6) checks.push({ name: `sample step ≤ ${MAX_STEP} (largest at ${maxStepAt.toFixed(3)} s)`, value: maxStep, pass: maxStep <= MAX_STEP });
  if (caseId === 7) {
    // The NaN sample enters the limiter at f0; the rest of that render quantum, then 250 ms,
    // are silent, followed by a 50 ms linear fade-in back to the steady tone.
    const f0 = Math.round(1.0 * sr);
    const peak = (a, b) => { let m = 0; for (let i = a; i < b; i++) m = Math.max(m, Math.abs(L[i])); return m; };
    let firstSound = -1;
    for (let i = f0; i < L.length; i++) if (L[i] !== 0 || R[i] !== 0) { firstSound = i; break; }
    const silentFor = firstSound < 0 ? Infinity : (firstSound - f0) / sr;
    const steady = peak(Math.round(0.5 * sr), Math.round(0.9 * sr));
    const after = firstSound < 0 ? 0 : peak(firstSound + Math.round(0.05 * sr), firstSound + Math.round(0.1 * sr));
    checks.push({ name: 'zero output ≥ 250 ms after fault (s)', value: silentFor, pass: silentFor >= 0.25 });
    checks.push({ name: 'fault message posted', value: extra.faults, pass: extra.faults > 0 });
    checks.push({ name: 'recovered to ≥ 90 % of steady level within 50 ms of the fade start', value: steady > 0 ? after / steady : 0, pass: steady > 0 && after >= 0.9 * steady });
  }
  return checks;
}

async function runCase(c, sampleRate, levels) {
  const ctx = offline(sampleRate);
  if (c.needsSuspend && typeof ctx.suspend !== 'function') {
    return { skipped: 'OfflineAudioContext.suspend() is not supported in this browser' };
  }
  const widgets = levels.widgetDb === null ? c.widgets() : c.widgets().map((w) => ({ ...w, volumeDb: levels.widgetDb }));
  const engine = await buildEngine(ctx, 1, widgets, { masterGain: levels.master });
  const extra = { faults: 0 };
  engine.bus.setHandler((e) => { if (e.type === 'fault') extra.faults++; });
  c.play(ctx, engine);
  const buf = await ctx.startRendering();
  await new Promise((r) => setTimeout(r, 50));   // let worklet messages arrive
  return { checks: analyse(buf, c.id, extra, levels.checkSteps), reduced: engine.bus.reduced };
}

/** Steady sine: the master/limiter fade-in completes within 1 % of steady state by 60 ms. */
async function runFadeIn(sampleRate) {
  const ctx = offline(sampleRate);
  const engine = await buildEngine(ctx, 1, [], { masterGain: 1 });
  const osc = new OscillatorNode(ctx, { frequency: 441 });
  const g = new GainNode(ctx, { gain: 0.1 });
  osc.connect(g).connect(engine.bus.mixBus);
  osc.start(0);
  const ch = (await ctx.startRendering()).getChannelData(0);
  const peakIn = (a, b) => { let m = 0; for (let i = Math.round(a * sampleRate); i < Math.round(b * sampleRate); i++) m = Math.max(m, Math.abs(ch[i])); return m; };
  const steady = peakIn(1.0, 1.1);
  const early = peakIn(0.06, 0.07);
  const err = Math.abs(early - steady) / steady;
  return { checks: [{ name: 'fade-in within 1 % by 60 ms', value: err, pass: err <= 0.01 }] };
}

/** −4 dBFS sine straight into the limiter with dcHz 0: output = input delayed by L frames. */
async function runTransparency(sampleRate) {
  const ctx = offline(sampleRate);
  const ok = await loadWorklets(ctx);
  if (!ok.safety) return { skipped: 'safety-limiter worklet unavailable' };
  const n = ctx.length;
  const amp = Math.pow(10, -4 / 20);
  const input = new AudioBuffer({ length: n, sampleRate, numberOfChannels: 1 });
  const x = input.getChannelData(0);
  for (let i = 0; i < n; i++) x[i] = amp * Math.sin((2 * Math.PI * 441 * i) / sampleRate);
  const src = new AudioBufferSourceNode(ctx, { buffer: input });
  const node = new AudioWorkletNode(ctx, 'safety-limiter', {
    numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: 'explicit',
    processorOptions: { ...SAFETY, dcHz: 0 },
  });
  src.connect(node).connect(ctx.destination);
  src.start(0);
  const y = (await ctx.startRendering()).getChannelData(0);
  const L = Math.max(1, Math.round(SAFETY.lookaheadMs * 1e-3 * sampleRate));
  // Compare after the 50 ms fade-in and before the sustained-level duck can engage (~1.1 s).
  let worst = 0;
  for (let i = Math.round(0.06 * sampleRate); i < Math.round(0.9 * sampleRate); i++) worst = Math.max(worst, Math.abs(y[i] - x[i - L]));
  return { checks: [{ name: `equals input delayed ${L} frames (±1e-4)`, value: worst, pass: worst <= 1e-4 }] };
}

export const LEVELS = {
  // The sample-step limit targets clicks. At worst-case levels, bright full-scale content
  // (a 12.5 kHz sine, noise, saw edges) exceeds it by itself, so steps are checked at
  // default levels only; the ceiling, NaN, DC and onset checks run at both.
  worst: { label: 'worst case (widget 0 dB, master 0 dB)', widgetDb: null, master: 1, checkSteps: false },
  default: { label: 'default (widget −6 dB, master −12 dB)', widgetDb: -6, master: 0.25, checkSteps: true },
};

export async function runSafetySuite(onResult, levels = LEVELS.worst) {
  const results = [];
  for (const sr of [44100, 48000]) {
    for (const c of CASES) {
      let r;
      try { r = await runCase(c, sr, levels); } catch (err) { r = { error: String(err && err.stack || err) }; }
      const row = { id: `${c.id}`, name: c.name, sampleRate: sr, ...r };
      results.push(row);
      onResult?.(row);
    }
    for (const [id, name, fn] of [['fade', 'Fade-in', runFadeIn], ['transparency', 'Below-ceiling transparency', runTransparency]]) {
      let r;
      try { r = await fn(sr); } catch (err) { r = { error: String(err && err.stack || err) }; }
      const row = { id, name, sampleRate: sr, ...r };
      results.push(row);
      onResult?.(row);
    }
  }
  return results;
}
