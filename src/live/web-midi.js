// Web MIDI input (live-input.md). All inputs and all 16 channels feed the live layer.
// Inside the Connect MIDI Device gesture the caller runs ensureRunning() and requestMidiAccess()
// synchronously, then awaits connectMidi(request).

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
 * Starts the MIDI access request. Call it synchronously inside the user's click: Firefox
 * shows its permission prompt only during a user gesture, so any await before this call
 * loses the gesture and the request is denied. Returns the pending promise, or null when
 * Web MIDI is unsupported.
 */
export function requestMidiAccess() {
  if (!isMidiSupported()) return null;
  const request = navigator.requestMIDIAccess({ sysex: false });
  request.catch(() => {});             // handled by connectMidi; avoids an unhandled rejection meanwhile
  return request;
}

/**
 * Waits for a request from requestMidiAccess() and attaches every input. Resolves true on
 * success, false on failure. onStatus(text, title), onDisconnect(name), onError(message)
 */
export async function connectMidi(request, { live, onStatus, onDisconnect, onError } = {}) {
  const status = typeof onStatus === 'function' ? onStatus : () => {};
  const error = typeof onError === 'function' ? onError : () => {};
  if (!request) {
    error('Web MIDI is not supported in this browser');
    return false;
  }
  const onMidiMessage = createMidiHandler(live);
  const attach = (input) => { input.onmidimessage = onMidiMessage; };   // opens the port; idempotent
  const render = (access) => { const [text, title] = deviceStatus(access); status(text, title); };
  try {
    const access = await request;
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
  } catch (err) {
    // SecurityError / NotAllowedError: the user, a policy or the browser denied access. Firefox
    // reports a missing site permission and an absent device the same way (live-input.md).
    error(`MIDI access was blocked${err && err.name ? ` (${err.name})` : ''}`);
    return false;
  }
}
