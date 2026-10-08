// Live note layer (live-input.md): receives note events from Web MIDI and the computer keyboard
// and forwards them to every armed, audible widget with the 'live' source tag.
//
// getTargets() → [{ armed, audible, inst }]   (inst may be null and is skipped)
// getContext() → AudioContext | null          (nothing happens while null)
// onNoTarget() → called when a live note-on finds no armed widget

export const LIVE_FLOOD_PER_SEC = 200;   // (project limit; audio-safety.md)
const FLOOD_WINDOW_MS = 1000;

function defaultNow() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
}

export class LiveInput {
  constructor({ getContext, getTargets, onNoTarget, now } = {}) {
    this.getContext = typeof getContext === 'function' ? getContext : () => null;
    this.getTargets = typeof getTargets === 'function' ? getTargets : () => [];
    this.onNoTarget = typeof onNoTarget === 'function' ? onNoTarget : null;
    this.now = typeof now === 'function' ? now : defaultNow;   // ms clock (injectable for tests)
    this.held = new Map();     // pitch -> live voices started and not yet released
    this.sustain = false;
    this.sustained = [];       // releases deferred while the sustain pedal is down
    // Ring of the last LIVE_FLOOD_PER_SEC accepted note-on times; `ringIdx` is the oldest entry.
    this.ring = new Float64Array(LIVE_FLOOD_PER_SEC).fill(-Infinity);
    this.ringIdx = 0;
  }

  get heldCount() {
    let n = 0;
    for (const c of this.held.values()) n += c;
    return n;
  }

  /** true when the note-on is within the flood limit (and records it). */
  admit() {
    const t = this.now();
    if (t - this.ring[this.ringIdx] < FLOOD_WINDOW_MS) return false;
    this.ring[this.ringIdx] = t;
    this.ringIdx = (this.ringIdx + 1) % LIVE_FLOOD_PER_SEC;
    return true;
  }

  liveOn(pitch, vel) {
    const ctx = this.getContext();
    if (!ctx) return;
    if (!this.admit()) return;   // dropped: `held` is not incremented, so its note-off is ignored
    const t = ctx.currentTime;
    this.held.set(pitch, (this.held.get(pitch) ?? 0) + 1);
    let armed = 0;
    for (const w of this.getTargets()) {
      if (!w || !w.armed || !w.inst) continue;
      armed++;
      if (w.audible) w.inst.noteOn(pitch, vel, t, 'live');
    }
    if (armed === 0 && this.onNoTarget) this.onNoTarget();
  }

  liveOff(pitch) {
    if (!this.held.has(pitch)) return;
    if (this.sustain) {
      // Defer at most one release per held voice, so a repeated note-off under the pedal
      // cannot later release a newer voice of the same pitch that is still held.
      let pending = 0;
      for (const p of this.sustained) if (p === pitch) pending++;
      if (pending < this.held.get(pitch)) this.sustained.push(pitch);
      return;
    }
    this.release(pitch);
  }

  release(pitch) {
    const n = (this.held.get(pitch) ?? 0) - 1;
    if (n > 0) this.held.set(pitch, n); else this.held.delete(pitch);
    const ctx = this.getContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    for (const w of this.getTargets()) {
      if (w && w.armed && w.inst) w.inst.noteOff(pitch, t, 'live');   // releases one voice per call
    }
  }

  setSustain(down) {
    this.sustain = !!down;
    if (!this.sustain) {
      const list = this.sustained;
      this.sustained = [];
      for (const p of list) this.release(p);
    }
  }

  liveAllOff() {
    this.sustained.length = 0;
    this.sustain = false;
    for (const [p, n] of [...this.held]) for (let i = 0; i < n; i++) this.release(p);
  }

  /** Releases every held live voice on one widget's instrument (called when it is disarmed). */
  disarm(inst) {
    const ctx = this.getContext();
    if (!ctx || !inst) return;
    const t = ctx.currentTime;
    for (const [p, n] of this.held) for (let i = 0; i < n; i++) inst.noteOff(p, t, 'live');
  }
}
