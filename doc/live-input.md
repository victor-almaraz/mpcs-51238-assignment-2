# Live input

## Scope
Playing widgets live from a MIDI device (Web MIDI API) or the computer keyboard. File playback is in `midi-playback-scheduling.md`; the controls are in `controls-and-accessibility.md` and `layout-and-responsive.md`.

## Routing: arming
- Each widget has a **Live** toggle (`armed: boolean`). Live notes go to every armed, audible widget.
- Arming is independent of the widget's `part`. An armed widget plays its assigned file part and live notes at the same time.
- `isAudible` (mute/solo, `midi-playback-scheduling.md`) applies to live notes.
- A newly added widget is armed when no other widget is armed.
- Arming is session state. It is not saved in patches (`patch-format.md`).
- Disarming a widget calls `noteOff(pitch, ctx.currentTime, 'live')` on it once per held live voice in `held`.

## Live note layer
One module (`src/live/input.ts`) receives events from both sources and forwards them to armed widgets.
```ts
const held = new Map<number, number>();   // pitch -> number of live voices started and not yet released
let sustain = false;
const sustained: number[] = [];           // releases deferred while the sustain pedal is down

function liveOn(pitch: number, vel: number) {
  const t = ctx.currentTime;
  held.set(pitch, (held.get(pitch) ?? 0) + 1);
  for (const w of armedAudibleWidgets()) w.instrument.noteOn(pitch, vel, t, 'live');
}
function liveOff(pitch: number) {
  if (!held.has(pitch)) return;
  if (sustain) { sustained.push(pitch); return; }
  release(pitch);
}
function release(pitch: number) {
  const n = (held.get(pitch) ?? 0) - 1;
  if (n > 0) held.set(pitch, n); else held.delete(pitch);
  const t = ctx.currentTime;
  for (const w of armedWidgets()) w.instrument.noteOff(pitch, t, 'live');  // releases one voice per call
}
function setSustain(down: boolean) {
  sustain = down;
  if (!down) { for (const p of sustained) release(p); sustained.length = 0; }
}
function liveAllOff() {
  sustained.length = 0; sustain = false;
  for (const [p, n] of [...held]) for (let i = 0; i < n; i++) release(p);
}
```
- Each `liveOn` starts one voice per widget; each release ends one. Two sources holding the same pitch (MIDI and keyboard) produce two voices and two releases.
- `noteOff` on a widget with no matching live voice (muted or newly armed when the note started) does nothing.
- Live notes use `ctx.currentTime` with no lookahead.
- Flood limit: `liveOn` drops note-ons beyond 200 per second across all sources (project limit; `audio-safety.md`). A dropped note-on does not increment `held`, so its note-off is ignored.
- Live recording captures live notes; offline render excludes them (`recording.md`).
- The `'live'` source tag keeps live voices separate from file voices on the same pitch (`audio-engine-core.md`).
- Before the first live note, `ensureRunning()` must have run from a user gesture. Connect MIDI device and Play with keyboard are both gestures and call it.
- `liveAllOff()` runs on: device disconnect, keyboard toggle off, window `blur`, `visibilitychange` to hidden, and `releaseAll()` (`midi-playback-scheduling.md`).

## Web MIDI
### Availability
| Browser | Support |
|---|---|
| Chrome / Edge | Supported. All access (not only SysEx) shows a permission prompt; rolled out from Chrome 124, available to all users by Chrome 125. Denial rejects with `SecurityError`. |
| Firefox 108+ | Supported. First use requires installing a site-permission add-on that Firefox generates. Firefox prompts only when a MIDI device is connected; otherwise access is denied automatically. |
| Safari / iOS | Not supported. |

- Secure contexts only (HTTPS or `localhost`).
- Feature detection: `'requestMIDIAccess' in navigator`. When absent, the Connect MIDI device control is not rendered.

### Requesting access
```ts
async function connectMidi() {
  await ensureRunning();
  try {
    const access = await navigator.requestMIDIAccess({ sysex: false });
    access.inputs.forEach(attach);
    access.onstatechange = (e) => {
      const port = (e as MIDIConnectionEvent).port;
      if (port?.type !== 'input') return;
      if (port.state === 'connected') attach(port as MIDIInput);
      else { liveAllOff(); announce(`${port.name ?? 'Device'} disconnected`); }
      renderDeviceStatus(access);
    };
    renderDeviceStatus(access);
  } catch (err) {
    // SecurityError / NotAllowedError: user or policy denied access
    showError('MIDI access was blocked');
  }
}
function attach(input: MIDIInput) { input.onmidimessage = onMidiMessage; }   // setting onmidimessage opens the port
```
- Called only from the Connect MIDI device button, never on page load.
- All connected inputs and all 16 channels feed the live layer.
- `attach` is idempotent: assigning `onmidimessage` again replaces the handler.

### Message handling
```ts
function onMidiMessage(e: MIDIMessageEvent) {
  const d = e.data; if (!d || d.length === 0) return;
  const status = d[0];
  if (status >= 0xf0) return;                 // system messages: clock F8, active sensing FE, SysEx, etc.
  const type = status & 0xf0;
  if (type === 0x90 && d[2] > 0) return liveOn(d[1], d[2]);
  if (type === 0x80 || (type === 0x90 && d[2] === 0)) return liveOff(d[1]);
  if (type === 0xb0) {
    if (d[1] === 64) return setSustain(d[2] >= 64);       // sustain pedal
    if (d[1] === 120 || d[1] === 123) return liveAllOff(); // all sound off / all notes off
  }
  // pitch bend, aftertouch, program change and other CCs are ignored
}
```
- Web MIDI delivers each message as a complete array. Running status does not occur in `MIDIMessageEvent.data`.
- Many controllers send clock (`F8`) and active sensing (`FE`) continuously; the `>= 0xf0` check discards them.

### Device status
- "No MIDI devices" when access is granted and `access.inputs.size === 0`.
- "Connected: <name>" for one input; "<n> devices" for several, with names in `title`.

## Computer keyboard
### Activation
- **Play with keyboard** toggle (`aria-pressed`), off by default.
- Hidden on touch-only devices: `matchMedia('(hover: none) and (pointer: coarse)')`.
- Turning it on calls `ensureRunning()`. Turning it off calls `liveAllOff()`.

### Key map
Mapped by `KeyboardEvent.code`, which is the physical key position and independent of keyboard layout.

| Code | Note (octave base C) |
|---|---|
| KeyA | C |
| KeyW | C♯ |
| KeyS | D |
| KeyE | D♯ |
| KeyD | E |
| KeyF | F |
| KeyT | F♯ |
| KeyG | G |
| KeyY | G♯ |
| KeyH | A |
| KeyU | A♯ |
| KeyJ | B |
| KeyK | C (next octave) |
| KeyZ | octave down |
| KeyX | octave up |

- Base octave: C4 (MIDI 60). Range: C1 (24) to C7 (96) for the base note.
- Velocity: 100.

### Event handling
```ts
function onKeyDown(e: KeyboardEvent) {
  if (!keyboardOn || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  if (isTextEntry(document.activeElement)) return;   // input (non-range), textarea, select, contenteditable, open dialog
  const n = KEYMAP[e.code];
  if (n === undefined) return;
  e.preventDefault();
  if (n === 'down' || n === 'up') return shiftOctave(n);
  const pitch = base + n;
  pressed.set(e.code, pitch);                         // releases the pitch that was pressed, even after an octave shift
  liveOn(pitch, 100);
}
function onKeyUp(e: KeyboardEvent) {
  const pitch = pressed.get(e.code);
  if (pitch === undefined) return;
  pressed.delete(e.code);
  liveOff(pitch);
}
```
- Listeners attach to `window` while the toggle is on and detach when it is off.
- `Tab`, arrow keys, `Space`, `Enter` and `Escape` are not mapped and keep their normal behaviour.
- Range inputs are not text entry: letter keys play notes while a slider has focus, and arrow keys still move the slider.
- `shiftOctave` updates the octave `<output>` ("C4") and announces the new octave through the status region.

## Sources
- MDN, Web MIDI API (https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API)
- W3C, Web MIDI API (https://webaudio.github.io/web-midi-api/)
- Chrome for Developers, "Access to MIDI devices now requires user permission" (https://developer.chrome.com/blog/web-midi-permission-prompt)
- Mozilla Bugzilla 836897, WebMIDI meta bug (https://bugzilla.mozilla.org/show_bug.cgi?id=836897)
- MDN, KeyboardEvent.code (https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code)
- MIDI 1.0 Detailed Specification, control change 64, 120, 123 (https://midi.org/specifications)
