# Layout and responsive design

## Scope
Page structure, the rack grid, widget anatomy and responsive behaviour at 390 px and 1440 px, using Tailwind only. Control states are in `controls-and-accessibility.md`.

## Page regions (in DOM and visual order)
1. **Header (hero):** page title "Synthesizer Rack" (the only H1) and a link back to the hub.
2. **Transport bar**, in two groups followed by the File menu:
   - **Master** (always shown): Record toggle and recording indicator (`recording.md`), master volume, meter, Limit badge, Panic (`audio-safety.md`).
   - **Song** (shown only once a MIDI file is loaded or being read): file name, Play/Stop toggle, position `0:42 / 3:10`, Render to WAV and render progress.
   - **File menu** (always shown, last item; see "File menu").
3. **Live input:** Play with keyboard, octave, Connect MIDI device, device status (`live-input.md`).
4. **Rack:** the **Add synth** button (primary, the only accent-coloured control), then the widget grid.
5. **Status regions:** one `aria-live="polite"` region (loaded, saved, recording states) and one `aria-live="assertive"` region (Panic, audio fault).

## Alignment
- Meta controls (header, transport, banners, live input, status regions) share one left edge at every width. Each full-width row has side padding `px-4 md:px-8`, and its content is `mx-auto w-full max-w-7xl` inside that padding. The shared classes live in `src/components/synth/layout.js`.
- The rack (Add synth and the widgets) is indented further on the left only (`pl-2 md:pl-6`), so widgets align with each other at a deeper indent than the meta controls. The right edge stays with the meta rows.
- The live-input group is left-aligned.

## Grid
```html
<main class="px-4 md:px-8 …">
  <section aria-label="Synth rack" class="mx-auto w-full max-w-7xl pl-2 md:pl-6">
    <!-- Add synth -->
    <ul class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"> <!-- one <li> per widget -->
```
- At 390 px: 1 column. Widgets are 350 px wide (16 px page padding, plus 8 px rack indent on the left).
- At 1440 px:
  - `max-w-7xl` (1280 px) minus the 24 px rack indent leaves 1256 px.
  - 3 columns with 16 px gaps gives widgets about 408 px wide.
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

## Live input and Add synth
- Live input: one left-aligned row that wraps on mobile. Play with keyboard is hidden when `matchMedia('(hover: none) and (pointer: coarse)')` matches. Connect MIDI device is absent when Web MIDI is unsupported (`live-input.md`). The row is not rendered when neither control applies.
- Add synth: the first item in the rack, at the rack indent. Full-width on mobile, natural width from `md`.

## Type scale (max 3 sizes, 2 weights)
| Role | Tailwind |
|---|---|
| Page title (hero) | `text-4xl md:text-6xl font-semibold tracking-tight` |
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
  - The Master group forms a **sticky bottom bar** in two rows: `fixed inset-x-0 bottom-0 border-t bg-white pb-[env(safe-area-inset-bottom)]`. Row 1: Record, Panic. Row 2: master volume, meter, Limit badge.
  - The Song group and the File menu are not sticky; they share a row under the header, with the File menu at its right end.
  - `<main>` has `pb-32` so the last widget is not hidden behind the bar.
  - The viewport metadata sets `viewport-fit=cover`; `env()` insets require it.
- Desktop (1440 px): both groups sit in one `sticky top-0` bar under the header, Master first so it does not move when the Song group appears. The File menu is the last item, pushed to the right end of the bar. The Song group wraps to a second line when the bar is too narrow.
- Panic is visible at every breakpoint.
- One component with responsive classes. Rendering two transports would duplicate controls in the accessibility tree.

## Add synth menu
- A button opens a menu listing the five types, each with a one-line description ("Pluck — plucked string").
- Implementation: native `<details>`/`<summary>`, or a button plus list following the APG menu-button pattern.
  - Mobile: a full-width list under the button.
  - Desktop: an anchored dropdown (`absolute`, `w-72`).
- Choosing a type adds the widget, closes the menu and moves focus (see Grid).

## File menu
- A secondary button "File", the last item of the transport bar, following the APG menu-button pattern. Its dropdown is anchored to the right edge of the button at every breakpoint.
- Items, in order:
  - "Load MIDI file…" and "Load patch…", which open visually hidden `<input type="file">` elements. Those inputs are out of the tab order and the accessibility tree.
  - "Save patch", disabled with "Unavailable: add a synth first" when the rack is empty.
  - A separator, then the WAV format as two `menuitemradio` items, "WAV 16-bit" and "WAV 32-bit float". They are disabled while recording or rendering.
- Choosing an item closes the menu and returns focus to the File button.

## Empty states
- No widgets: the rack shows one panel, "No synths yet. Add a synth to start.", with the Add synth button inside it in the same position.
- No MIDI file: the Song group (Play/Stop, position, Render to WAV) is not rendered; the transport shows the Master group only.

## Breakpoint checks (390 and 1440)
- No horizontal scroll at 390 px. Long part labels truncate (`truncate`, with the full name in `title`).
- The part select is full-width in the footer on mobile.
- Hit targets: ≥ 44 px tall for primary and transport controls, ≥ 24 px for everything else (`controls-and-accessibility.md`).

## Sources
- Tailwind CSS docs, responsive design and breakpoints (https://tailwindcss.com/docs/responsive-design)
- MDN, `env()` and safe-area insets (https://developer.mozilla.org/en-US/docs/Web/CSS/env)
- W3C WAI-ARIA APG, Menu Button pattern (https://www.w3.org/WAI/ARIA/apg/patterns/)
