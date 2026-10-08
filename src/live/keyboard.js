// Computer-keyboard input (live-input.md). Keys are mapped by KeyboardEvent.code (physical
// position). Listeners are attached to window only while enabled; nothing runs at import time.

export const KEYMAP = Object.freeze({
  KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyF: 5, KeyT: 6,
  KeyG: 7, KeyY: 8, KeyH: 9, KeyU: 10, KeyJ: 11, KeyK: 12,
  KeyZ: 'down', KeyX: 'up',
});

export const KEYBOARD_VELOCITY = 100;
export const OCTAVE_DEFAULT = 60;   // C4
export const OCTAVE_MIN = 24;       // C1
export const OCTAVE_MAX = 96;       // C7

const NON_TEXT_INPUT_TYPES = new Set(['range', 'checkbox', 'radio', 'button', 'submit', 'reset', 'color', 'file', 'image', 'hidden']);

/** true when key presses should go to `el` (or an open dialog) instead of playing notes. */
export function isTextEntry(el) {
  if (typeof document !== 'undefined' && document.querySelector('dialog[open]')) return true;
  if (!el || !el.tagName) return false;
  const tag = el.tagName.toUpperCase();
  if (tag === 'INPUT') return !NON_TEXT_INPUT_TYPES.has(String(el.type || 'text').toLowerCase());
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return !!el.isContentEditable;
}

/** Touch-only devices hide the Play with Keyboard toggle. */
export function isTouchOnly() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}

export function octaveName(base) {
  return `C${Math.floor(base / 12) - 1}`;
}

export class KeyboardInput {
  constructor({ live, onOctave } = {}) {
    this.live = live;
    this.onOctave = typeof onOctave === 'function' ? onOctave : null;
    this.octave = OCTAVE_DEFAULT;
    this.pressed = new Map();   // code -> pitch that was started (released even after an octave shift)
    this.on = false;
    this.handleKeyDown = (e) => this.onKeyDown(e);
    this.handleKeyUp = (e) => this.onKeyUp(e);
    this.handleBlur = () => this.releasePressed();
  }

  get enabled() { return this.on; }
  get octaveLabel() { return octaveName(this.octave); }

  enable() {
    if (this.on || typeof window === 'undefined') return;
    this.on = true;
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
  }

  disable() {
    if (!this.on) return;
    this.on = false;
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeyDown);
      window.removeEventListener('keyup', this.handleKeyUp);
      window.removeEventListener('blur', this.handleBlur);
    }
    this.releasePressed();
    if (this.live) this.live.liveAllOff();
  }

  canShift(dir) {
    if (dir === 'down') return this.octave - 12 >= OCTAVE_MIN;
    if (dir === 'up') return this.octave + 12 <= OCTAVE_MAX;
    return false;
  }

  shiftOctave(dir) {
    if (!this.canShift(dir)) return false;
    this.octave += dir === 'up' ? 12 : -12;
    if (this.onOctave) this.onOctave(this.octaveLabel);
    return true;
  }

  releasePressed() {
    const pitches = [...this.pressed.values()];
    this.pressed.clear();
    if (this.live) for (const p of pitches) this.live.liveOff(p);
  }

  onKeyDown(e) {
    // macOS sends no keyup for keys released while Cmd is held: release everything now.
    if (this.on && e.key === 'Meta') { this.releasePressed(); return; }
    if (!this.on || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (typeof document !== 'undefined' && isTextEntry(document.activeElement)) return;
    const n = KEYMAP[e.code];
    if (n === undefined) return;
    e.preventDefault();
    if (n === 'down' || n === 'up') { this.shiftOctave(n); return; }
    if (this.pressed.has(e.code)) return;   // missed keyup; avoid a second voice with one release
    const pitch = this.octave + n;
    this.pressed.set(e.code, pitch);
    if (this.live) this.live.liveOn(pitch, KEYBOARD_VELOCITY);
  }

  onKeyUp(e) {
    const pitch = this.pressed.get(e.code);
    if (pitch === undefined) return;
    this.pressed.delete(e.code);
    if (this.live) this.live.liveOff(pitch);
  }
}
