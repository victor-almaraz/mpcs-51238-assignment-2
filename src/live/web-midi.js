// Web MIDI input (live-input.md). All inputs and all 16 channels feed the live layer.
// The caller runs ensureRunning() inside the Connect MIDI device gesture before calling connectMidi().

export function isMidiSupported() {
  return typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
}

/** Status text for the device list: [text, title]. */
export function deviceStatus(access) {
  const names = [];
  access.inputs.forEach((input) => {
    if (input.state !== 'disconnected') names.push(input.name || 'Device');
  });
  if (names.length === 0) return ['No MIDI devices', ''];
  if (names.length === 1) return [`Connected: ${names[0]}`, names[0]];
  return [`${names.length} devices`, names.join(', ')];
}

/** Returns the message handler that maps raw MIDI bytes onto the live layer. */
export function createMidiHandler(live) {
  return (e) => {
    const d = e && e.data;
    if (!d || d.length === 0) return;
    const status = d[0];
    if (status >= 0xf0) return;                 // system messages: clock F8, active sensing FE, SysEx, etc.
    const type = status & 0xf0;
    if (type === 0x90 && d[2] > 0) { live.liveOn(d[1], d[2]); return; }
    if (type === 0x80 || (type === 0x90 && d[2] === 0)) { live.liveOff(d[1]); return; }
    if (type === 0xb0) {
      if (d[1] === 64) { live.setSustain(d[2] >= 64); return; }        // sustain pedal
      if (d[1] === 120 || d[1] === 123) { live.liveAllOff(); return; } // all sound off / all notes off
    }
    // pitch bend, aftertouch, program change and other CCs are ignored
  };
}

/**
 * Requests MIDI access and attaches every input. Resolves true on success, false on failure.
 * onStatus(text, title), onDisconnect(name), onError(message)
 */
export async function connectMidi({ live, onStatus, onDisconnect, onError } = {}) {
  const status = typeof onStatus === 'function' ? onStatus : () => {};
  const error = typeof onError === 'function' ? onError : () => {};
  if (!isMidiSupported()) {
    error('Web MIDI is not supported in this browser');
    return false;
  }
  const onMidiMessage = createMidiHandler(live);
  const attach = (input) => { input.onmidimessage = onMidiMessage; };   // opens the port; idempotent
  const render = (access) => { const [text, title] = deviceStatus(access); status(text, title); };
  try {
    const access = await navigator.requestMIDIAccess({ sysex: false });
    access.inputs.forEach(attach);
    access.onstatechange = (e) => {
      const port = e && e.port;
      if (!port || port.type !== 'input') return;
      if (port.state === 'connected') attach(port);
      else {
        live.liveAllOff();
        if (typeof onDisconnect === 'function') onDisconnect(port.name || 'Device');
      }
      render(access);
    };
    render(access);
    return true;
  } catch {
    // SecurityError / NotAllowedError: user or policy denied access
    error('MIDI access was blocked');
    return false;
  }
}
