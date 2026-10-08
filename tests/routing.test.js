import test from 'node:test';
import assert from 'node:assert/strict';

import { partKey, anySolo, isAudible, dispatch } from '../src/playback/routing.js';
import { fakeInst } from './fakes.js';

const note = (extra = {}) => ({ start: 0, duration: 0.5, pitch: 60, velocity: 90, track: 0, channel: 0, ...extra });

function target(id, extra = {}) {
  return { id, part: 'all', muted: false, solo: false, inst: fakeInst(id), ...extra };
}

const played = (targets) => targets.filter((w) => w.inst && w.inst.ons.length > 0).map((w) => w.id);

test('partKey is t<track>c<channel>', () => {
  assert.equal(partKey({ track: 0, channel: 0 }), 't0c0');
  assert.equal(partKey({ track: 2, channel: 9 }), 't2c9');
});

test('anySolo and isAudible (mute wins over solo)', () => {
  assert.equal(anySolo([{ solo: false }, { solo: true }]), true);
  assert.equal(anySolo([{ solo: false }, {}]), false);
  assert.equal(anySolo([]), false);

  assert.equal(isAudible({ muted: false, solo: false }, false), true);
  assert.equal(isAudible({ muted: true, solo: false }, false), false);
  assert.equal(isAudible({ muted: false, solo: false }, true), false);
  assert.equal(isAudible({ muted: false, solo: true }, true), true);
  assert.equal(isAudible({ muted: true, solo: true }, true), false);
});

test('dispatch: noteOn at t and noteOff at t + duration with the file source tag', () => {
  const a = target('a');
  dispatch([a], note(), 2);
  assert.deepEqual(a.inst.ons, [[60, 90, 2, 'file']]);
  assert.deepEqual(a.inst.offs, [[60, 2.5, 'file']]);
});

test('dispatch: widgets on "all" or on the note\'s part key play it', () => {
  const targets = [target('all'), target('own', { part: 't1c3' }), target('other', { part: 't0c0' })];
  dispatch(targets, note({ track: 1, channel: 3 }), 0);
  assert.deepEqual(played(targets), ['all', 'own']);
});

test('dispatch: muted widgets are skipped', () => {
  const targets = [target('a', { muted: true }), target('b')];
  dispatch(targets, note(), 0);
  assert.deepEqual(played(targets), ['b']);
  assert.equal(targets[0].inst.offs.length, 0);
});

test('dispatch: when any widget is soloed only soloed widgets play', () => {
  const targets = [target('a', { solo: true }), target('b'), target('c', { solo: true, part: 't5c0' })];
  dispatch(targets, note(), 0);
  assert.deepEqual(played(targets), ['a']);
});

test('dispatch: mute wins over solo on the same widget', () => {
  const targets = [target('a', { solo: true, muted: true }), target('b')];
  dispatch(targets, note(), 0);
  assert.deepEqual(played(targets), []);   // solo is active, so b is silent; a is muted
});

test('dispatch: a boolean `audible` flag overrides mute/solo', () => {
  const targets = [
    target('forcedOn', { muted: true, audible: true }),
    target('forcedOff', { audible: false }),
    target('soloed', { solo: true }),
    target('plain'),
  ];
  dispatch(targets, note(), 0);
  assert.deepEqual(played(targets), ['forcedOn', 'soloed']);
});

test('dispatch: an audible widget on another part is still skipped', () => {
  const targets = [target('a', { audible: true, part: 't1c0' })];
  dispatch(targets, note(), 0);
  assert.deepEqual(played(targets), []);
});

test('dispatch: targets without an instrument are skipped', () => {
  const targets = [{ id: 'x', part: 'all', muted: false, solo: false, inst: null }, target('b')];
  assert.doesNotThrow(() => dispatch(targets, note(), 0));
  assert.deepEqual(played(targets), ['b']);
  assert.doesNotThrow(() => dispatch([], note(), 0));
});
