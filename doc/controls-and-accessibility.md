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
<ValueField label="Cutoff value" display={formatHz(hz)} onCommit={edit} className="w-20 px-1 text-right" />
```
- Typed values (parameters, harmonic levels and widget volume; not the master volume):
  - The readout is a text field (`ValueField`, `inputmode="decimal"`, accessible name "{label} value"). It looks like the readout with a dashed underline, and gains a full border on hover or focus.
  - Enter or leaving the field applies the text. After Enter, the field keeps focus with the new value selected.
  - Units may be typed ("2.5 kHz", "2k", "250 ms", "1.5 s", "40 %", "×3", "−6 dB", "Off"). A bare number takes the unit the field shows, so "20" in a field showing "10 ms" means 20 ms. The minus sign (−) and decimal commas are accepted (`parseParam`, `parseVolume`).
  - Values outside the range are clamped and snapped to the step, the same as the slider (`coerceParam`, `coerceVolume`). Unreadable text is ignored, and the field shows the current value again.
  - Escape abandons the edit. It is not consumed, so it still triggers Panic (`audio-safety.md`).
  - Harmonic bars have a row of fields under the bars, in percent (0–100), one per bar.
  - The master volume keeps a plain readout, so the master level changes only by deliberate slider movement.
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
| Remove | `<button aria-label="Remove Subtractive 1">` ✕ | no confirmation; the "Removed …" toast offers Undo while it is visible (`layout-and-responsive.md` "Status toasts"), held in memory |
| Part | native `<select>` with a visible "Part" label | first option "All parts"; then `Song.parts` labels in order; disabled at "All parts" when no MIDI file is loaded |
| Play with Keyboard | `<button aria-pressed>` | off by default; while on, mapped letter keys play notes (`live-input.md`) |
| Octave | two buttons ("Octave Down", "Octave Up") + `<output>` showing e.g. "C4" | buttons disabled at the range limits |
| Connect MIDI Device | `<button>` | requests Web MIDI access; replaced by device status text once connected |
| Widget volume | native range, −60 to 0 dB in 0.5 dB steps, plus Off at the minimum | `aria-valuetext="−6.0 dB"` / "Off" (`audio-safety.md`) |
| Master volume | native range, same taper, default −12 dB, max 0 dB | `aria-valuetext="−12.0 dB"`; muted state after Panic shown as text "Muted" |
| Meter | `<meter>`-styled bar with peak and RMS, −60 to 0 dBFS; numeric peak as text | `role="img"` with `aria-label` updated at most once per second |
| Limit badge | text "Limit" plus icon | shown while the pre-limiter peak exceeds the ceiling |
| Panic / Reset | `<button>` with text "Panic" (`aria-keyshortcuts="Escape"`) while sound plays and "Reset" while muted; no `aria-pressed`, since the label carries the state | Panic: click, Enter, Space or Escape mutes. Reset: only a pointer click (`detail === 1`) restores sound, ignored for 1 s after a Panic, or moving the master volume; a `title` and a described-by hint say so (`audio-safety.md`) |
| Start notice | native `<dialog>` + `showModal()` | shown before the first audio start per session; button "Start Audio" |
| Level reduced banner | inline alert + "Restore Level" button | sustained-level duck (`audio-safety.md`) |
| Record, Format, Render to WAV, render progress, Cancel | see `recording.md` | — |
| File menu (Load MIDI, Save Patch, Load Patch, Format) | APG menu button; file items open a visually hidden `<input type="file">` | the inputs are out of the tab order and `aria-hidden`; focus returns to the File button after a choice (`layout-and-responsive.md` "File menu") |

## Interaction states (every interactive element)
| State | Treatment (Tailwind) |
|---|---|
| Default | border `neutral-300`, text `neutral-900` |
| Hover | `hover:bg-neutral-100` (Tailwind v4's `hover:` applies only when hover is supported) |
| Focus-visible | `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900`; never remove outlines without a replacement |
| Pressed (active) | `active:bg-neutral-200` |
| Selected (aria-pressed / checked) | `aria-pressed:bg-neutral-900 aria-pressed:text-white`; radios `peer-checked:` |
| Disabled | `disabled:opacity-40 disabled:cursor-not-allowed`; keep the label readable; explain why in nearby text |

- Accent: `bg-indigo-600 text-white hover:bg-indigo-700` (design-system accent), on **Add Synth only**.

## Sizes and contrast
- Target size:
  - WCAG 2.2 SC 2.5.8 (AA) requires targets of at least 24 × 24 CSS px, or 24 px spacing circles around smaller ones.
  - SC 2.5.5 (AAA) asks for 44 × 44.
- Tailwind sizes:
  - `min-h-11 min-w-11` (44 px) for Add Synth, Play/Stop and the file buttons.
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
- `Tab` order follows the DOM: header, transport band (recording controls, master section, song controls, File menu, live-input controls), Add Synth, then each widget (header, params, footer).
- `Space`/`Enter` activate buttons. When focus is not in a text field, `Space` on the transport toggles play.
- No global single-key shortcuts. Letter keys play notes only while Play with Keyboard is on, and never when focus is in a text input, select or dialog.
- `Escape` closes an open menu or dialog; otherwise it triggers Panic.

## Design-system mapping
| Rack element | Design-system component |
|---|---|
| Widget | Card (params area: CardSection) |
| Widget title, page title | Heading |
| Live / Mute / Solo / Lock | Chip (toggle, selected = pressed) |
| Widget collapse (title) | DisclosureButton inside the Heading |
| Play with Keyboard, Record | ToggleButton |
| Waveform / Source | SegmentedControl |
| Param slider + typed value, widget volume, Octave, Cents | Slider with ValueField |
| Master volume | Slider with a plain readout |
| Harmonic bars + typed values | SliderGroup with ValueFields; its label is a FieldLabel |
| Part select (MIDI parts) | Select |
| Add Synth | MenuButton (primary) |
| File menu (Load MIDI File…, Save Patch, Load Patch…, WAV format) | MenuButton (secondary, end-aligned, radio items) |
| Load File… (granular) | FileButton |
| Panic | Button (danger) |
| Play/Stop, Render to WAV, Cancel, Reset, Octave −/+, Connect MIDI Device, banner and toast actions, dialog buttons | Button |
| Position, octave | TextOutput |
| Meter, Limit / Clip badges | Meter; Badge |
| Render progress | ProgressBar |
| Start notice | Dialog |
| Remove, dismiss ✕ | IconButton (ghost) |
| Audio banners, errors | Alert |
| Status messages | Toast (with Disclosure for details) |
| Empty rack | EmptyState |

## Component inventory and states
Every component a design-system library (`src/design-systems/<style>/`) provides and the app renders; all libraries implement the same set, with every state the app can reach. The design-system pages (`AGENTS.md`, step 3) show each component in each state listed here, for every design system.

Shared interaction states apply to every interactive component unless the row says otherwise: **default, hover, active (pressed down), focus-visible** (2 px ring, offset 2 px; see "Interaction states"). **Disabled** is listed only where the app can reach it.

| Component | Used for | States the app reaches |
|---|---|---|
| **Button** | Play/Stop, Render to WAV, Cancel, Octave −/+, Connect MIDI Device, Panic / Reset, Resume Audio, Restart Audio, Restore Level, Start Audio / Cancel (dialog), Undo / Download Again (toasts) | Variant: secondary (default), primary (inside the Add Synth MenuButton), danger (Panic), ghost (inside IconButton). Size: lg (44 px; transport), md (32 px; toasts, live input, banners, dialog). Disabled with a `title` reason: Play/Stop (no song yet), Render to WAV (no song, recording, muted after Panic, render in progress), Octave −/+ (at the range limits). Panic / Reset: label "Panic" (danger variant) while sound plays, "Reset" (secondary) while muted, with a `title` and described-by hint (size lg). Content: text, or glyph + text (▶ Play / ■ Stop). |
| **ToggleButton** | Record, Play with Keyboard | Unpressed and pressed (`aria-pressed`, black fill). Record: disabled with a reason (no recorder, audio not started, a file being saved or rendered). |
| **Chip** | Live, M (mute), S (solo), Lock | Unpressed and pressed, independently per chip. Lock carries a `title` ("Lock to prevent changes" / "Locked: unlock to edit"). |
| **IconButton** | Remove widget (✕), dismiss in Alert and Toast (✕) | Ghost: no border until hover or active. Remove: disabled while the widget is locked, with the `title` "Unlock to remove". |
| **DisclosureButton** | Widget title (collapse and expand) | Expanded (▾) and collapsed (▸), `aria-expanded`; label truncates with an ellipsis. |
| **MenuButton** | Add Synth, File | Variant: primary (Add Synth), secondary (File). Placement: flow (Add Synth: full-width list on mobile, anchored dropdown from `md`), end (File: right-aligned dropdown at every size). Button: closed and open (`aria-expanded`, ▾). Items: plain; with a description ("Pluck — Plucked string"); disabled with "Unavailable: {reason}" (Pluck without the worklet, Save Patch with an empty rack, WAV format while capturing, "Reading MIDI File…"); radio checked (●) and unchecked (○); focused item (keyboard); separator. |
| **FileButton** | Load File… (granular, File source only) | Size md. Disabled while the widget is locked. No busy state is reached. |
| **Slider** | Every number param, widget volume, master volume | Value anywhere in range, at min and at max; readout text per unit ("2.0 kHz", "10 ms", "−6.0 dB", "Off" at the bottom of a volume slider). Readout: ValueField (params, widget volume) or plain `<output>` (master). Disabled (params, volume and tuning of a locked widget; pluck params while the worklet loads). Signed tuning readouts ("+1 oct", "−25 cents"). Master in reduced safety mode: range capped at −6.5 dB (gain 0.5, rounded down to the 0.5 dB grid). |
| **ValueField** | Readouts of params, widget volume and tuning; one per harmonic bar | Showing the value (dashed underline); hover (full border); focused / editing (draft text selected, full border); disabled. Unreadable text reverts on commit (no error state is shown). |
| **SliderGroup** | Harmonic bars (additive) | Each bar's fill 0–100 %; focused bar (keyboard); dragging (pointer captured); all bars at 0 (with the note "All harmonics at 0"); with the ValueField row; disabled while the widget is locked. |
| **SegmentedControl** | Waveform (subtractive), Source (granular) | One option checked; unchecked options hover / active; focus-visible on the checked radio; disabled while the widget is locked. |
| **Select** | Part (per widget) | Enabled with "All parts" plus one option per MIDI part; disabled at "All parts" with no MIDI file; disabled while the widget is locked; selected part's label in `title` (long labels truncate). |
| **TextOutput** | Position "0:42 / 3:10", keyboard octave "C4" | Static text; written per frame (position) or on change (octave). |
| **Meter** | Master output level | Silent (−∞ dBFS); RMS fill, peak tick and 1 s peak-hold tick anywhere from −60 to 0 dBFS; numeric peak text. `aria-label` updated at most once per second. |
| **Badge** | Limit (master), Clip (recording) | Tone strong (black fill) only; shown or hidden. |
| **ProgressBar** | Render progress | Determinate 0–100 %; indeterminate (no `suspend()` support). |
| **Alert** | Audio paused, safety stage stopped, level reduced, load and device errors | Tone warning (paused, level reduced) and error (stage stopped, load errors). Live (`role="alert"` / `"status"`) or not live (when a live region already announced it). With an action button; with a dismiss ✕; several stacked. |
| **Toast** | Status messages (bottom of the window) | Polite (normal weight) and assertive (bold: Panic, faults); with an action (Undo, Download Again); with a Details disclosure; timer paused on hover or focus; dismissed (✕ or after 6 s). |
| **Disclosure** | Details of warnings in a toast | Closed; open (list of warnings). |
| **Dialog** | Start notice | Closed; open (modal, initial focus on Start Audio, Esc cancels); with the extra silent-switch note on older iOS. |
| **EmptyState** | Empty rack | Shown with the Add Synth MenuButton inside. |
| **Card** | Synth widget | Expanded and collapsed (header only); unlocked and locked. Its heading takes focus (focus ring) after the widget is added. |
| **CardSection** | Params area of a widget | Normal; dimmed to 60 % while the widget is muted. |
| **Heading** | Page title (level 1, hero size), widget titles (level 2, holding a DisclosureButton), dialog title (level 2) | Level 1 and level 2; focus-visible when focused programmatically. |
| **FieldLabel** | Labels the app places itself (Harmonics, above the bars) | Static text in the style's field-label typography. |

Defined but not reached by the app (the design-system pages may show them, marked as such):
- Alert tones info and success; Badge tone neutral; Button size sm.
- FileButton busy.
- VisuallyHidden (the app uses the `sr-only` class directly).

## UI states catalogue
| State | Trigger | UI |
|---|---|---|
| Empty: no synths | widgets.length === 0 | empty panel with Add Synth |
| Empty: no MIDI | no song | Song group hidden (no Play or Render to WAV); part selects disabled at "All parts" |
| Empty: nothing armed | live note received, no widget armed | status "No synth is armed for live input" (once per session) |
| Loading: parsing MIDI | file chosen | File menu item reads "Reading MIDI File…" (disabled); the Song group shows "Reading MIDI file…"; `aria-busy="true"` on the transport |
| Loading: worklet | first Pluck added | Pluck card shows "Loading pluck engine…"; params disabled |
| Error: malformed MIDI | `ParseError` | inline alert under the transport: "Couldn't read <name>: <reason>"; previous song kept |
| Error: unusable sample | `SampleError` (too large, undecodable, silent) | alert "Couldn't load <name>: <reason>"; the widget keeps its previous sample |
| Granular File source, no sample | source "File" without a loaded file (also after loading a patch) | row "No file loaded: silent" under Source; patch load warns "file '<name>' is not stored in patches" |
| Error: malformed patch | `PatchError` | alert: "Couldn't load patch: <reason>"; rack unchanged |
| Error: audio blocked / interrupted | context not running after a gesture, or a statechange | banner "Audio is paused by the browser" + "Resume Audio" button |
| Error: worklet unsupported | addModule rejects / no `audioWorklet` | Pluck option disabled in the menu with the reason |
| Error: MIDI access denied | `requestMIDIAccess` rejects (user, policy, Firefox without a gesture or a device) | alert "MIDI access was blocked ({error name})"; Connect button stays available (`live-input.md` "Requesting access") |
| Error: device disconnected | input `state` becomes `disconnected` | status "<device> disconnected"; its held notes released |
| Success: MIDI loaded | parse ok | "Loaded <name> — 6 parts, 3:10"; warnings count if any |
| Error: audio fault | safety stage `fault` | assertive: "Audio fault — output muted and reset" |
| Error: reduced safety mode | AudioWorklet unavailable | master section text "Reduced safety mode"; master max −6.5 dB (gain 0.5 on the 0.5 dB grid) |
| Warning: level reduced | sustained-level duck | banner "Level reduced — sustained loud output" + "Restore Level" |
| Muted after Panic | Panic (button or Escape) | the button reads "Reset"; master shows "Muted"; sound returns only on a pointer click on Reset or a move of the master volume |
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
