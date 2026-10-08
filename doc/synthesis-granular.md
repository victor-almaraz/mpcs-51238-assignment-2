# Synthesis: granular

## Scope
The granular instrument. Shared rules are in `synthesis-conventions.md`; voices in `audio-engine-core.md`; the lookahead timer in `midi-playback-scheduling.md`.

## Flow per grain
`AudioBufferSourceNode(sourceBuffer, offset, playbackRate) → Gain(window) → voice bus Gain(env) → output`

## Parameters
| Param | Range | Default | Unit | Scale |
|---|---|---|---|---|
| source | 'saw', 'noise', 'chord' | saw | generated buffer | radio |
| grain size | 0.01 – 0.25 | 0.06 | s | log |
| density | 2 – 60 | 20 | grains/s per voice | log |
| spray | 0 – 1 | 0.2 | fraction of buffer randomised | lin |

## Generated source
- At widget creation, a 2-second mono `AudioBuffer` at `ctx.sampleRate` is filled with one of: a sawtooth at 261.63 Hz (C4), white noise (seeded `mulberry32`), or a summed triad.
- No audio files are loaded.
- The sawtooth is naive (not alias-free).

## Pitch
`playbackRate = f / 261.63`. The noise source ignores pitch; only spray and density shape it.

## Scheduling
- Grains are scheduled by the transport's lookahead timer, or per window by `scheduleRange` in offline mode (`midi-playback-scheduling.md`).
- Each held voice emits grains at intervals of `1/density`, jittered ±20%.
- Jitter and offset randomness use the widget's seeded `mulberry32` (`rand()` below), so offline renders are reproducible.
- Each grain: `src.start(t, offset, size)`, with a triangular window (each side ≥ 2 ms; guaranteed by the 10 ms minimum grain size): `gain.setValueAtTime(0,t); linearRampToValueAtTime(1, t+size/2); linearRampToValueAtTime(0, t+size)`.
- Offset: `centre + (rand()−0.5) · spray · bufferDuration`, clamped to `[0, bufferDuration − size]`.

## Density limits (project limits)
- Concurrent grains per voice ≈ `density × size` (60 × 0.25 = 15).
- Concurrent grains per widget are capped at 64. Past the cap, new grains are skipped; existing grains are not stolen.
- Voice cap for this type: 4.
- Each grain creates 2 nodes; 64 concurrent grains means 1000+ node creations per second. This is the highest CPU load in the app, most significant on mobile.

## Voice envelope
- The voice bus gain uses fixed envelope values, not exposed as params: attack 0.05 s, release 0.4 s.
- Grains continue until the release completes.

## Pitfalls
- Grains that fall inside the lookahead window but after noteOff + release are not scheduled.
- `start()` with an offset beyond the buffer plays nothing; offsets are clamped.

## Sources
- MDN, AudioBufferSourceNode.start (https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/start)
- C. Roads, Microsound (MIT Press, 2001)
