# Controls and accessibility

## Scope
How each control is built, its states and keyboard support, how it maps to design-system components, and the catalogue of UI states. Layout is in `layout-and-responsive.md`.

## Parameter sliders
- **Use native `<input type="range">`.**
  - Native ranges have built-in keyboard, focus and touch assistive-technology support.
  - The APG warns that custom `role="slider"` widgets may not be operable with some touch-based assistive technologies.
- Log and curved params: the input works in normalised steps (`min=0 max=1000 step=1`), and code converts to real values (`synthesis-conventions.md`).
- Value display and announcement:
```tsx
<label htmlFor={id} className="w-24 text-sm">Cutoff</label>
<input id={id} type="range" min={0} max={1000} step={1} value={u}
       aria-valuetext={formatHz(hz)}           // "2.0 kHz" instead of "500"
       onChange={...} className="flex-1 accent-neutral-900" />
<output htmlFor={id} className="w-20 text-right text-sm tabular-nums">{formatHz(hz)}</output>
```
- Unit formatting:
  - Frequency: Hz below 1000 ("440 Hz"), kHz above ("2.0 kHz").
  - Time: values under 1 s as ms ("120 ms").
  - dB with one decimal.
  - Ratios as "×2.0".
  - Volume as percent.
- Keyboard (APG slider pattern):
  - Arrows: one step. Home/End: min/max. PageUp/PageDown: a larger step (optional in the APG).
  - Native ranges handle arrows and Home/End. PageUp/PageDown behaviour varies by browser.
  - To guarantee a 10% jump, handle `PageUp`/`PageDown` in `onKeyDown`: call `preventDefault()` and add or subtract 100 normalised steps.
- Reset to default:
  - Double-click, or a reset button in a "…" menu.
  - Keyboard: `Delete`.
  - Optionally describe this in visually hidden text linked with `aria-describedby`.

## Harmonic bars (additive)
- Eight controls in a `role="group"` with `aria-label="Harmonic levels"`.
- Each bar is a vertical slider labelled "Harmonic 1" … "Harmonic 8", with `aria-valuetext` such as "50 %".
- Implementation: **custom** `div role="slider" tabindex="0" aria-orientation="vertical" aria-valuemin=0 aria-valuemax=100 aria-valuenow`.
  - Keys, as in the APG vertical slider example: Up/Right +1, Down/Left −1, PageUp/PageDown ±10, Home/End.
  - Pointer: `pointerdown` + `setPointerCapture`; value = `1 − (y − top)/height`.
  - Dragging across bars sets each bar under the pointer.
- Sizing:
  - Bars ≥ 32 px wide: 8 × 32 + 7 × 8 gap = 312 px, which fits the 326 px of content width at 390 px.
  - Bars 120 px tall.
- Requires testing with VoiceOver on iOS (see the APG touch warning above).
- Fallback if the custom control fails on touch assistive technology: eight stacked native horizontal ranges.

## Other controls
| Control | Element | Notes |
|---|---|---|
| Waveform / source | `<fieldset>` + `<input type="radio">` styled as segmented buttons | arrow keys move the selection natively |
| Live (arm) | `<button aria-pressed>` chip, text "Live" with `aria-label="Live input to Subtractive 1"` | routing in `live-input.md` |
| Mute / Solo | `<button aria-pressed>` chips, text "M"/"S" with `aria-label="Mute Subtractive 1"` | the label includes the widget instance name |
| Remove | `<button aria-label="Remove Subtractive 1">` ✕ | no confirmation; "Undo" appears in the status region for 5 s, held in memory |
| Part | native `<select>` with a visible "Part" label | first option "All parts"; then `Song.parts` labels in order; disabled at "All parts" when no MIDI file is loaded |
| Play with keyboard | `<button aria-pressed>` | off by default; while on, mapped letter keys play notes (`live-input.md`) |
| Octave | two buttons ("Octave down", "Octave up") + `<output>` showing e.g. "C4" | buttons disabled at the range limits |
| Connect MIDI device | `<button>` | requests Web MIDI access; replaced by device status text once connected |
| Widget volume | native range, −60 to 0 dB in 0.5 dB steps, plus Off at the minimum | `aria-valuetext="−6.0 dB"` / "Off" (`audio-safety.md`) |
| Master volume | native range, same taper, default −12 dB, max 0 dB | `aria-valuetext="−12.0 dB"`; muted state after Panic shown as text "Muted" |
| Meter | `<meter>`-styled bar with peak and RMS, −60 to 0 dBFS; numeric peak as text | `role="img"` with `aria-label` updated at most once per second |
| Limit badge | text "Limit" plus icon | shown while the pre-limiter peak exceeds the ceiling |
| Panic | `<button aria-keyshortcuts="Escape">` with text "Panic" | behaviour in `audio-safety.md` |
| Start notice | native `<dialog>` + `showModal()` | shown before the first audio start per session; button "Start audio" |
| Level reduced banner | inline alert + "Restore level" button | sustained-level duck (`audio-safety.md`) |
| Record, Format, Render to WAV, render progress, Cancel | see `recording.md` | — |
| Load MIDI / Load patch | visually hidden `<input type="file">` + a styled `<label>` acting as a button | the real input stays in the tab order (`sr-only`); the label shows the `focus-visible` ring via `peer` |
| Confirm replace rack | native `<dialog>` + `showModal()` | focus moves into the dialog; `Esc` cancels; initial focus on "Cancel" |

## Interaction states (every interactive element)
| State | Treatment (Tailwind) |
|---|---|
| Default | border `neutral-300`, text `neutral-900` |
| Hover | `hover:bg-neutral-100` (Tailwind v4's `hover:` applies only when hover is supported) |
| Focus-visible | `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900`; never remove outlines without a replacement |
| Pressed (active) | `active:bg-neutral-200` |
| Selected (aria-pressed / checked) | `aria-pressed:bg-neutral-900 aria-pressed:text-white`; radios `peer-checked:` |
| Disabled | `disabled:opacity-40 disabled:cursor-not-allowed`; keep the label readable; explain why in nearby text |

- Accent: `bg-indigo-600 text-white hover:bg-indigo-700` (design-system accent), on **Add synth only**.

## Sizes and contrast
- Target size:
  - WCAG 2.2 SC 2.5.8 (AA) requires targets of at least 24 × 24 CSS px, or 24 px spacing circles around smaller ones.
  - SC 2.5.5 (AAA) asks for 44 × 44.
- Tailwind sizes:
  - `min-h-11 min-w-11` (44 px) for Add synth, Play/Stop and the file buttons.
  - At least `min-h-6 min-w-6` (24 px) for chips and ✕; 32 px where space allows.
  - Slider thumbs: give the input at least `h-6`.
- Contrast:
  - Text ≥ 4.5:1 (`neutral-600` or darker on white), per WCAG 1.4.3.
  - UI boundaries and focus rings ≥ 3:1, per WCAG 1.4.11.

## Motion
- Use motion only as feedback: the menu opening, a status message fading.
- Wrap it in `motion-safe:`, or switch it off with `motion-reduce:transition-none`.
- Any playhead or level meter must stay correct without animation.

## Keyboard map
- `Tab` order follows the DOM: header, transport (including master section and recording controls), Add synth, live-input controls, then each widget (header, params, footer).
- `Space`/`Enter` activate buttons. When focus is not in a text field, `Space` on the transport toggles play.
- No global single-key shortcuts. Letter keys play notes only while Play with keyboard is on, and never when focus is in a text input, select or dialog.
- `Escape` closes an open menu or dialog; otherwise it triggers Panic.

## Design-system mapping
| Rack element | Design-system component |
|---|---|
| Widget | Card |
| Widget title | Heading (card title) |
| Live / Mute / Solo | Toggle chip (selected = pressed) |
| Play with keyboard | Toggle button |
| Waveform / Source | Radio group / segmented control |
| Param slider + value | Slider with value label |
| Harmonic bars | Slider group (custom) |
| Part select (MIDI parts) | Select / list rows |
| Add synth | Primary button + menu |
| Save / Load / Load MIDI / Connect MIDI device / Render to WAV / Panic | Secondary buttons |
| Record | Toggle button |
| Master volume | Slider with value label |
| Meter, Limit badge | Meter; Badge |
| Render progress | Progress bar |
| Start notice | Modal dialog |
| Remove | Icon button (ghost) |
| Replace-rack confirm | Modal dialog |
| Status messages | Toast / inline alert |
| Empty rack / no MIDI | Empty state |

## UI states catalogue
| State | Trigger | UI |
|---|---|---|
| Empty: no synths | widgets.length === 0 | empty panel with Add synth |
| Empty: no MIDI | no song | "No MIDI file loaded"; Play disabled; part selects disabled at "All parts" |
| Empty: nothing armed | live note received, no widget armed | status "No synth is armed for live input" (once per session) |
| Loading: parsing MIDI | file chosen | file button shows "Reading…", `aria-busy="true"` on the transport |
| Loading: worklet | first Pluck added | Pluck card shows "Loading pluck engine…"; params disabled |
| Error: malformed MIDI | `ParseError` | inline alert under the transport: "Couldn't read <name>: <reason>"; previous song kept |
| Error: malformed patch | `PatchError` | alert: "Couldn't load patch: <reason>"; rack unchanged |
| Error: audio blocked / interrupted | context not running after a gesture, or a statechange | banner "Audio is paused by the browser" + "Resume audio" button |
| Error: worklet unsupported | addModule rejects / no `audioWorklet` | Pluck option disabled in the menu with the reason |
| Error: MIDI access denied | `requestMIDIAccess` rejects | alert "MIDI access was blocked"; Connect button stays available |
| Error: device disconnected | input `state` becomes `disconnected` | status "<device> disconnected"; its held notes released |
| Success: MIDI loaded | parse ok | "Loaded <name> — 6 parts, 3:10"; warnings count if any |
| Error: audio fault | safety stage `fault` | assertive: "Audio fault — output muted and reset" |
| Error: reduced safety mode | AudioWorklet unavailable | master section text "Reduced safety mode"; master max −6 dB |
| Warning: level reduced | sustained-level duck | banner "Level reduced — sustained loud output" + "Restore level" |
| Muted after Panic | Panic | master shows "Muted" until the master volume is raised |
| Recording and render states | — | listed in `recording.md` |
| Success: device connected | MIDI access granted / device appears | device status "Connected: <name>" (or "2 devices") |
| Success: patch saved / loaded | — | "Download started" / "Patch loaded" |

- Status and success messages go through one `role="status"` (polite) region.
- Errors use `role="alert"`. Their text stays until dismissed or replaced.

## Sources
- W3C WAI-ARIA APG, Slider pattern (https://www.w3.org/WAI/ARIA/apg/patterns/slider/)
- W3C WAI-ARIA APG, Vertical Temperature Slider example (https://www.w3.org/WAI/ARIA/apg/patterns/slider/examples/slider-temperature/)
- W3C WAI-ARIA APG, Communicating Value and Limits for Range Widgets (https://www.w3.org/WAI/ARIA/apg/practices/range-related-properties/)
- W3C, Understanding SC 2.5.8 Target Size (Minimum) (https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- W3C, WCAG 2.2 (https://www.w3.org/TR/WCAG22/)
- MDN, `<dialog>` (https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog)
