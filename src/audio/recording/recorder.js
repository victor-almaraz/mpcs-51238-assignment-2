// LiveRecorder (recording.md): wires the 'recorder' AudioWorkletNode as a parallel sink on the
// safety-limiter output, circulates the transfer buffer pool and collects chunks into a take.
//
// take = { sampleRate, frames, chunks: [{ offset, frames, data }], chunkFrames, dropped, reason }
// reason: 'stopped' | 'max-length' | 'interrupted' | 'error'
//
// The 'recorder' module must already be loaded on ctx (audioworklet.md). Nothing here touches
// browser globals at import time.

export const RECORD_MAX_SECONDS = 600;   // (project limit)
export const CHUNK_FRAMES = 8192;        // (project limit)
export const POOL_INITIAL = 12;          // (project limit)
export const DONE_TIMEOUT_MS = 500;      // (project limit)
const POOL_CAPACITY = 32;                // (project limit) worklet-side stack capacity

export class LiveRecorder {
  /**
   * @param ctx         AudioContext
   * @param limiterOut  safety-limiter output node
   * @param opts        { onChunk(peak, clipped) } — called for every received chunk (UI peak display)
   */
  constructor(ctx, limiterOut, opts = {}) {
    this.ctx = ctx;
    this.limiterOut = limiterOut;
    this.onChunk = typeof opts.onChunk === 'function' ? opts.onChunk : null;
    this.node = null;
    this.chunks = [];
    this.startFrame = 0;
    this.finish = null;          // resolver of the pending take
    this.abortReason = null;     // set by abort(); overrides the worklet's reason
    this.abortTimer = null;
    this.workletBusy = false;    // a 'start' was sent and its 'done' has not arrived
    this.stale = false;          // the node may still run an old take; replace it on next start
    this.lastPeak = 0;
    this.clipped = false;
    this.finalElapsed = 0;
    this.disposed = false;
    this.onStateChange = () => {
      if (this.finish && this.ctx.state !== 'running') this.abort('interrupted');
    };
    this.createNode();
  }

  get peak() { return this.lastPeak; }
  get hasClipped() { return this.clipped; }
  get startedAtFrame() { return this.startFrame; }
  get recording() { return this.finish !== null; }

  /** Seconds captured so far, clamped to [0, RECORD_MAX_SECONDS]. Frozen at the last take's length when idle. */
  elapsed() {
    if (!this.finish) return this.finalElapsed;
    const sr = this.ctx.sampleRate;
    const s = (this.ctx.currentTime * sr - this.startFrame) / sr;
    return s < 0 ? 0 : s > RECORD_MAX_SECONDS ? RECORD_MAX_SECONDS : s;
  }

  createNode() {
    const node = new AudioWorkletNode(this.ctx, 'recorder', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      channelCount: 2,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
      processorOptions: { chunkFrames: CHUNK_FRAMES, poolCapacity: POOL_CAPACITY },
    });
    this.limiterOut.connect(node);
    node.connect(this.ctx.destination);   // silent output; keeps the node in the rendered graph
    node.port.onmessage = (e) => this.onMessage(node, e.data);
    node.onprocessorerror = () => this.onProcessorError(node);
    this.node = node;
    this.workletBusy = false;
    this.stale = false;
    this.sendBuffers(POOL_INITIAL);
  }

  destroyNode() {
    const node = this.node;
    if (!node) return;
    this.node = null;
    node.port.onmessage = null;
    node.onprocessorerror = null;
    try { this.limiterOut.disconnect(node); } catch { /* already disconnected */ }
    try { node.disconnect(); } catch { /* already disconnected */ }
    try { node.port.close(); } catch { /* ignore */ }
  }

  sendBuffers(count) {
    if (!this.node) return;
    const list = [];
    const transfer = [];
    for (let i = 0; i < count; i++) {
      const b = new Float32Array(2 * CHUNK_FRAMES);
      list.push(b);
      transfer.push(b.buffer);
    }
    this.node.port.postMessage({ type: 'buffers', list }, transfer);
  }

  /** Starts a take at `atTime` (context seconds). Resolves with the take when it ends. */
  start(atTime) {
    if (this.disposed) return Promise.reject(new Error('recorder-disposed'));
    if (this.finish) return Promise.reject(new Error('already-recording'));
    // A node that may still be finishing an aborted take would ignore 'start'; use a fresh one.
    if (this.stale || this.workletBusy) {
      this.destroyNode();
      this.createNode();
    }
    const t = typeof atTime === 'number' && Number.isFinite(atTime) ? atTime : this.ctx.currentTime;
    const sr = this.ctx.sampleRate;
    this.chunks = [];
    this.clipped = false;
    this.lastPeak = 0;
    this.abortReason = null;
    this.finalElapsed = 0;
    this.startFrame = Math.round(Math.max(t, this.ctx.currentTime) * sr);
    const maxFrames = Math.round(RECORD_MAX_SECONDS * sr);
    const p = new Promise((resolve) => { this.finish = resolve; });
    this.ctx.addEventListener('statechange', this.onStateChange);
    this.workletBusy = true;
    this.node.port.postMessage({ type: 'start', atFrame: this.startFrame, maxFrames });
    if (this.ctx.state !== 'running') this.abort('interrupted');
    return p;
  }

  /** Requests the end of the take at `atTime` (default: now). The take resolves on the worklet's 'done'. */
  stop(atTime) {
    if (!this.node || !this.finish) return;
    const t = typeof atTime === 'number' && Number.isFinite(atTime) ? atTime : this.ctx.currentTime;
    this.node.port.postMessage({ type: 'stop', atFrame: Math.round(t * this.ctx.sampleRate) });
  }

  /** Finalizes from the chunks already received (context left 'running', or similar). */
  abort(reason = 'interrupted') {
    if (!this.finish || this.abortTimer !== null) return;
    this.abortReason = reason;
    this.stale = true;
    if (this.node) {
      this.node.port.postMessage({ type: 'stop', atFrame: Math.round(this.ctx.currentTime * this.ctx.sampleRate) });
    }
    this.abortTimer = setTimeout(() => {
      this.abortTimer = null;
      this.resolveFromChunks(reason);
    }, DONE_TIMEOUT_MS);
  }

  onMessage(node, m) {
    if (node !== this.node || !m) return;
    if (m.type === 'started') {
      if (this.finish) this.startFrame = m.frame;
    } else if (m.type === 'chunk') {
      if (this.finish) {
        this.chunks.push({ offset: m.offset, frames: m.frames, data: m.data });
        this.lastPeak = m.peak;
        if (m.clipped) this.clipped = true;
        this.sendBuffers(1);
        if (this.onChunk) this.onChunk(m.peak, m.clipped);
      } else {
        // Late chunk from an aborted take: recycle the buffer instead of allocating.
        node.port.postMessage({ type: 'buffers', list: [m.data] }, [m.data.buffer]);
      }
    } else if (m.type === 'done') {
      this.workletBusy = false;
      this.stale = false;
      if (!this.finish) return;
      const frames = Math.max(0, Math.min(m.captured, m.requested));
      this.resolve(frames, m.dropped, this.abortReason || m.reason);
    }
  }

  onProcessorError(node) {
    if (node !== this.node) return;
    this.stale = true;
    this.resolveFromChunks('error');
  }

  resolveFromChunks(reason) {
    let frames = 0;
    let covered = 0;
    for (const c of this.chunks) {
      const end = c.offset + c.frames;
      if (end > frames) frames = end;
      covered += c.frames;
    }
    this.resolve(frames, Math.max(0, frames - covered), reason);
  }

  resolve(frames, dropped, reason) {
    if (!this.finish) return;
    const done = this.finish;
    this.finish = null;
    if (this.abortTimer !== null) { clearTimeout(this.abortTimer); this.abortTimer = null; }
    this.ctx.removeEventListener('statechange', this.onStateChange);
    const sr = this.ctx.sampleRate;
    this.finalElapsed = Math.min(RECORD_MAX_SECONDS, frames / sr);
    const chunks = this.chunks;
    this.chunks = [];
    done({ sampleRate: sr, frames, chunks, chunkFrames: CHUNK_FRAMES, dropped, reason });
  }

  dispose() {
    if (this.disposed) return;
    if (this.finish) this.resolveFromChunks('interrupted');
    this.disposed = true;
    this.destroyNode();
  }
}
