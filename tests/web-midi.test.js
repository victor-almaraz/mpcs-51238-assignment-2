import test from 'node:test';
import assert from 'node:assert/strict';
import { requestMidiAccess, connectMidi } from '../src/live/web-midi.js';

/** Installs a fake navigator.requestMIDIAccess for one test; returns the call log. */
function fakeMidi(t, result) {
  const calls = [];
  Object.defineProperty(globalThis.navigator, 'requestMIDIAccess', {
    configurable: true,
    value: (opts) => { calls.push(opts); return result(); },
  });
  t.after(() => { delete globalThis.navigator.requestMIDIAccess; });
  return calls;
}

const live = { liveOn() {}, liveOff() {}, setSustain() {}, liveAllOff() {} };
const access = () => ({ inputs: new Map([['a', { name: 'Keys', state: 'connected' }]]) });

test('requestMidiAccess calls the browser synchronously (keeps the user gesture)', (t) => {
  const calls = fakeMidi(t, () => Promise.resolve(access()));
  const request = requestMidiAccess();
  assert.equal(calls.length, 1);                 // before any await
  assert.deepEqual(calls[0], { sysex: false });
  assert.ok(request instanceof Promise);
});

test('connectMidi attaches inputs from an earlier request and reports the device', async (t) => {
  fakeMidi(t, () => Promise.resolve(access()));
  let status = null;
  const ok = await connectMidi(requestMidiAccess(), { live, onStatus: (text) => { status = text; } });
  assert.equal(ok, true);
  assert.equal(status, 'Connected: Keys');
});

test('a denied request reports the error name', async (t) => {
  fakeMidi(t, () => Promise.reject(Object.assign(new Error('denied'), { name: 'NotAllowedError' })));
  let message = null;
  const ok = await connectMidi(requestMidiAccess(), { live, onError: (m) => { message = m; } });
  assert.equal(ok, false);
  assert.equal(message, 'MIDI access was blocked (NotAllowedError)');
});

test('without Web MIDI there is no request and connectMidi says so', async () => {
  assert.equal(requestMidiAccess(), null);
  let message = null;
  assert.equal(await connectMidi(null, { live, onError: (m) => { message = m; } }), false);
  assert.equal(message, 'Web MIDI is not supported in this browser');
});
