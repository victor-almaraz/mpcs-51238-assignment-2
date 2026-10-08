// Polyphonic Karplus-Strong pluck (synthesis-pluck.md, audioworklet.md). Plain JS AudioWorklet.
// One node per Pluck widget; all voices live inside it. Buffers are allocated in the
// constructor; process() does not allocate.
//
// Messages in (times in AudioContext seconds):
//   {type:'on', id, pitch, vel, time, decay}   start a voice at `time`
//   {type:'off', id, time}                     begin release at `time`
//   {type:'steal', id, time}                   5 ms fade from `time`, then free the voice;
//                                              a steal due before the voice starts cancels it
//   {type:'allOff'}                            10 ms fade on every voice; drop pending starts
// Messages out: {type:'fault'}
//
// Twice as many slots as the per-widget logical cap (16), so voices that are still fading or
// ringing out after a release are not overwritten by new notes.
const MAX_VOICES = 32;
const MAX_ABS = 1e4;
const QUEUE_CAP = 512;

function mulberry32(seed) {
  let a = seed | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class KSProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'damping',    defaultValue: 0.5, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      { name: 'brightness', defaultValue: 0.7, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
    ];
  }

  constructor(options) {
    super();
    const o = (options && options.processorOptions) || {};
    this.rand = mulberry32(o.seed || 1);
    // `sampleRate` and `currentFrame` are globals in AudioWorkletGlobalScope.
    const maxLen = Math.ceil(sampleRate / 20) + 4;       // lowest note ≈ 20 Hz
    this.voices = [];
    for (let i = 0; i < MAX_VOICES; i++) {
      this.voices.push({
        buf: new Float32Array(maxLen), N: 0, M: 0, w: 0, P: 0, C: 0, apX1: 0, apY1: 0, rho: 0,
        dcX1: 0, dcY1: 0, active: false, id: -1, startFrame: 0, releaseFrame: Infinity,
        releasing: false, fade: 1, fadeStep: 0, passPeak: 0, age: 0,
      });
    }
    this.queue = [];                                     // filled in onmessage, drained in process()
    this.ageCounter = 0;
    this.faulted = false;
    this.port.onmessage = (e) => {
      if (this.queue.length < QUEUE_CAP) this.queue.push(e.data);
    };
  }

  findVoice(id) {
    for (let i = 0; i < MAX_VOICES; i++) {
      const v = this.voices[i];
      if (v.active && v.id === id) return v;
    }
    return null;
  }

  hasPendingOn(id, upTo) {
    for (let k = 0; k < upTo; k++) {
      const m = this.queue[k];
      if (m.type === 'on' && m.id === id) return true;
    }
    return false;
  }

  /** Free slot, else the most-faded voice, else the oldest releasing, else the oldest. */
  allocate() {
    let fading = null, rel = null, old = null;
    for (let i = 0; i < MAX_VOICES; i++) {
      const v = this.voices[i];
      if (!v.active) return v;
      if (v.fadeStep > 0 && (fading === null || v.fade < fading.fade)) fading = v;
      if (v.releasing && (rel === null || v.age < rel.age)) rel = v;
      if (old === null || v.age < old.age) old = v;
    }
    return fading || rel || old;
  }

  startVoice(m, brightness, damping) {
    const v = this.allocate();
    const f = Math.max(20, 440 * Math.pow(2, (m.pitch - 69) / 12));
    const P = sampleRate / f;
    // The integer delay assumes the worst-case averager delay (S = 1), so the allpass
    // fraction d = P − S − M stays in [0.1, 2.1] for any live damping value.
    const M = Math.max(1, Math.floor(P - 1.1));
    const N = M + 1;
    v.P = P; v.M = M; v.N = N; v.w = 0;
    const d = P - damping - M;
    v.C = (1 - d) / (1 + d);
    const t60 = Math.max(0.05, m.decay);
    v.rho = Math.min(0.9999, Math.pow(10, -3 / (t60 * f)));
    const amp = 0.3 * Math.pow(Math.max(1, Math.min(127, m.vel)) / 127, 2);

    // Excitation: N samples of seeded noise, one-pole lowpassed by brightness, mean removed.
    const a = 0.08 + 0.92 * brightness * brightness;
    const buf = v.buf;
    let y = 0, sum = 0;
    for (let i = 0; i < N; i++) {
      y += a * ((this.rand() * 2 - 1) - y);
      buf[i] = y;
      sum += y;
    }
    const mean = sum / N;
    let peak = 0;
    for (let i = 0; i < N; i++) {
      buf[i] -= mean;
      const ab = buf[i] < 0 ? -buf[i] : buf[i];
      if (ab > peak) peak = ab;
    }
    const scale = peak > 0 ? amp / peak : 0;
    for (let i = 0; i < N; i++) buf[i] *= scale;

    v.apX1 = 0; v.apY1 = 0; v.dcX1 = 0; v.dcY1 = 0;
    v.active = true; v.id = m.id;
    v.startFrame = Math.round(m.time * sampleRate);
    v.releaseFrame = Infinity; v.releasing = false;
    v.fade = 1; v.fadeStep = 0; v.passPeak = 0;
    v.age = ++this.ageCounter;
  }

  drain(blockEnd, brightness, damping) {
    const q = this.queue;
    let j = 0;
    for (let k = 0; k < q.length; k++) {
      const m = q[k];
      let keep = false;
      if (m.type === 'on') {
        if (Math.round(m.time * sampleRate) >= blockEnd) keep = true;
        else this.startVoice(m, brightness, damping);
      } else if (m.type === 'off') {
        const v = this.findVoice(m.id);
        if (v !== null) v.releaseFrame = Math.round(m.time * sampleRate);
        else if (this.hasPendingOn(m.id, j)) keep = true;
      } else if (m.type === 'steal') {
        if (Math.round(m.time * sampleRate) >= blockEnd) keep = true;   // not due yet
        else {
          const v = this.findVoice(m.id);
          if (v !== null) {
            if (v.fadeStep === 0) v.fadeStep = 1 / Math.max(1, Math.round(0.005 * sampleRate));
          } else {
            // Due before the voice's start (still queued): the note never plays.
            for (let r = 0; r < j; r++) if (q[r].type === 'on' && q[r].id === m.id) q[r].type = 'noop';
          }
        }
      } else if (m.type === 'allOff') {
        const step = 1 / Math.max(1, Math.round(0.01 * sampleRate));
        for (let i = 0; i < MAX_VOICES; i++) {
          const v = this.voices[i];
          if (v.active && v.fadeStep === 0) v.fadeStep = step;
        }
        j = 0;                                           // drop everything queued before it
      }
      if (keep) q[j++] = m;
    }
    q.length = j;
  }

  silenceAll() {
    for (let i = 0; i < MAX_VOICES; i++) {
      const v = this.voices[i];
      v.buf.fill(0);
      v.active = false;
      v.apX1 = 0; v.apY1 = 0; v.dcX1 = 0; v.dcY1 = 0;
    }
  }

  process(inputs, outputs, parameters) {
    const out = outputs[0];
    const ch0 = out[0];
    const n = ch0.length;                                // don't hard-code 128
    const blockStart = currentFrame;
    const damping = parameters.damping[0];
    const brightness = parameters.brightness[0];
    this.drain(blockStart + n, brightness, damping);
    ch0.fill(0);

    const S = damping < 0 ? 0 : damping > 1 ? 1 : damping;
    for (let vi = 0; vi < MAX_VOICES; vi++) {
      const v = this.voices[vi];
      if (!v.active) continue;
      const d = v.P - S - v.M;
      v.C = (1 - d) / (1 + d);
      const buf = v.buf, N = v.N, C = v.C;
      const i0 = v.startFrame > blockStart ? v.startFrame - blockStart : 0;
      for (let i = i0; i < n; i++) {
        if (!v.releasing && blockStart + i >= v.releaseFrame) v.releasing = true;
        const w = v.w;
        const r1 = w + 1 < N ? w + 1 : 0;              // x[n−M]
        const avg = v.rho * ((1 - S) * buf[r1] + S * buf[w]);  // buf[w] holds x[n−M−1]
        let ap = C * avg + v.apX1 - C * v.apY1;
        if (ap < 1e-20 && ap > -1e-20) ap = 0;
        v.apX1 = avg; v.apY1 = ap;
        buf[w] = ap;
        v.w = r1;
        let y = ap - v.dcX1 + 0.995 * v.dcY1;
        if (y < 1e-20 && y > -1e-20) y = 0;
        v.dcX1 = ap; v.dcY1 = y;
        if (v.fadeStep > 0) {
          v.fade -= v.fadeStep;
          if (v.fade <= 0) { v.active = false; break; }
        }
        const s = y * v.fade;
        if (!(s <= MAX_ABS && s >= -MAX_ABS)) {
          this.silenceAll();
          ch0.fill(0);
          if (!this.faulted) { this.port.postMessage({ type: 'fault' }); this.faulted = true; }
          return true;
        }
        ch0[i] += s;
        const ab = ap < 0 ? -ap : ap;
        if (ab > v.passPeak) v.passPeak = ab;
        if (r1 === 0) {                                  // one full pass round the loop
          if (v.releasing) v.rho *= 0.9;
          if (v.passPeak < 1e-6) { v.active = false; break; }
          v.passPeak = 0;
        }
      }
    }
    this.faulted = false;

    for (let c = 1; c < out.length; c++) out[c].set(ch0);
    return true;                                         // keep alive; node is long-lived
  }
}

registerProcessor('ks-processor', KSProcessor);
