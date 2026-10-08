// Subtractive: OscillatorNode(type) → BiquadFilterNode('lowpass') → env Gain → output
// (synthesis-subtractive.md).

import { Instrument } from '../instrument.js';
import { FILTER_TAU } from '../smoothing.js';
import { mtof } from './param-defs.js';

export class Subtractive extends Instrument {
  constructor(ctx, pool, opts) {
    super('subtractive', ctx, pool, opts);
  }

  cutoffHz() {
    return Math.min(this.params.cutoff, 0.45 * this.ctx.sampleRate);
  }

  startVoice(pitch, velocity, t) {
    const p = this.params;
    const v = this.voiceModel(t, velocity, p.attack, p.release);
    const osc = new OscillatorNode(this.ctx, { type: p.waveform, frequency: mtof(pitch) });
    const filter = new BiquadFilterNode(this.ctx, { type: 'lowpass', frequency: this.cutoffHz(), Q: p.resonance });
    const env = new GainNode(this.ctx, { gain: 0 });
    osc.connect(filter).connect(env).connect(this.polyNode);
    Object.assign(v, { env, filter, sources: [osc], nodes: [osc, filter, env] });
    this.launch(v);
    return v;
  }

  applyParam(name, value, now) {
    if (name === 'cutoff') {
      const hz = this.cutoffHz();
      for (const v of this.activeVoices()) v.filter.frequency.setTargetAtTime(hz, now, FILTER_TAU);
    } else if (name === 'resonance') {
      for (const v of this.activeVoices()) v.filter.Q.setTargetAtTime(value, now, FILTER_TAU);
    }
    // waveform, attack and release apply to new voices.
  }
}
