# Layout and responsive design

## Scope
Page structure, the rack grid, widget anatomy and responsive behaviour at 390 px and 1440 px, using Tailwind only. Control states are in `controls-and-accessibility.md`.

## Page regions (in DOM and visual order)
1. **Header bar:** site title "Synth Rack" (the only H1) and a link back to the hub.
2. **Transport bar**, in three groups:
   - **Playback:** Play/Stop toggle, position `0:42 / 3:10`, Record toggle and recording indicator (`recording.md`).
   - **Master:** master volume, meter, Limit badge, Panic (`audio-safety.md`).
   - **Files:** Load MIDI (file button) with the file name or "No MIDI file", Render to WAV, Format, Save patch, Load patch.
3. **Rack toolbar:** the **Add synth** button (primary, the only accent-coloured control) and the live-input group (Play with keyboard, octave, Connect MIDI device, device status; `live-input.md`).
4. **Rack:** the widget grid.
5. **Status regions:** one `aria-live="polite"` region (loaded, saved, recording states) and one `aria-live="assertive"` region (Panic, audio fault).

## Grid
```html
<section aria-label="Synth rack" class="mx-auto max-w-screen-xl px-4 md:px-8">
  <ul class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"> <!-- one <li> per widget -->
```
- At 390 px: 1 column. Widgets are 358 px wide with 16 px side padding.
- At 1440 px:
  - `max-w-screen-xl` (1280 px) minus 64 px of padding leaves 1216 px.
  - 3 columns with 16 px gaps gives widgets about 395 px wide.
  - The widget is designed at ~360 px; its internal layout is identical at every breakpoint.
- Widgets keep insertion order. Position does not encode routing; the part select and the Live chip do.
- New widgets go at the end. After adding, focus moves to the new widget's heading, and the widget scrolls into view with `scrollIntoView({ block: 'nearest' })` (instant under reduced motion).

## Widget anatomy (fixed vertical order)
```
┌ Header ───────────────────────────────────────┐
│ [Type name H2]     [Live] [M] [S]   [Remove ✕] │
├ Params ───────────────────────────────────────┤
│ Waveform  (○ Sine ● Saw ○ Sq ○ Tri)           │
│ Cutoff    ───────●──────────   2.0 kHz        │
│ Resonance ──●───────────────   1.0 dB         │
│ Attack / Release …                             │
├ Footer ───────────────────────────────────────┤
│ Part [All parts ▾]       Volume ────●── 80 %  │
└────────────────────────────────────────────────┘
```
- Alignment:
  - Labels sit on the left at a fixed width (`w-24`).
  - Sliders fill the middle (`flex-1`).
  - Values align right (`w-20 text-right tabular-nums`).
- Grouping:
  - Header: identity and actions.
  - Params: sound-shaping controls. Use `<fieldset>`/`<legend>` for radio groups.
  - Footer: routing and level, separate from the params.
- Card style:
  - `rounded-lg border border-neutral-300 bg-white p-4`.
  - No shadow stacks, gradients, knobs, screws or textures.
- Muted widgets:
  - Fade only the params area to `opacity-60`, and show the M chip as selected.
  - The header keeps full contrast.

## Rack toolbar
- Desktop (1440 px): one row. Add synth on the left; live-input group on the right.
- Mobile (390 px): Add synth full-width on the first row; live-input group on a second row. Play with keyboard is hidden when `matchMedia('(hover: none) and (pointer: coarse)')` matches.
- Connect MIDI device is absent when Web MIDI is unsupported (`live-input.md`).

## Type scale (max 3 sizes, 2 weights)
| Role | Tailwind |
|---|---|
| Page title | `text-xl font-semibold` |
| Widget title, section labels | `text-base font-semibold` |
| Everything else (labels, values, buttons) | `text-sm font-normal` |

## Palette (small, purposeful)
- Neutral greys for surfaces, borders and text: `neutral-900` text on `white`/`neutral-50`.
- **One accent**, from the chosen design system (e.g. `indigo-600`):
  - Used on Add synth only.
- One error colour (`red-700` text on `red-50`) and one success colour (`green-700`).
- Never use colour alone to show state; pair it with text or an icon.

## Transport placement
- Mobile (390 px):
  - Playback and Master groups form a **sticky bottom bar** in two rows: `fixed inset-x-0 bottom-0 border-t bg-white pb-[env(safe-area-inset-bottom)]`. Row 1: Play/Stop, position, Record, Panic. Row 2: master volume, meter, Limit badge.
  - The Files group is not sticky; it sits above the rack toolbar.
  - `<main>` has `pb-32` so the last widget is not hidden behind the bar.
  - The viewport metadata sets `viewport-fit=cover`; `env()` insets require it.
- Desktop (1440 px): all three groups sit in one `sticky top-0` bar under the header, in the order Playback, Master, Files.
- Panic is visible at every breakpoint.
- One component with responsive classes. Rendering two transports would duplicate controls in the accessibility tree.

## Add synth menu
- A button opens a menu listing the five types, each with a one-line description ("Pluck — plucked string").
- Implementation: native `<details>`/`<summary>`, or a button plus list following the APG menu-button pattern.
  - Mobile: a full-width list under the button.
  - Desktop: an anchored dropdown (`absolute`, `w-72`).
- Choosing a type adds the widget, closes the menu and moves focus (see Grid).

## Empty states
- No widgets: the rack shows one panel, "No synths yet. Add a synth to start.", with the Add synth button inside it in the same position.
- No MIDI file:
  - The transport shows "No MIDI file loaded".
  - Play is disabled, with the explanation "Load a MIDI file to play" (as `title` or description text).

## Breakpoint checks (390 and 1440)
- No horizontal scroll at 390 px. Long part labels truncate (`truncate`, with the full name in `title`).
- The part select is full-width in the footer on mobile.
- Hit targets: ≥ 44 px tall for primary and transport controls, ≥ 24 px for everything else (`controls-and-accessibility.md`).

## Sources
- Tailwind CSS docs, responsive design and breakpoints (https://tailwindcss.com/docs/responsive-design)
- MDN, `env()` and safe-area insets (https://developer.mozilla.org/en-US/docs/Web/CSS/env)
- W3C WAI-ARIA APG, Menu Button pattern (https://www.w3.org/WAI/ARIA/apg/patterns/)
