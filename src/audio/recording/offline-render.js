// Offline render of the loaded MIDI song to a WAV Blob (recording.md).
//
// deps = {
//   loadWorklets(ctx) → Promise<void>
//   buildEngine(ctx, seed) → Promise<{ output: AudioNode }>   (already connected to ctx.destination)
//   createOfflineScheduler(ctx, engine) → { scheduleRange(fromSec, toSec) }
// }
// The engine may have flush() → Promise (Engine.flush); it is awaited before rendering and
// before each resume so worklet note messages arrive in time.
// opts = { sampleRate?, format: 'pcm16' | 'float32', dither: boolean, seed: number }
// onProgress(fraction | null)   null = indeterminate (no OfflineAudioContext.suspend)

import { encodeBody, writeWavHeader } from './wav.js';
import { mulberry32 } from '../random.js';

export const RENDER_MAX_SONG_SECONDS = 600;  // (project limit)
export const RENDER_TAIL_SECONDS = 3;        // (project limit)
export const PROGRESS_STEP_SEC = 1;          // (project limit)
export const DEFAULT_RENDER_RATE = 48000;    // (project limit)

const ENCODE_STEP = 1 << 16;                 // frames per encoded Blob part
const ENCODE_YIELD_EVERY = 16;               // parts between yields to the event loop

function abortError() {
  return new DOMException('Render cancelled', 'AbortError');
}

export async function renderSongToWav(songDurationSec, deps, opts, onProgress, signal) {
  if (!(songDurationSec >= 0) || !Number.isFinite(songDurationSec)) throw new RangeError('invalid-duration');
  if (songDurationSec > RENDER_MAX_SONG_SECONDS) throw new RangeError('song-too-long');
  if (signal && signal.aborted) throw abortError();
  const progress = typeof onProgress === 'function' ? onProgress : () => {};

  // Rejects as soon as the signal aborts; every await below races against it.
  let onAbort = null;
  const aborted = new Promise((_, reject) => {
    onAbort = () => reject(abortError());
    if (signal) signal.addEventListener('abort', onAbort, { once: true });
  });
  aborted.catch(() => {});   // handled through the races; avoid unhandled-rejection noise
  // Rejects when a suspension handler throws (otherwise the render would stay suspended forever).
  let fail = null;
  const failed = new Promise((_, reject) => { fail = reject; });
  failed.catch(() => {});
  const race = (p) => {
    Promise.resolve(p).catch(() => {});   // a late rejection after abort is not unhandled
    return Promise.race([p, aborted, failed]);
  };
  const isAborted = () => !!(signal && signal.aborted);

  try {
    const sampleRate = opts.sampleRate ?? DEFAULT_RENDER_RATE;
    const totalSec = songDurationSec + RENDER_TAIL_SECONDS;
    const length = Math.ceil(totalSec * sampleRate);
    const ctx = new OfflineAudioContext({ numberOfChannels: 2, length, sampleRate });

    await race(deps.loadWorklets(ctx));
    const engine = await race(deps.buildEngine(ctx, opts.seed));
    // buildEngine connects the safety chain to ctx.destination; engine.output is not connected again.
    const scheduler = deps.createOfflineScheduler(ctx, engine);
    // Engine.flush: scheduled notes have reached the audio thread (absent in test fakes).
    const flush = () => Promise.resolve(typeof engine.flush === 'function' ? engine.flush() : undefined);

    if (typeof ctx.suspend === 'function') {
      const quantum = ctx.renderQuantumSize > 0 ? ctx.renderQuantumSize : 128;
      let lastFrame = 0;                 // quantized frame of the previous suspend (0 = render start)
      let scheduledTo = 2 * PROGRESS_STEP_SEC;
      scheduler.scheduleRange(0, scheduledTo);

      const scheduleRest = () => {
        if (scheduledTo !== Infinity) scheduler.scheduleRange(scheduledTo, Infinity);
        scheduledTo = Infinity;
      };
      // Suspends at t unless its render-quantum frame repeats a previous one, is not ahead of
      // the current position, or reaches the last quantum (each rejects with InvalidStateError).
      const trySuspend = (t) => {
        const frame = Math.floor((t * sampleRate) / quantum) * quantum;
        if (frame <= lastFrame || frame >= length - quantum) return false;
        lastFrame = frame;
        ctx.suspend(t).then(
          () => onSuspended(t),
          () => {
            if (isAborted()) return;
            try { scheduleRest(); progress(null); } catch (err) { fail(err); }
          },
        );
        return true;
      };
      const onSuspended = (t) => {
        if (isAborted()) return;          // never resume; the context is released for GC
        try {
          progress(Math.min(1, t / totalSec));
          const next = t + PROGRESS_STEP_SEC;
          if (scheduledTo !== Infinity) {
            scheduler.scheduleRange(scheduledTo, next + PROGRESS_STEP_SEC);
            scheduledTo = next + PROGRESS_STEP_SEC;
          }
          if (!trySuspend(next)) scheduleRest();
        } catch (err) {
          fail(err);                       // leave the context suspended; it is released for GC
          return;
        }
        // Resume only once the new notes have reached worklet processors (pluck), or they
        // would start late or not at all.
        flush().then(() => { if (!isAborted()) return ctx.resume(); }).catch(() => {});   // a cancel during the flush stays suspended
      };

      if (!trySuspend(PROGRESS_STEP_SEC)) scheduleRest();
    } else {
      scheduler.scheduleRange(0, Infinity);
      progress(null);
    }

    await race(flush());
    const buffer = await race(ctx.startRendering());
    if (isAborted()) throw abortError();
    progress(1);

    const L = buffer.getChannelData(0);
    const R = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : L;
    const parts = [writeWavHeader(opts.format, sampleRate, buffer.length)];
    const body = { format: opts.format, dither: opts.dither, rand: mulberry32(opts.seed) };
    let n = 0;
    for (let i = 0; i < buffer.length; i += ENCODE_STEP) {
      if (isAborted()) throw abortError();
      parts.push(encodeBody(L, R, i, Math.min(ENCODE_STEP, buffer.length - i), body));
      if (++n % ENCODE_YIELD_EVERY === 0) {
        await race(new Promise((resolve) => setTimeout(resolve, 0)));   // keeps Cancel responsive
      }
    }
    if (isAborted()) throw abortError();
    return new Blob(parts, { type: 'audio/wav' });
  } finally {
    if (signal && onAbort) signal.removeEventListener('abort', onAbort);
  }
}
