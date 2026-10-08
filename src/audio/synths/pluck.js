// Main-thread side of the Karplus-Strong pluck (synthesis-pluck.md, audioworklet.md).
// Voices live inside one 'ks-processor' AudioWorkletNode per widget. The main thread keeps
// a logical voice per note so caps, stealing and noteOff matching work like other types.

import { Instrument } from '../instrument.js';
import { GAIN_TAU } from '../smoothing.js';

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
    const { decay, pickPosition } = this.params;
    this.node.port.postMessage({ type: 'on', id, pitch, vel: velocity, time: t, decay, pickPosition });
    // Without a release the string decays below −120 dB (the inactivity floor) after 2 × T60.
    return { id, start: t, offTime: Infinity, end: t + 2 * decay };
  }

  releaseVoice(v, t) {
    // From `t` the processor switches to a loop gain with T60 = release (never slower than the
    // decay), so the string is below −120 dB after 2 × release; 50 ms leaves a margin.
    const release = this.params.release;
    this.node.port.postMessage({ type: 'off', id: v.id, time: t, release });
    v.offTime = t;
    v.end = Math.min(v.end, t + 2 * release + 0.05);
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
    // decay and pick position travel with each note, release with each note-off.
  }

  dispose() {
    if (this.disposed) return;
    super.dispose();
    this.node.port.postMessage({ type: 'allOff' });
    this.node.disconnect();
    this.node.port.close();
  }
}
