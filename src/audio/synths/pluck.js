// Main-thread side of the Karplus-Strong pluck (synthesis-pluck.md, audioworklet.md).
// Voices live inside one 'ks-processor' AudioWorkletNode per widget. The main thread keeps
// a logical voice per note so caps, stealing and noteOff matching work like other types.

import { Instrument } from '../instrument.js';
import { GAIN_TAU } from '../smoothing.js';
import { mtof } from './param-defs.js';

export class Pluck extends Instrument {
  constructor(ctx, pool, opts = {}) {
    super('pluck', ctx, pool, opts);
    this.nextId = 1;
    this.node = new AudioWorkletNode(ctx, 'ks-processor', {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      processorOptions: { seed: opts.seed || 1 },
    });
    this.node.connect(this.polyNode);
    this.node.port.onmessage = (e) => { if (e.data && e.data.type === 'fault') opts.onFault?.(); };
    this.node.onprocessorerror = () => opts.onError?.();
    this.applyParam('damping', this.params.damping, ctx.currentTime);
    this.applyParam('brightness', this.params.brightness, ctx.currentTime);
  }

  startVoice(pitch, velocity, t) {
    const id = this.nextId++;
    const decay = this.params.decay;
    this.node.port.postMessage({ type: 'on', id, pitch, vel: velocity, time: t, decay });
    // Without a release the string decays below −120 dB (the inactivity floor) after 2 × T60.
    return { id, start: t, offTime: Infinity, end: t + 2 * decay };
  }

  releaseVoice(v, t) {
    // After `t` the processor multiplies ρ by 0.9 per loop pass; amplitude falls below −120 dB
    // within ~16 passes, i.e. 16 / f seconds (0.8 s at 20 Hz). 20 / f leaves a margin.
    this.node.port.postMessage({ type: 'off', id: v.id, time: t });
    v.offTime = t;
    v.end = Math.min(v.end, t + Math.max(0.15, 20 / mtof(v.pitch)));
  }

  fastRelease(v, t) {
    this.node.port.postMessage({ type: 'steal', id: v.id, time: t });
    v.offTime = t;
    v.end = Math.min(v.end, t + 0.02);
  }

  stealVoice(v, t) {
    this.fastRelease(v, t);
  }

  cancelVoice(v, t) {
    this.fastRelease(v, t);
  }

  stopAt(v, t) {
    v.end = Math.min(v.end, t);
  }

  allNotesOff(time) {
    super.allNotesOff(time);
    this.node.port.postMessage({ type: 'allOff' });
  }

  applyParam(name, value, now) {
    if (name === 'damping' || name === 'brightness') {
      this.node.parameters.get(name).setTargetAtTime(value, now, GAIN_TAU);
    }
    // decay travels with each note.
  }

  dispose() {
    if (this.disposed) return;
    super.dispose();
    this.node.port.postMessage({ type: 'allOff' });
    this.node.disconnect();
    this.node.port.close();
  }
}
