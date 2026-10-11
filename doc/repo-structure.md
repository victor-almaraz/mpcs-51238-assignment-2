# Repo structure

## Scope
Folder layout, routes, and which modules may import which. `<style>` stands for each of the three style slugs (kebab-case, e.g. `calm`); every `<style>` folder exists three times, once per style.

## Tree
```
.
├── AGENTS.md
├── docs/                                  # agent reference docs
├── next.config.ts                         # output: 'export', trailingSlash: true, images.unoptimized: true
├── package.json
├── pnpm-lock.yaml
├── postcss.config.mjs                     # @tailwindcss/postcss
├── tsconfig.json                          # paths: { "@/*": ["./src/*"] }
├── public/
│   └── worklets/                          # plain JS, outside the bundle (audioworklet.md)
│       ├── safety-limiter.js
│       ├── ks-processor.js
│       └── recorder.js
└── src/
    ├── app/                               # routes only
    │   ├── layout.tsx                     # root layout, fonts, globals.css
    │   ├── globals.css                    # @import "tailwindcss"; @theme inline token mapping
    │   ├── page.tsx                       # /            hub
    │   ├── mood-boards/
    │   │   └── <style>/
    │   │       ├── page.tsx               # /mood-boards/<style>/
    │   │       ├── artifacts.ts           # ordered list of the 25–30 artifacts
    │   │       └── images/                # artifact image files, statically imported
    │   ├── design-systems/
    │   │   └── <style>/
    │   │       └── page.tsx               # /design-systems/<style>/  showcase of src/design-systems/<style>
    │   └── synth/
    │       └── page.tsx                   # /synth/      renders <SynthApp /> (client)
    ├── design-systems/
    │   └── <style>/
    │       ├── tokens.css                 # CSS variables scoped to [data-ds="<style>"]
    │       ├── fonts.ts                   # next/font definitions for this style
    │       ├── index.ts                   # public exports
    │       └── components/                # Button, Chip, Card, Slider, Select, Radio, Toggle,
    │                                      # Tabs, ListRow, Badge, Dialog, Alert, EmptyState, Meter, ...
    ├── audio/                             # audio core: Web Audio only, no React
    │   ├── context.ts                     # ensureRunning(), audioSession, statechange
    │   ├── master-bus.ts                  # mixBus, masterGain, safety stage, meter taps (audio-safety.md)
    │   ├── engine.ts                      # buildEngine(ctx: BaseAudioContext, seed)
    │   ├── instrument.ts                  # Instrument interface, voice tagging ('file' | 'live')
    │   ├── voices.ts                      # allocation, stealing, caps, polyGain
    │   ├── envelope.ts                    # holdAt(), envValueAt(), release helpers
    │   ├── smoothing.ts
    │   ├── random.ts                      # mulberry32 seeded PRNG
    │   ├── worklet-loader.ts              # loadWorklets(ctx)
    │   ├── synths/
    │   │   ├── param-defs.ts              # PARAM_DEFS, the single source for ranges
    │   │   ├── scaling.ts                 # lin / log / pow3 mapping
    │   │   ├── subtractive.ts
    │   │   ├── fm.ts
    │   │   ├── additive.ts
    │   │   ├── pluck.ts                   # main-thread side of ks-processor
    │   │   └── granular.ts
    │   └── recording/
    │       ├── recorder.ts                # LiveRecorder
    │       ├── wav.ts                     # header writer, body encoder, TPDF dither
    │       ├── offline-render.ts          # renderSongToWav()
    │       └── download.ts                # downloadBlob(), wavFilename()
    ├── midi/                              # SMF parsing: pure TS, no DOM
    │   ├── types.ts                       # Note, TrackInfo, PartInfo, Song
    │   ├── reader.ts                      # bounds-checked byte reader, readVLQ
    │   ├── parse.ts                       # parseMidi(buffer): Song
    │   ├── rmid.ts
    │   ├── tempo-map.ts
    │   └── parts.ts                       # part keys and labels
    ├── playback/
    │   ├── scheduler.ts                   # lookahead loop, offline scheduleRange, transport, releaseAll
    │   └── routing.ts                     # partKey, isAudible, dispatch
    ├── live/
    │   ├── input.ts                       # live note layer: liveOn/liveOff, sustain, liveAllOff
    │   ├── web-midi.ts
    │   └── keyboard.ts                    # key map, octave
    ├── patch/
    │   ├── schema.ts                      # types, CURRENT_VERSION
    │   ├── validate.ts                    # parsePatch, coerce, resolvePart
    │   ├── migrate.ts
    │   └── file-io.ts                     # savePatch, readFile
    ├── state/
    │   └── rack.ts                        # rack state (widgets, part, mute/solo, armed) + reducer
    └── components/
        ├── guide/                         # parts of the guide page that read app modules
        ├── hub/                           # hub page sections
        ├── mood-board/                    # shared grid/artifact components used by all three boards
        └── synth/                         # SynthApp, Transport, RackToolbar, AddSynthMenu,
            │                              # MasterSection, RecordControls
            └── widgets/                   # WidgetCard, HarmonicBars, one params panel per synth type
```

## Routes
| Path | Source |
|---|---|
| `/` | `src/app/page.tsx` |
| `/mood-boards/<style>/` | `src/app/mood-boards/<style>/page.tsx` |
| `/design-systems/<style>/` | `src/app/design-systems/<style>/page.tsx` |
| `/synth/` | `src/app/synth/page.tsx` |
| `/guide/` | `src/app/guide/page.jsx` |
| `/dev/safety/`, `/dev/core/` | `src/app/dev/<suite>/page.dev.jsx` (development only) |

- `/guide/` explains how to operate the rack, including the master volume, Panic and the audio messages. It uses the meta style, like the hub, and the hub and the rack header link to it.
- Test pages are named `page.dev.jsx`. `next.config.mjs` adds `dev.jsx` to `pageExtensions` only under `next dev`, so `next build` leaves them out of the export. The hub links to them only in development.
- Each style has its own static route folder. No dynamic `[style]` segment.
- `next build` writes the export to `out/` (git-ignored).

## Mood boards
- A mood board's folder contains everything specific to it: `page.tsx`, `artifacts.ts` and `images/`.
- Images are statically imported (`import img from './images/01.jpg'`) and rendered with `next/image`. Static export is incompatible with the default image loader; it requires `images.unoptimized: true` or a custom loader. This project uses `unoptimized`.
- Generated artifacts that are not images (colour swatches, type specimens, UI fragments) are defined in `artifacts.ts` and rendered by `src/components/mood-board/`.
- Shared layout components live in `src/components/mood-board/`. Nothing style-specific lives there.

## Design systems
- Each library lives in `src/design-systems/<style>/`. The route `src/app/design-systems/<style>/page.tsx` imports from it to render the showcase. The route folder contains no components.
- Tokens:
  - `tokens.css` defines the style's values as CSS variables under `[data-ds="<style>"]` (e.g. `--ds-bg`, `--ds-surface`, `--ds-text`, `--ds-muted`, `--ds-border`, `--ds-accent`, `--ds-radius`).
  - `globals.css` imports all three `tokens.css` files and maps the variables to Tailwind theme names with `@theme inline` (e.g. `--color-accent: var(--ds-accent)`), giving utilities such as `bg-accent`, `text-muted`, `border-border`.
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
| `live/` | `audio/`, `playback/routing.ts` | React, `components/` |
| `patch/` | `audio/synths/param-defs.ts`, `midi/types.ts` | React, `components/` |
| `state/` | `audio/`, `midi/`, `playback/`, `live/`, `patch/` | `components/`, `design-systems/` |
| `design-systems/<style>/` | React, its own files | `audio/`, `midi/`, `playback/`, `live/`, `patch/`, `state/`, other styles |
| `components/synth/` | everything above, one style's `design-systems/` | — |
| `components/guide/` | `audio/synths/param-defs.js`, `design-systems/meta/` | other `audio/` modules, `state/` |
| `app/` | `components/`, `design-systems/` | `audio/` directly |

- `audio/` modules take a `BaseAudioContext` argument instead of reading a global, so offline render can pass an `OfflineAudioContext` (`recording.md`).
- No `audio/`, `midi/`, `playback/`, `live/` or `patch/` module runs code at import time that touches `window`, `navigator` or `AudioContext`. They are safe to import during prerender.
- Files that use hooks, event handlers or browser APIs start with `'use client'`. `src/components/synth/SynthApp.tsx` is the client boundary for the synth.

## Naming
- Files: kebab-case (`master-bus.ts`). React components: PascalCase files (`WidgetCard.tsx`), one component per file.
- Synth type ids match file names: `subtractive`, `fm`, `additive`, `pluck`, `granular`.

## Git-ignored
`node_modules/`, `.next/`, `out/`.

## Sources
- Next.js docs, Project structure (https://nextjs.org/docs/app/getting-started/project-structure)
- Next.js docs, Static Exports (https://nextjs.org/docs/app/guides/static-exports)
- Tailwind CSS docs, Theme variables and `@theme inline` (https://tailwindcss.com/docs/theme)
