# Synthesis: subtractive

## Scope
The subtractive instrument. Shared rules (pitch, velocity, `ParamDef`, scaling) are in `synthesis-conventions.md`; envelopes and voices in `audio-engine-core.md`.

## Flow
`OscillatorNode(type) → BiquadFilterNode('lowpass') → GainNode(env) → widget.output`

## Parameters
| Param | Range | Default | Unit | Scale |
|---|---|---|---|---|
| waveform | sine, square, sawtooth, triangle | sawtooth | — | radio |
| cutoff | 40 – 16000 (clamp ≤ 0.45·fs) | 2000 | Hz | log |
| resonance | 0 – 20 | 1 | dB (the lowpass `Q` is interpreted in dB) | lin |
| attack | 0.002 – 2 | 0.01 | s | pow3 |
| release | 0.01 – 4 | 0.3 | s | pow3 |

## Notes
- The spec defines the built-in waveforms from Fourier series, so they are band-limited. Aliasing is not a concern with the native types.
- Live cutoff changes go to every active voice's `filter.frequency`, with smoothing.
- Cost: 3 nodes per voice.

## Sources
- W3C Web Audio API 1.1, OscillatorNode and BiquadFilterNode (https://www.w3.org/TR/webaudio-1.1/)
- MDN, BiquadFilterNode (https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode)
