# Repo structure

## Scope
Folder layout, routes, and which modules may import which. `<style>` stands for each of the three style slugs: `industrial`, `contrast-form` and `light-grain-color`. Every `<style>` folder exists once per style. The meta style (`src/design-systems/meta/`) styles the hub, guide, mood-board and design-system pages.

## Tree
```
.
├── AGENTS.md
├── README.md
├── doc/                                   # reference docs
├── jsconfig.json                          # paths: { "@/*": ["./src/*"] }
├── next.config.mjs                        # output: 'export', trailingSlash, images.unoptimized, pageExtensions
├── package.json                           # scripts: dev, build, test
├── pnpm-lock.yaml
├── postcss.config.mjs                     # @tailwindcss/postcss
├── public/
│   └── worklets/                          # plain JS, outside the bundle (audioworklet.md)
│       ├── safety-limiter.js
│       ├── ks-processor.js
│       └── recorder.js
├── tests/                                 # node:test unit tests (pnpm test), fakes and MIDI fixtures
└── src/
    ├── app/                               # routes only
    │   ├── layout.jsx                     # root layout, metadata, viewport, globals.css
    │   ├── globals.css                    # @import "tailwindcss"; the four tokens.css files; @theme inline mapping
    │   ├── page.jsx                       # /            hub
    │   ├── guide/
    │   │   └── page.jsx                   # /guide/      how to operate the rack
    │   ├── mood-boards/
    │   │   └── <style>/
    │   │       ├── page.jsx               # /mood-boards/<style>/
    │   │       ├── artifacts.js           # label, title, intro and the ordered artifact groups
    │   │       └── images/                # artifact image files, statically imported
    │   ├── design-systems/
    │   │   └── <style>/
    │   │       └── page.jsx               # /design-systems/<style>/  showcase of src/design-systems/<style>
    │   ├── synth/
    │   │   └── page.jsx                   # /synth/      renders <SynthApp /> (client)
    │   └── dev/
    │       └── <suite>/
    │           └── page.dev.jsx           # /dev/safety/, /dev/core/  test pages, next dev only
    ├── design-systems/
    │   ├── meta/                          # tokens.css, classes.js, index.js, components/ (system fonts)
    │   └── <style>/
    │       ├── tokens.css                 # CSS variables scoped to [data-ds="<style>"]
    │       ├── classes.js                 # shared class strings for the components
    │       ├── fonts.js                   # next/font/local definitions; exports fontClassName
    │       ├── fonts/                     # font files, their licences and a README of sources
    │       ├── about.js                   # principles and font credits for the showcase
    │       ├── index.js                   # public exports
    │       └── components/                # Alert, Badge, Button, Card, CardSection, Chip, Dialog,
    │                                      # Disclosure, DisclosureButton, EmptyState, FieldLabel,
    │                                      # FileButton, Heading, IconButton, MenuButton, Meter,
    │                                      # ProgressBar, SegmentedControl, Select, Slider, SliderGroup,
    │                                      # TextOutput, Toast, ToggleButton, ValueField, VisuallyHidden
    ├── audio/                             # audio core: Web Audio only, no React
    │   ├── context.js                     # ensureRunning(), audioSession, statechange
    │   ├── master-bus.js                  # mixBus, masterGain, safety stage, meter taps (audio-safety.md)
    │   ├── engine.js                      # buildEngine(ctx, seed)
    │   ├── instrument.js                  # instrument contract, voice tagging ('file' | 'live')
    │   ├── voices.js                      # allocation, stealing, caps, polyGain
    │   ├── envelope.js                    # holdAt(), envValueAt(), release helpers
    │   ├── smoothing.js
    │   ├── random.js                      # mulberry32 seeded PRNG
    │   ├── sample.js                      # user samples for the granular source
    │   ├── worklet-loader.js              # loadWorklets(ctx)
    │   ├── synths/
    │   │   ├── param-defs.js              # PARAM_DEFS, the single source for ranges; SYNTH_INFO
    │   │   ├── scaling.js                 # lin / log / pow3 mapping
    │   │   ├── subtractive.js
    │   │   ├── fm.js
    │   │   ├── additive.js
    │   │   ├── pluck.js                   # main-thread side of ks-processor
    │   │   └── granular.js
    │   └── recording/
    │       ├── recorder.js                # LiveRecorder
    │       ├── wav.js                     # header writer, body encoder, TPDF dither
    │       ├── offline-render.js          # renderSongToWav()
    │       └── download.js                # downloadBlob(), wavFilename()
    ├── midi/                              # SMF parsing: plain JS, no DOM
    │   ├── types.js                       # Note, TrackInfo, PartInfo, Song (JSDoc only)
    │   ├── reader.js                      # bounds-checked byte reader, readVLQ
    │   ├── parse.js                       # parseMidi(buffer): Song
    │   ├── rmid.js
    │   ├── tempo-map.js
    │   └── parts.js                       # part keys and labels
    ├── playback/
    │   ├── scheduler.js                   # lookahead loop, offline scheduleRange, transport, releaseAll
    │   └── routing.js                     # partKey, isAudible, dispatch
    ├── live/
    │   ├── input.js                       # live note layer: liveOn/liveOff, sustain, liveAllOff
    │   ├── web-midi.js
    │   └── keyboard.js                    # key map, octave
    ├── patch/
    │   ├── schema.js                      # CURRENT_VERSION, MAX_WIDGETS
    │   ├── validate.js                    # parsePatch, coerce, resolvePart
    │   ├── migrate.js
    │   └── file-io.js                     # savePatch, readPatchFile
    ├── state/
    │   ├── rack.js                        # rack state (widgets, part, mute/solo, armed) + reducer
    │   └── session.js                     # the audio session behind the synth UI
    └── components/
        ├── design-system/                 # Showcase and its sections; one client binding per style
        ├── dev/                           # test-page suites (safety-cases.js, core-cases.js)
        ├── guide/                         # parts of the guide page that read app modules
        ├── hub/                           # hub page sections
        ├── mood-board/                    # shared grid/artifact components used by all three boards
        └── synth/                         # SynthApp, Transport, SongControls, MasterSection, FileMenu, …
            └── widgets/                   # WidgetCard, HarmonicBars, one params panel per synth type
```

## Routes
| Path | Source |
|---|---|
| `/` | `src/app/page.jsx` |
| `/mood-boards/<style>/` | `src/app/mood-boards/<style>/page.jsx` |
| `/design-systems/<style>/` | `src/app/design-systems/<style>/page.jsx` |
| `/synth/` | `src/app/synth/page.jsx` |
| `/guide/` | `src/app/guide/page.jsx` |
| `/dev/safety/`, `/dev/core/` | `src/app/dev/<suite>/page.dev.jsx` (development only) |

- `/guide/` explains how to operate the rack, including the master volume, Panic and the audio messages. It uses the meta style, like the hub, and the hub and the rack header link to it.
- Test pages are named `page.dev.jsx`. `next.config.mjs` adds `dev.jsx` to `pageExtensions` only under `next dev`, so `next build` leaves them out of the export. The hub links to them only in development.
- Each style has its own static route folder. No dynamic `[style]` segment.
- `next build` writes the export to `out/` (git-ignored).

## Mood boards
- A mood board's folder contains everything specific to it: `page.jsx`, `artifacts.js` and `images/`.
- Images are statically imported (`import img from './images/01.jpg'`) and rendered with `next/image`. Static export is incompatible with the default image loader; it requires `images.unoptimized: true` or a custom loader. This project uses `unoptimized`.
- Generated artifacts that are not images (colour swatches, type specimens, UI fragments) are defined in `artifacts.js` and rendered by `src/components/mood-board/`.
- Shared layout components live in `src/components/mood-board/`. Nothing style-specific lives there.

## Design systems
- Each library lives in `src/design-systems/<style>/`. The route `src/app/design-systems/<style>/page.jsx` imports from it to render the showcase. The route folder contains no components.
- Tokens:
  - `tokens.css` defines the style's values as CSS variables under `[data-ds="<style>"]` (e.g. `--ds-bg`, `--ds-surface`, `--ds-text`, `--ds-muted`, `--ds-border`, `--ds-accent`, `--ds-radius`).
  - `globals.css` imports the four `tokens.css` files (meta and the three styles) and maps the variables to Tailwind theme names with `@theme inline` (e.g. `--color-accent: var(--ds-accent)`), giving utilities such as `bg-accent`, `text-muted`, `border-border`.
  - Optional tokens fall back to a base token when a style leaves them out: `--ds-font-hero` (page title; falls back to the display font), and Industrial's `--ds-window`, `--ds-lamp`, `--ds-lamp-off` and `--ds-collar` (instrument windows, indicator lamps, the Panic collar).
  - Every style defines `--ds-level-low`, `--ds-level-mid` and `--ds-level-high`, the three colours of the level gradients (meter, harmonic bars, render progress); the theme maps them to `level-low`, `level-mid` and `level-high`.
  - A page selects its style by setting `data-ds="<style>"` on its root element. The showcase pages set their own style; `/synth/` sets the chosen style.
- Components use the semantic utilities only. Raw palette classes (`neutral-*`, `indigo-*`) in `layout-and-responsive.md` and `controls-and-accessibility.md` stand for the corresponding tokens.
- The rack uses one chosen style, named in `src/components/synth/style.js` (`STYLE`, `ds`). `/synth/` sets `data-ds={STYLE}` and the library's `fontClassName` on its root, and `SynthApp` provides the library through `DesignSystemProvider`. Synth components read their components with `useDesignSystem()`; none imports a style directly. The chosen style is Industrial.
- Every library exports the same component names with the same props, plus `fontClassName`. The element that carries `data-ds` also takes `fontClassName`.
- Fonts:
  - Fonts are open-licence and self-hosted. Google Fonts are not used.
  - `fonts.js` loads the files in the style's `fonts/` folder with `next/font/local`. Each family defines a CSS variable that `tokens.css` reads into `--ds-font-sans` and `--ds-font-display`.
  - Each font's licence file sits beside its font files.
- Showcase pages:
  - `src/components/design-system/Showcase.jsx` renders every component in every state the app reaches (`controls-and-accessibility.md`, "Component inventory and states"). It takes the library as `ds` (`import * as ds`) and the style's `about.js` (principles, font credits).
  - A client binding per style (`src/components/design-system/<Style>Showcase.jsx`) passes the library in, because components cannot cross the server–client boundary as props.
  - The page chrome uses the meta style. Specimen panels set `data-ds="<style>"`.
  - Synth widgets come from the rack itself: the widget components read their library from `useDesignSystem()` (`src/components/synth/design-system-context.js`, default meta), and the showcase wraps them in a `DesignSystemProvider` with the style's library and drives them with `rackReducer`.
- Forced states:
  - `globals.css` redefines the `hover`, `active`, `focus` and `focus-visible` variants to also match `data-force~="hover"`, `"active"` and `"focus"` on the element.
  - Components pass `data-force` through to their interactive element. Option and item objects of SegmentedControl and MenuButton accept `force`.
  - Without the attribute, the variants behave as Tailwind's built-ins.

## Import rules
| Module | May import | Must not import |
|---|---|---|
| `audio/` | `audio/` | React, Next, `components/`, `state/`, `design-systems/` |
| `midi/` | `midi/` | DOM APIs, React, anything else in `src/` |
| `playback/` | `audio/`, `midi/` | React, `components/` |
| `live/` | `audio/`, `playback/routing.js` | React, `components/` |
| `patch/` | `audio/synths/param-defs.js`, `midi/types.js` | React, `components/` |
| `state/` | `audio/`, `midi/`, `playback/`, `live/`, `patch/` | `components/`, `design-systems/` |
| `design-systems/<style>/` | React, its own files | `audio/`, `midi/`, `playback/`, `live/`, `patch/`, `state/`, other styles |
| `components/synth/` | everything above, one style's `design-systems/` | — |
| `components/guide/` | `audio/synths/param-defs.js`, `design-systems/meta/` | other `audio/` modules, `state/` |
| `app/` | `components/`, `design-systems/` | `audio/` directly |

- `audio/` modules take a `BaseAudioContext` argument instead of reading a global, so offline render can pass an `OfflineAudioContext` (`recording.md`).
- No `audio/`, `midi/`, `playback/`, `live/` or `patch/` module runs code at import time that touches `window`, `navigator` or `AudioContext`. They are safe to import during prerender.
- Files that use hooks, event handlers or browser APIs start with `'use client'`. `src/components/synth/SynthApp.jsx` is the client boundary for the synth.

## Naming
- Files: kebab-case (`master-bus.js`). React components: PascalCase files (`WidgetCard.jsx`), one component per file. Plain JavaScript only; no TypeScript.
- Synth type ids match file names: `subtractive`, `fm`, `additive`, `pluck`, `granular`.

## Git-ignored
`node_modules/`, `.next/`, `out/`, `.claude/`, `.DS_Store`, `*.tsbuildinfo`, `next-env.d.ts`.

## Sources
- Next.js docs, Project structure (https://nextjs.org/docs/app/getting-started/project-structure)
- Next.js docs, Static Exports (https://nextjs.org/docs/app/guides/static-exports)
- Tailwind CSS docs, Theme variables and `@theme inline` (https://tailwindcss.com/docs/theme)
