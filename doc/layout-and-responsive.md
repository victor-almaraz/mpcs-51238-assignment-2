# Layout and responsive design

## Scope
Page structure, the rack grid, widget anatomy and responsive behaviour at 390 px and 1440 px, using Tailwind only. Control states are in `controls-and-accessibility.md`.

## Page regions (in DOM and visual order)
1. **Header (hero):** page title "Synthesizer Rack" (the only H1) and a link back to the hub.
2. **Transport band:** all meta controls in one section with a bottom border, which separates them from the rack.
   - **Master** (always shown): Record toggle and recording indicator (`recording.md`), master volume, meter, Limit badge, Panic / Reset (`audio-safety.md`).
   - **Song** (shown only once a MIDI file is loaded or being read): file name, Play/Stop toggle, position `0:42 / 3:10`, Render to WAV and render progress.
   - **File menu** (always shown, at the end of the first row; see "File menu").
   - **Live input** (last row): Play with Keyboard, octave, Connect MIDI Device, device status (`live-input.md`).
3. **Banners** (only when needed): ongoing audio states and errors.
4. **Rack:** the **Add Synth** button (primary, the only accent-coloured control), then the widget grid. It starts 24 px below the transport band.
5. **Status toasts:** one `aria-live="assertive"` region (Panic, audio fault) and one `aria-live="polite"` region (loaded, saved, recording states), shown as toasts (see "Status toasts").

## Alignment
- Meta controls (header, transport band, banners) share one left edge at every width. Each full-width row has side padding `px-4 md:px-8`, and its content is `mx-auto w-full max-w-7xl` inside that padding. The shared classes live in `src/components/synth/layout.js`.
- The rack is its own bordered panel (`rounded-ds border border-border-strong p-2 md:p-6`, `rackPanel` in `layout.js`). The panel's border sits on the meta edge, and its padding indents Add Synth and the widgets past the meta controls, so widgets align with each other at a deeper indent.
- The live-input group is left-aligned.

## Grid
```html
<main class="px-4 md:px-8 …">
  <section aria-label="Synth rack" class="mx-auto w-full max-w-7xl rounded-ds border border-border-strong p-2 md:p-6">
    <!-- Add Synth -->
    <ul class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"> <!-- one <li> per widget -->
```
- At 390 px: 1 column. Widgets are 340 px wide (16 px page padding, 1 px panel border and 8 px panel padding on each side). At 360 px they are 310 px, which still fits the Waveform options.
- At 1440 px:
  - `max-w-7xl` (1280 px) minus the panel's border and 24 px padding on each side leaves 1230 px.
  - 3 columns with 16 px gaps gives widgets about 400 px wide.
  - The widget is designed at ~360 px; its internal layout is identical at every breakpoint.
- Widgets keep insertion order. Position does not encode routing; the part select and the Live chip do.
- New widgets go at the end. After adding, focus moves to the new widget's heading, and the widget scrolls into view with `scrollIntoView({ block: 'nearest' })` (instant under reduced motion).

## Widget anatomy (fixed vertical order)
```
┌ Header ───────────────────────────────────────────┐
│ [▾ Type name H2]   [Live] [M] [S] [Lock] [Remove ✕] │
├ Params ───────────────────────────────────────────┤
│ Waveform  (○ Sine ● Saw ○ Sq ○ Tri)               │
│ Cutoff    ───────●──────────   2.0 kHz            │
│ Resonance ──●───────────────   1.0 dB             │
│ Attack / Decay / Sustain / Release …              │
├ Footer ───────────────────────────────────────────┤
│ Part      [All parts ▾]                           │
│ Volume    ────────●─────────   −6.0 dB            │
│ Octave    ─────●────────────   0 oct              │
│ Cents     ─────●────────────   0 cents            │
└────────────────────────────────────────────────────┘
```
- Header: the title and the chips wrap onto two rows when the card is too narrow for one (phones); the title keeps at least 8 rem.
- Collapse: the title is a `DisclosureButton` (▾ expanded, ▸ collapsed; `aria-expanded`, `aria-controls` the params and footer). A collapsed widget shows its header only. Collapse is session state and is not stored in patches.
- Lock: the Lock chip (pressed = locked) disables every control that changes the sound or routing: params (including typed values, harmonic bars and Load File…), Part, Volume, Octave, Cents and Remove. Live, M and S stay enabled, so a locked widget can always be muted. The reducer ignores param, harmonic, sample and tuning actions on a locked widget. The lock is stored in patches.
- Tuning: Octave (−3 to +3, step 1) and Cents (−100 to +100, step 1) shift every note the widget plays, file and live. The shift applies to notes that start after a change, and the shifted pitch is clamped to MIDI 0–127. Both are stored in patches (`patch-format.md`).
- Alignment:
  - Labels sit on the left at a fixed width (`w-24`).
  - Sliders fill the middle (`flex-1`).
  - Values align right (`w-20 text-right tabular-nums`).
- Grouping:
  - Header: identity and actions.
  - Params: sound-shaping controls. Use `<fieldset>`/`<legend>` for radio groups.
  - Footer: routing, level and tuning, separate from the params.
- Params order: sound source first, then shaping, then the envelope (attack, decay, sustain, release), then modulation. At most 8 controls per card (`synthesis-conventions.md`).
- Granular: only while the File source is selected, a row under Source, aligned with the controls, holds "Load File…" (a `FileButton`, accepting `audio/*`) and the loaded file's name (truncated, full name in `title`), or "No file loaded: silent". A loaded sample is kept while another source is selected. Load errors use the error banner ("Couldn't load {file}: {reason}"); success shows a toast ("Loaded file {name} (1.8 s)").
- Card style:
  - `rounded-lg border border-neutral-300 bg-white p-3 md:p-4` (12 px padding on phones keeps the param rows from truncating at 360 px).
  - No shadow stacks, gradients, knobs, screws or textures.
- Muted widgets:
  - Fade only the params area to `opacity-60`, and show the M chip as selected.
  - The header keeps full contrast.

## Live input and Add Synth
- Live input: the last row of the transport band, left-aligned, wrapping on mobile. Play with Keyboard is hidden when `matchMedia('(hover: none) and (pointer: coarse)')` matches. Connect MIDI Device is absent when Web MIDI is unsupported (`live-input.md`). The row is not rendered when neither control applies.
- Add Synth: the first item inside the rack panel. Full-width on mobile, natural width from `md`.

## Type scale (max 3 sizes, 2 weights)
| Role | Tailwind |
|---|---|
| Page title (hero) | `text-4xl md:text-6xl font-semibold tracking-tight` |
| Widget title, section labels | `text-base font-semibold` |
| Everything else (labels, values, buttons) | `text-sm font-normal` |

## Palette (small, purposeful)
- Neutral greys for surfaces, borders and text: `neutral-900` text on `white`/`neutral-50`.
- **One accent**, from the chosen design system (e.g. `indigo-600`):
  - Used on Add Synth only.
- One error colour (`red-700` text on `red-50`) and one success colour (`green-700`).
- Never use colour alone to show state; pair it with text or an icon.

## Transport placement
- Mobile (390 px):
  - The Master group forms a **sticky bottom bar** in two rows: `fixed inset-x-0 bottom-0 border-t bg-white pb-[env(safe-area-inset-bottom)]`. Row 1: Record, Panic. Row 2: master volume, meter, Limit badge.
  - The Song group and the File menu are not sticky; they share a row under the header, with the File menu at its right end. The live-input row follows, and the band's bottom border closes the group.
  - `<main>` has `pb-32` so the last widget is not hidden behind the bar.
  - The viewport metadata sets `viewport-fit=cover`; `env()` insets require it.
- Desktop (1440 px): both groups sit in one `sticky top-0` bar under the header, Master first so it does not move when the Song group appears. The File menu is pushed to the right end of the first row. The Song group wraps to a second line when the bar is too narrow. The live-input row is the bar's last row (`basis-full`), so it stays reachable while scrolling the rack.
- Panic is visible at every breakpoint.
- One component with responsive classes. Rendering two transports would duplicate controls in the accessibility tree.

## Add Synth menu
- A button opens a menu listing the five types, each with a one-line description ("Pluck — plucked string").
- Implementation: native `<details>`/`<summary>`, or a button plus list following the APG menu-button pattern.
  - Mobile: a full-width list under the button.
  - Desktop: an anchored dropdown (`absolute`, `w-72`).
- Choosing a type adds the widget, closes the menu and moves focus (see Grid).

## File menu
- A secondary button "File", the last item of the transport bar, following the APG menu-button pattern. Its dropdown is anchored to the right edge of the button at every breakpoint.
- Items, in order:
  - "Load MIDI File…" and "Load Patch…", which open visually hidden `<input type="file">` elements. Those inputs are out of the tab order and the accessibility tree.
  - "Save Patch", disabled with "Unavailable: add a synth first" when the rack is empty.
  - A separator, then the WAV format as two `menuitemradio` items, "WAV 16-Bit" and "WAV 32-Bit Float". They are disabled while recording or rendering.
- Choosing an item closes the menu and returns focus to the File button.

## Status toasts
- Status messages appear as toasts (GNOME HIG "Toasts"), not as text in the page flow, so they stay in view at any scroll position.
- Placement: `fixed`, horizontally centred, up to `max-w-lg` wide.
  - Below `lg`, toasts sit 12 px above the bottom transport bar. Transport publishes the bar's height as `--bottom-bar-h`.
  - From `lg`, they sit 24 px from the bottom of the window.
- Content: the message, an optional action ("Undo", "Download Again"), an optional Details disclosure, and a Dismiss button (✕).
- Timing: a toast hides after 6 s. The timer pauses while the pointer or keyboard focus is on the toast. A new message replaces the current one.
- Undo (widget removal, patch load over a non-empty rack) is available only while its toast is visible. Once the toast hides or is replaced, the undo is dropped. After Undo, focus moves to the restored widget's heading (the first widget's after a patch undo), because the Undo button unmounts with its toast.
- Live regions: the assertive and polite regions stay mounted inside the toast container; each message gets a fresh node.
- Ongoing states (audio paused, safety stage stopped, level reduced) stay as banners under the transport.

## Empty states
- No widgets: the rack shows one panel, "No synths yet. Add a synth to start.", with the Add Synth button inside it in the same position.
- No MIDI file: the Song group (Play/Stop, position, Render to WAV) is not rendered; the transport shows the Master group only.

## Breakpoint checks (390 and 1440)
- No horizontal scroll at 390 px. Long part labels truncate (`truncate`, with the full name in `title`).
- The part select is full-width in the footer on mobile.
- Hit targets: ≥ 44 px tall for primary and transport controls, ≥ 24 px for everything else (`controls-and-accessibility.md`).

## Sources
- Tailwind CSS docs, responsive design and breakpoints (https://tailwindcss.com/docs/responsive-design)
- MDN, `env()` and safe-area insets (https://developer.mozilla.org/en-US/docs/Web/CSS/env)
- W3C WAI-ARIA APG, Menu Button pattern (https://www.w3.org/WAI/ARIA/apg/patterns/)
