// Recorder sink (recording.md). Never writes to outputs; buffers circulate through a pool
// transferred from the main thread, so process() constructs no typed arrays or objects.
// Messages in:  {type:'buffers', list} | {type:'start', atFrame, maxFrames} | {type:'stop', atFrame}
// Messages out: {type:'started', frame} | {type:'chunk', data, offset, frames, peak, clipped}
//               {type:'done', captured, requested, dropped, discontinuities, reason}
const IDLE = 0, ARMED = 1, RECORDING = 2, DONE = 3;

class RecorderProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const o = (options && options.processorOptions) || {};
    this.chunkFrames = o.chunkFrames || 8192;
    this.pool = new Array(o.poolCapacity || 32);
    this.poolSize = 0;
    this.cur = null;
    this.fill = 0;
    this.chunkOffset = 0;
    this.state = IDLE;
    this.startFrame = 0;
    this.stopFrame = Number.MAX_SAFE_INTEGER;
    this.maxFrames = 0;
    this.captured = 0;
    this.dropped = 0;
    this.peak = 0;
    this.clipped = false;
    this.lastBlockEnd = -1;
    this.discontinuities = 0;
    this.chunkMsg = { type: 'chunk', data: null, offset: 0, frames: 0, peak: 0, clipped: false };
    this.transfer = [null];
    this.port.onmessage = (e) => this.onMessage(e.data);
  }

  onMessage(m) {
    if (m.type === 'buffers') {
      for (let i = 0; i < m.list.length && this.poolSize < this.pool.length; i++) {
        this.pool[this.poolSize++] = m.list[i];
      }
    } else if (m.type === 'start' && (this.state === IDLE || this.state === DONE)) {
      this.startFrame = m.atFrame;
      this.stopFrame = Number.MAX_SAFE_INTEGER;
      this.maxFrames = m.maxFrames;
      this.captured = 0;
      this.dropped = 0;
      this.discontinuities = 0;
      this.peak = 0;
      this.clipped = false;
      this.state = ARMED;
    } else if (m.type === 'stop' && (this.state === ARMED || this.state === RECORDING)) {
      this.stopFrame = m.atFrame;
    }
  }

  acquire() {
    if (this.poolSize === 0) return false;
    this.cur = this.pool[--this.poolSize];
    this.pool[this.poolSize] = null;
    this.fill = 0;
    this.chunkOffset = this.captured;
    return true;
  }

  flush() {
    const msg = this.chunkMsg;
    msg.data = this.cur;
    msg.offset = this.chunkOffset;
    msg.frames = this.fill;
    msg.peak = this.peak;
    msg.clipped = this.clipped;
    this.transfer[0] = this.cur.buffer;
    this.port.postMessage(msg, this.transfer);
    msg.data = null;
    this.transfer[0] = null;
    this.cur = null;
    this.fill = 0;
    this.peak = 0;
    this.clipped = false;
  }

  finish(reason) {
    if (this.cur !== null && this.fill > 0) this.flush();
    this.state = DONE;
    this.port.postMessage({
      type: 'done', captured: this.captured, dropped: this.dropped,
      requested: this.stopFrame - this.startFrame,
      discontinuities: this.discontinuities, reason,
    });
  }

  process(inputs, outputs) {
    const out = outputs[0];
    const n = out.length > 0 ? out[0].length : 128;   // block length; not hard-coded
    const blockStart = currentFrame;
    const blockEnd = blockStart + n;

    if (this.lastBlockEnd >= 0 && blockStart !== this.lastBlockEnd) this.discontinuities++;
    this.lastBlockEnd = blockEnd;

    if (this.state === ARMED && blockEnd > this.startFrame) {
      if (this.startFrame < blockStart) this.startFrame = blockStart;   // start message arrived late
      this.state = RECORDING;
      this.port.postMessage({ type: 'started', frame: this.startFrame });
    }
    if (this.state !== RECORDING) return true;

    const input = inputs[0];
    const L = input.length > 0 ? input[0] : null;
    const R = input.length > 1 ? input[1] : L;
    const i0 = this.startFrame > blockStart ? this.startFrame - blockStart : 0;
    let i1 = this.stopFrame < blockEnd ? Math.max(i0, this.stopFrame - blockStart) : n;
    const remaining = this.maxFrames - this.captured;
    if (i1 - i0 > remaining) i1 = i0 + remaining;

    const cf = this.chunkFrames;
    for (let i = i0; i < i1; i++) {
      if (this.cur === null && !this.acquire()) {
        this.dropped += i1 - i;
        this.captured += i1 - i;
        break;
      }
      const l = L !== null ? L[i] : 0;
      const r = R !== null ? R[i] : 0;
      const buf = this.cur;
      buf[this.fill] = l;
      buf[cf + this.fill] = r;
      const al = l < 0 ? -l : l, ar = r < 0 ? -r : r;
      const a = al > ar ? al : ar;
      if (a > this.peak) this.peak = a;
      if (a >= 1) this.clipped = true;
      this.fill++;
      this.captured++;
      if (this.fill === cf) this.flush();
    }

    if (this.captured >= this.maxFrames) this.finish('max-length');
    else if (blockEnd >= this.stopFrame) this.finish('stopped');
    return true;
  }
}

registerProcessor('recorder', RecorderProcessor);
