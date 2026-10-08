// Lookahead scheduler ("A Tale of Two Clocks"; midi-playback-scheduling.md). The JS timer only
// wakes the scheduler; ctx.currentTime decides when notes play. Times are always computed as
// songStartCtxTime + (n.start − songOffset), never accumulated.

import { dispatch } from './routing.js';

export const INTERVAL_MS = 25;
export const LOOKAHEAD_VISIBLE = 0.1;
export const LOOKAHEAD_HIDDEN = 1.5;     // exceeds Chrome's 1 s timer alignment in hidden tabs
export const START_OFFSET = 0.05;
export const LATE_TOLERANCE = 0.005;     // notes later than this are skipped, never burst

/** First index whose note starts at or after `t` (notes sorted by start). */
export function lowerBound(notes, t) {
  let lo = 0, hi = notes.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (notes[mid].start < t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function songEnd(song) {
  if (!song) return 0;
  if (typeof song.durationSeconds === 'number' && Number.isFinite(song.durationSeconds)) return Math.max(0, song.durationSeconds);
  let end = 0;
  for (const n of song.notes || []) end = Math.max(end, n.start + n.duration);
  return end;
}

export class Transport {
  constructor({ getContext, getTargets, releaseAll, onEnd } = {}) {
    this.getContext = getContext;
    this.getTargets = getTargets;
    this.releaseAll = releaseAll;
    this.onEnd = onEnd;
    this.song = null;
    this.notes = [];
    this.end = 0;
    this.timer = null;
    this.position = 0;
    this.songStartCtxTime = 0;
    this.songOffset = 0;
    this.nextIndex = 0;
    this._lookahead = LOOKAHEAD_VISIBLE;
  }

  setSong(song) {
    this.stop();
    this.song = song || null;
    this.notes = song && Array.isArray(song.notes) ? song.notes : [];
    this.end = songEnd(this.song);
  }

  get playing() {
    return this.timer !== null;
  }

  get duration() {
    return this.end;
  }

  get lookahead() {
    return this._lookahead;
  }

  setHidden(hidden) {
    this._lookahead = hidden ? LOOKAHEAD_HIDDEN : LOOKAHEAD_VISIBLE;
    // Fill the longer window now: the next timer tick may already be throttled to ~1 s.
    if (hidden && this.playing) this.tick();
  }

  /** Assumes the context is running (the caller awaited ensureRunning() in the gesture). */
  play() {
    if (this.playing || !this.song) return;
    const ctx = this.getContext && this.getContext();
    if (!ctx) return;
    if (this.position >= this.end) this.position = 0;
    this.songStartCtxTime = ctx.currentTime + START_OFFSET;
    this.songOffset = this.position;
    this.nextIndex = lowerBound(this.notes, this.position);
    this.timer = setInterval(() => this.tick(), INTERVAL_MS);
    this.tick();
  }

  pause() {
    if (!this.playing) return;
    this.position = this.currentSongTime();
    this.clearTimer();
    if (this.releaseAll) this.releaseAll();
  }

  stop() {
    const wasPlaying = this.playing;
    this.clearTimer();
    this.position = 0;
    if (wasPlaying && this.releaseAll) this.releaseAll();
  }

  seek(seconds) {
    const s = Math.min(Math.max(0, Number.isFinite(seconds) ? seconds : 0), this.end);
    if (this.playing) {
      this.clearTimer();
      if (this.releaseAll) this.releaseAll();
      this.position = s;
      // Seeking to the end finishes playback; play() would wrap to the start.
      if (s >= this.end) { if (this.onEnd) this.onEnd(); return; }
      this.play();
    } else {
      this.position = s;
    }
  }

  /** Song position for the UI (read in requestAnimationFrame; never drives audio). */
  currentSongTime() {
    let t = this.position;
    if (this.playing) {
      const ctx = this.getContext && this.getContext();
      // Not below songOffset, so the 50 ms start offset doesn't move the playhead backwards.
      if (ctx) t = Math.max(this.songOffset, this.songOffset + (ctx.currentTime - this.songStartCtxTime));
    }
    return Math.min(Math.max(0, t), this.end);
  }

  clearTimer() {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  tick() {
    const ctx = this.getContext && this.getContext();
    if (!ctx || !this.song) { this.clearTimer(); return; }
    const now = ctx.currentTime;
    const horizon = now + this._lookahead;
    const notes = this.notes;
    let targets = null;
    while (this.nextIndex < notes.length) {
      const n = notes[this.nextIndex];
      const t = this.songStartCtxTime + (n.start - this.songOffset);
      if (t > horizon) break;
      // Late notes (timer stall, hidden tab) are skipped rather than played in a burst.
      if (t >= now - LATE_TOLERANCE) {
        if (targets === null) targets = this.getTargets ? this.getTargets() : [];
        dispatch(targets, n, Math.max(t, now));
      }
      this.nextIndex++;
    }
    if (this.nextIndex >= notes.length && now > this.songStartCtxTime + (this.end - this.songOffset)) {
      // Natural end: every note already has its noteOff, so release tails ring out
      // (no releaseAll here, which would cut them).
      this.clearTimer();
      this.position = 0;
      if (this.onEnd) this.onEnd();
    }
  }
}

/**
 * Offline mode (recording.md): no timer, no lookahead. Song time 0 = context time 0.
 * scheduleRange(from, to) dispatches every note with from ≤ start < to, then lets
 * instruments that schedule ahead (granular) emit up to `to`. Live arming is ignored.
 */
export function createOfflineScheduler(ctx, song, engine) {
  const notes = song && Array.isArray(song.notes) ? song.notes : [];
  let index = 0;
  return {
    scheduleRange(from, to) {
      while (index < notes.length && notes[index].start < from) index++;
      let targets = null;
      while (index < notes.length && notes[index].start < to) {
        const n = notes[index++];
        if (targets === null) targets = engine.targets();
        dispatch(targets, n, n.start);
      }
      engine.pump(to);
    },
  };
}
