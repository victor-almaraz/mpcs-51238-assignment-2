// The imperative audio session behind the synth UI: AudioContext lifecycle, engine sync,
// transport, live input, safety events, recording and offline render. React owns the rack
// state and calls setWidgets() after every change; the session reports back through
// `onUi(patch)`, `onMessage({ text, assertive, action })` and `onAlert({ key, tone, text })`.
//
// startAudio(), resumeAudio() and restartAudio() must be called synchronously inside a
// user-gesture handler: they create or resume the AudioContext before any await.

import { ensureRunning, getContext, onContextState, closeContext } from '../audio/context.js';
import { buildMasterBus, SAFETY } from '../audio/master-bus.js';
import { Engine, buildEngine } from '../audio/engine.js';
import { loadWorklets } from '../audio/worklet-loader.js';
import { GAIN_TAU, RISE_TAU } from '../audio/smoothing.js';
import { VOLUME, dbToGain } from '../audio/synths/param-defs.js';
import { LiveRecorder } from '../audio/recording/recorder.js';
import { takeToWavBlob } from '../audio/recording/wav.js';
import { downloadBlob, wavFilename } from '../audio/recording/download.js';
import { renderSongToWav, RENDER_MAX_SONG_SECONDS, DEFAULT_RENDER_RATE } from '../audio/recording/offline-render.js';
import { Transport, createOfflineScheduler } from '../playback/scheduler.js';
import { LiveInput } from '../live/input.js';
import { KeyboardInput } from '../live/keyboard.js';
import { connectMidi } from '../live/web-midi.js';

const SEED = 1;
const PATCH_SWAP_DELAY_MS = 30;   // patch load: outputs to 0, swap at t + 30 ms (audio-safety.md)
const PATCH_RAMP_IN_S = 0.1;      // then ramp back over 100 ms
const CEILING = Math.pow(10, SAFETY.ceilingDb / 20);

const toDb = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);

export class Session {
  constructor({ onUi, onMessage, onAlert }) {
    this.onUi = onUi;
    this.onMessage = onMessage;
    this.onAlert = onAlert;
    this.widgets = [];
    this.song = null;
    this.songName = null;
    this.masterDb = VOLUME.masterDefault;
    this.masterMuted = false;
    this.ctx = null;
    this.bus = null;
    this.engine = null;
    this.recorder = null;
    this.ready = null;
    this.audioState = 'idle';
    this.syncPending = false;
    this.rampIn = 0;
    this.noTargetShown = false;
    this.faultPending = false;
    this.lastFile = null;
    this.renderAbort = null;
    this.meterBuf = null;
    this.preBuf = null;

    this.transport = new Transport({
      getContext: () => this.ctx,
      getTargets: () => this.targets(),
      releaseAll: () => this.releaseAll(),
      onEnd: () => this.onUi({ playing: false }),
    });
    this.live = new LiveInput({
      getContext: () => (this.engine ? this.ctx : null),
      getTargets: () => this.targets(),
      onNoTarget: () => {
        if (this.noTargetShown) return;
        this.noTargetShown = true;
        this.message('No synth is armed for live input');
      },
    });
    this.keyboard = new KeyboardInput({
      live: this.live,
      onOctave: (label) => {
        this.onUi(this.octaveUi());
        this.message(`Octave ${label}`);
      },
    });

    this.onVisibility = () => {
      const hidden = document.visibilityState === 'hidden';
      this.transport.setHidden(hidden);
      if (hidden) {
        this.live.liveAllOff();
        // Granular grains: fill the longer hidden-tab window before timers get throttled.
        if (this.engine) this.engine.pump(this.ctx.currentTime + this.transport.lookahead);
      }
      if (!hidden) this.flushSync();
    };
    this.onBlur = () => this.live.liveAllOff();
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('blur', this.onBlur);
    this.unsubscribeState = onContextState((state) => this.onContextState(state));
  }

  dispose() {
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('blur', this.onBlur);
    this.unsubscribeState();
    this.keyboard.disable();
    this.transport.stop();
    this.renderAbort?.abort();
    this.recorder?.dispose();
    // The context outlives this session (client-side navigation), so fade the master out
    // before stopping voices, then detach this session's chain from the destination.
    const { engine, bus, ctx } = this;
    this.engine = null;
    if (!engine) return;
    engine.releaseAll();
    bus.master.linearTo(0, ctx.currentTime, 0.02);
    setTimeout(() => {
      engine.dispose();
      bus.mixBus.disconnect();
      bus.safetyOut.disconnect();
    }, 60);
  }

  // ----- reporting -----

  message(text, opts = {}) {
    this.onMessage({ text, assertive: opts.assertive === true, action: opts.action ?? null });
  }

  alert(key, text, tone = 'error') {
    this.onAlert({ key, tone, text });
  }

  setAudioState(audioState) {
    this.audioState = audioState;
    this.onUi({ audioState });
  }

  octaveUi() {
    return {
      octave: this.keyboard.octaveLabel,
      canOctaveDown: this.keyboard.canShift('down'),
      canOctaveUp: this.keyboard.canShift('up'),
    };
  }

  // ----- rack sync -----

  targets() {
    return this.engine ? this.engine.targets() : [];
  }

  /** Called after every rack change; applied once per animation frame (slider coalescing). */
  setWidgets(widgets) {
    this.widgets = widgets;
    if (this.syncPending) return;
    this.syncPending = true;
    requestAnimationFrame(() => this.flushSync());
    setTimeout(() => this.flushSync(), 100);   // rAF does not run in hidden tabs
  }

  flushSync() {
    if (!this.syncPending) return;
    this.syncPending = false;
    if (!this.engine) return;
    this.engine.sync(this.widgets, { rampIn: this.rampIn });
    this.rampIn = 0;
  }

  /** Disarming releases the widget's held live voices (live-input.md). */
  disarm(id) {
    const inst = this.engine?.get(id);
    if (inst) this.live.disarm(inst);
  }

  /**
   * Patch load (audio-safety.md): release everything, ramp outputs to 0, swap the rack
   * 30 ms later with `apply()`, and ramp the new widgets in over 100 ms. Never starts notes.
   */
  replaceRack(apply) {
    this.transport.stop();
    this.releaseAll();
    this.onUi({ playing: false });
    if (this.engine) {
      this.engine.fadeOutAll();
      setTimeout(() => {
        this.rampIn = PATCH_RAMP_IN_S;
        apply();
      }, PATCH_SWAP_DELAY_MS);
    } else {
      apply();
    }
  }

  // ----- audio lifecycle -----

  /** Creates or resumes the context (synchronously) and builds the engine once. */
  startAudio() {
    const running = ensureRunning();
    running.catch(() => this.markIfBlocked());
    if (this.ready) return this.ready;
    const ctx = getContext();
    this.setAudioState('starting');
    // Build against the context without waiting for resume(): when the browser blocks audio,
    // resume() can stay pending, and the UI must show the paused state instead of hanging.
    this.ready = (ctx ? this.buildLive(ctx) : running.then((c) => this.buildLive(c)))
      .then(
        () => true,
        (err) => {
          this.ready = null;
          this.setAudioState('error');
          this.alert('audio', `Audio could not start: ${err?.message || 'unknown error'}`);
          return false;
        },
      );
    return this.ready;
  }

  async buildLive(ctx) {
    const bus = await buildMasterBus(ctx, { realtime: true, masterGain: 0 });
    bus.setHandler((e) => this.onBusEvent(e));
    this.ctx = ctx;
    this.bus = bus;
    this.engine = new Engine(ctx, bus, {
      seed: SEED,
      realtime: true,
      lookahead: () => this.transport.lookahead,
      ks: bus.worklets.ks,
      onFault: () => this.onFault(),
      onError: () => this.onPluckError(),
    });
    this.engine.sync(this.widgets);
    this.syncPending = false;
    if (bus.worklets.recorder) {
      this.recorder = new LiveRecorder(ctx, bus.safetyOut, {
        onChunk: (peak, clipped) => this.onUi({ recPeakDb: toDb(peak), recClipped: clipped }),
      });
    }
    if (bus.meter) this.meterBuf = new Float32Array(bus.meter.fftSize);
    if (bus.preMeter) this.preBuf = new Float32Array(bus.preMeter.fftSize);
    // Reduced safety mode caps the master at −6 dB; clamp before the fade-in so the 50 ms
    // start ramp is not replaced by a later change.
    const maxMasterDb = bus.reduced ? Math.floor(toDb(bus.maxMaster) / VOLUME.step) * VOLUME.step : VOLUME.max;
    if (this.masterDb > maxMasterDb) this.masterDb = maxMasterDb;
    bus.fadeIn(this.masterTarget());
    this.onUi({
      audioState: 'running',
      reducedSafety: bus.reduced,
      maxMasterDb,
      masterDb: this.masterDb,
      caps: { ks: bus.worklets.ks, recorder: bus.worklets.recorder },
    });
    this.audioState = 'running';
    this.markIfBlocked();
    if (bus.reduced) this.message('Reduced safety mode: master volume limited to −6 dB');
  }

  /** "Audio is paused by the browser" when the context is not running after a start gesture. */
  markIfBlocked() {
    if (this.engine && this.ctx.state !== 'running' && this.audioState === 'running') this.setAudioState('paused');
  }

  resumeAudio() {
    ensureRunning();
  }

  /** After a safety-stage error: close the context and start a fresh one in this gesture. */
  restartAudio() {
    this.transport.stop();
    this.recorder?.dispose();
    this.recorder = null;
    this.engine?.dispose();
    this.engine = null;
    this.bus = null;
    this.ctx = null;
    this.ready = null;
    closeContext();
    this.onUi({ playing: false, ducked: false });
    return this.startAudio();
  }

  onContextState(state) {
    if (!this.engine) return;
    if (state === 'running') {
      if (this.audioState === 'paused') {
        this.bus.fadeIn(this.masterTarget());
        this.setAudioState('running');
      }
    } else if (state === 'suspended' || state === 'interrupted') {
      if (this.audioState === 'running') this.setAudioState('paused');
    }
  }

  onBusEvent(e) {
    if (e.type === 'fault') this.onFault();
    else if (e.type === 'duck') {
      this.onUi({ ducked: true });
      this.message('Level reduced — sustained loud output');
    } else if (e.type === 'error') {
      this.transport.stop();
      this.releaseAll();
      this.onUi({ playing: false });
      this.setAudioState('failed');
      this.message('Audio safety stage stopped. Restart Audio to continue.', { assertive: true });
    }
  }

  /**
   * Safety-stage or pluck fault: stop, fast-release everything, and rebuild the instruments
   * (clearing NaN filter/delay state) once the ~10 ms releases have finished, so disposal
   * never cuts a sounding voice. Repeated faults within the rebuild window are ignored.
   */
  onFault() {
    if (this.faultPending) return;
    this.faultPending = true;
    this.transport.stop();
    this.releaseAll();
    this.onUi({ playing: false });
    this.message('Audio fault — output muted and reset', { assertive: true });
    setTimeout(() => {
      this.faultPending = false;
      this.engine?.rebuild();
    }, 60);
  }

  /** A ks-processor exception leaves that node permanently silent, so only Pluck is rebuilt. */
  onPluckError() {
    this.alert('pluck', 'The pluck engine stopped with an error and was reset.');
    this.engine?.rebuild('pluck');
  }

  restoreLevel() {
    this.bus?.ack();
    this.onUi({ ducked: false });
  }

  // ----- master and safety -----

  masterTarget() {
    if (this.masterMuted) return 0;
    const max = this.bus ? this.bus.maxMaster : 1;
    return Math.min(dbToGain(this.masterDb), max);
  }

  setMaster(db) {
    this.masterDb = db;
    const patch = { masterDb: db };
    if (this.masterMuted) {
      this.masterMuted = false;
      patch.masterMuted = false;
    }
    this.onUi(patch);
    if (this.bus && this.audioState === 'running') {
      const target = this.masterTarget();
      this.bus.master.setTarget(target, this.ctx.currentTime, target > this.bus.master.target ? RISE_TAU : GAIN_TAU);
    }
  }

  releaseAll() {
    this.engine?.releaseAll();
    this.live.liveAllOff();
  }

  /** Stops the transport, releases every voice and ramps the master to 0 over 10 ms. */
  panic() {
    this.transport.stop();
    this.releaseAll();
    this.masterMuted = true;
    if (this.bus) this.bus.master.linearTo(0, this.ctx.currentTime, 0.01);
    this.onUi({ playing: false, masterMuted: true });
    this.message('Panic: sound stopped. Move the master volume to unmute.', { assertive: true });
  }

  /** Post-limiter peak/RMS and the pre-limiter limiting flag, read once per animation frame. */
  readMeters() {
    const bus = this.bus;
    if (!bus || !bus.meter || this.audioState !== 'running') return null;
    bus.meter.getFloatTimeDomainData(this.meterBuf);
    let peak = 0, sum = 0;
    for (let i = 0; i < this.meterBuf.length; i++) {
      const x = this.meterBuf[i];
      const a = x < 0 ? -x : x;
      if (a > peak) peak = a;
      sum += x * x;
    }
    let prePeak = 0;
    if (bus.preMeter) {
      bus.preMeter.getFloatTimeDomainData(this.preBuf);
      for (let i = 0; i < this.preBuf.length; i++) {
        const a = Math.abs(this.preBuf[i]);
        if (a > prePeak) prePeak = a;
      }
    }
    return { peakDb: toDb(peak), rmsDb: toDb(Math.sqrt(sum / this.meterBuf.length)), limiting: prePeak > CEILING };
  }

  // ----- transport -----

  setSong(song, name) {
    this.transport.setSong(song);
    this.song = song;
    this.songName = name;
    this.onUi({ playing: false });
  }

  async play() {
    const ok = await this.ready;
    if (!ok || !this.song || this.audioState !== 'running') return;
    this.transport.play();
    this.onUi({ playing: true });
  }

  stop() {
    this.transport.stop();
    this.onUi({ playing: false });
  }

  position() {
    return this.transport.currentSongTime();
  }

  // ----- live input -----

  setKeyboard(on) {
    if (on) this.keyboard.enable();
    else this.keyboard.disable();
    this.onUi({ keyboardOn: on, ...this.octaveUi() });
  }

  shiftOctave(dir) {
    this.keyboard.shiftOctave(dir);
  }

  async connectMidi() {
    const ok = await this.ready;
    if (!ok) return;
    const granted = await connectMidi({
      live: this.live,
      onStatus: (text, title) => this.onUi({ midiStatus: { text, title } }),
      onDisconnect: (name) => this.message(`${name} disconnected`),
      onError: (msg) => this.alert('midi-access', msg),
    });
    if (granted) this.onAlert({ key: 'midi-access', text: null });
  }

  // ----- recording -----

  startRecording(format) {
    if (!this.recorder || this.recorder.recording) return;
    this.recFormat = format;
    this.onUi({ recState: 'recording', recPeakDb: -Infinity, recClipped: false });
    this.message('Recording');
    this.recorder.start().then((take) => this.finishTake(take));
  }

  stopRecording() {
    this.recorder?.stop();
  }

  recordElapsed() {
    return this.recorder && this.recorder.recording ? this.recorder.elapsed() : 0;
  }

  finishTake(take) {
    this.onUi({ recState: 'saving' });
    this.message('Saving WAV…');
    setTimeout(() => {
      try {
        const blob = takeToWavBlob(take, this.recFormat);
        const filename = wavFilename('live', take.sampleRate, this.recFormat);
        this.offerDownload(blob, filename);
        const text = take.reason === 'max-length'
          ? 'Recording stopped at the 10:00 limit. Download started.'
          : take.reason === 'interrupted'
            ? 'Recording stopped: audio was interrupted. Captured audio was saved.'
            : take.reason === 'error'
              ? `Recording stopped by an error. Captured audio was saved: ${filename}`
              : `Download started: ${filename}`;
        this.message(text, { action: 'download-again' });
      } catch (err) {
        this.message(err instanceof RangeError ? 'Not enough memory to create the WAV file.' : `Couldn't save the recording: ${err.message}`);
      }
      this.onUi({ recState: 'idle' });
    }, 0);
  }

  offerDownload(blob, filename) {
    this.lastFile = { blob, filename };
    downloadBlob(blob, filename);
  }

  downloadAgain() {
    if (this.lastFile) downloadBlob(this.lastFile.blob, this.lastFile.filename);
  }

  // ----- offline render -----

  async renderWav(format) {
    const song = this.song;
    if (!song || this.renderAbort || this.masterMuted) return;   // after Panic: unmute first
    if (song.durationSeconds > RENDER_MAX_SONG_SECONDS) {
      this.message('Songs longer than 10:00 cannot be rendered.');
      return;
    }
    const abort = new AbortController();
    this.renderAbort = abort;
    const sampleRate = this.ctx ? this.ctx.sampleRate : DEFAULT_RENDER_RATE;
    const widgets = this.widgets;
    const masterGain = dbToGain(this.masterDb);
    this.onUi({ renderState: 'rendering', renderProgress: 0 });
    this.message('Rendering…');
    const deps = {
      loadWorklets,
      buildEngine: (ctx, seed) => buildEngine(ctx, seed, widgets, { masterGain }),
      createOfflineScheduler: (ctx, engine) => createOfflineScheduler(ctx, song, engine),
    };
    const onProgress = (f) => {
      if (f === 1) this.onUi({ renderState: 'saving', renderProgress: 100 });
      else this.onUi({ renderProgress: f === null ? null : Math.round(f * 100) });
    };
    try {
      const blob = await renderSongToWav(song.durationSeconds, deps, { sampleRate, format, dither: true, seed: SEED }, onProgress, abort.signal);
      const filename = wavFilename('render', sampleRate, format, this.songName ?? undefined);
      this.offerDownload(blob, filename);
      this.message(`Download started: ${filename}`, { action: 'download-again' });
    } catch (err) {
      if (err?.name === 'AbortError') this.message('Render cancelled.');
      else if (err?.message === 'song-too-long') this.message('Songs longer than 10:00 cannot be rendered.');
      else if (err instanceof RangeError || err?.name === 'NotSupportedError') this.message('Not enough memory to create the WAV file.');
      else this.alert('render', `Couldn't render the song: ${err?.message || 'unknown error'}`);
    } finally {
      this.renderAbort = null;
      this.onUi({ renderState: 'idle', renderProgress: null });
    }
  }

  cancelRender() {
    this.renderAbort?.abort();
  }
}
