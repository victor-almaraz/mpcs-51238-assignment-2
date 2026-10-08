import test from 'node:test';
import assert from 'node:assert/strict';

import { LiveInput, LIVE_FLOOD_PER_SEC } from '../src/live/input.js';
import { fakeInst } from './fakes.js';

/**
 * Builds a LiveInput with fake targets, a fake context and a manual ms clock.
 * Default targets: A armed+audible, B armed+audible, M armed but not audible, U not armed.
 */
function setup({ targets } = {}) {
  const A = fakeInst('A'), B = fakeInst('B'), M = fakeInst('M'), U = fakeInst('U');
  const list = targets ?? [
    { armed: true, audible: true, inst: A },
    { armed: true, audible: true, inst: B },
    { armed: true, audible: false, inst: M },
    { armed: false, audible: true, inst: U },
  ];
  const ctx = { currentTime: 1 };
  const clock = { ms: 0 };
  const stats = { noTarget: 0 };
  const live = new LiveInput({
    getContext: () => ctx,
    getTargets: () => list,
    onNoTarget: () => { stats.noTarget++; },
    now: () => clock.ms,
  });
  return { live, ctx, clock, stats, A, B, M, U, list };
}

test('flood limit constant is 200', () => {
  assert.equal(LIVE_FLOOD_PER_SEC, 200);
});

test('liveOn starts one voice on each armed, audible widget at ctx.currentTime', () => {
  const { live, A, B, M, U, stats } = setup();
  live.liveOn(60, 100);
  assert.deepEqual(A.ons, [[60, 100, 1, 'live']]);
  assert.deepEqual(B.ons, [[60, 100, 1, 'live']]);
  assert.deepEqual(M.ons, []);   // armed but muted/not soloed
  assert.deepEqual(U.ons, []);   // not armed
  assert.equal(live.heldCount, 1);
  assert.equal(stats.noTarget, 0);
});

test('liveOff releases on every armed widget (including non-audible), not on unarmed ones', () => {
  const { live, ctx, A, B, M, U } = setup();
  live.liveOn(60, 100);
  ctx.currentTime = 1.5;
  live.liveOff(60);
  assert.deepEqual(A.offs, [[60, 1.5, 'live']]);
  assert.deepEqual(B.offs, [[60, 1.5, 'live']]);
  assert.deepEqual(M.offs, [[60, 1.5, 'live']]);   // harmless: M has no matching voice
  assert.deepEqual(U.offs, []);
  assert.equal(live.heldCount, 0);
});

test('liveOff for a pitch that is not held does nothing', () => {
  const { live, A } = setup();
  live.liveOff(60);
  live.liveOn(60, 100);
  live.liveOff(61);
  assert.deepEqual(A.offs, []);
  assert.equal(live.heldCount, 1);
});

test('null targets and targets without an instrument are skipped', () => {
  const A = fakeInst('A');
  const { live, stats } = setup({ targets: [null, { armed: true, audible: true, inst: null }, { armed: true, audible: true, inst: A }] });
  live.liveOn(60, 90);
  live.liveOff(60);
  assert.deepEqual(A.ons, [[60, 90, 1, 'live']]);
  assert.deepEqual(A.offs, [[60, 1, 'live']]);
  assert.equal(stats.noTarget, 0);
});

test('sustain defers releases until the pedal is lifted', () => {
  const { live, ctx, A } = setup();
  live.setSustain(true);
  live.liveOn(60, 100);
  live.liveOff(60);
  assert.deepEqual(A.offs, []);
  assert.equal(live.heldCount, 1);
  ctx.currentTime = 3;
  live.setSustain(false);
  assert.deepEqual(A.offs, [[60, 3, 'live']]);
  assert.equal(live.heldCount, 0);
  live.liveOff(60);                    // already released
  assert.equal(A.offs.length, 1);
});

test('sustain: a key still held when the pedal lifts keeps sounding', () => {
  const { live, A } = setup();
  live.setSustain(true);
  live.liveOn(60, 100);
  live.setSustain(false);
  assert.deepEqual(A.offs, []);
  live.liveOff(60);
  assert.equal(A.offs.length, 1);
});

test('sustain: re-striking a pitch while the pedal is down releases both voices on pedal up', () => {
  const { live, A } = setup();
  live.setSustain(true);
  live.liveOn(60, 100);
  live.liveOff(60);
  live.liveOn(60, 100);
  live.liveOff(60);
  assert.equal(A.ons.length, 2);
  assert.equal(A.offs.length, 0);
  live.setSustain(false);
  assert.deepEqual(A.offs.map((o) => o[0]), [60, 60]);
  assert.equal(live.heldCount, 0);
});

test('two sources holding one pitch need two releases', () => {
  const { live, A } = setup();
  live.liveOn(60, 100);   // e.g. MIDI
  live.liveOn(60, 80);    // e.g. computer keyboard
  assert.equal(A.ons.length, 2);
  assert.equal(live.heldCount, 2);
  live.liveOff(60);
  assert.equal(A.offs.length, 1);
  assert.equal(live.heldCount, 1);
  live.liveOff(60);
  assert.equal(A.offs.length, 2);
  assert.equal(live.heldCount, 0);
  live.liveOff(60);
  assert.equal(A.offs.length, 2);
});

test('liveAllOff releases every held voice, including sustained ones, and lifts the pedal', () => {
  const { live, ctx, A, U } = setup();
  live.liveOn(60, 100);
  live.liveOn(60, 100);
  live.liveOn(64, 100);
  live.setSustain(true);
  live.liveOff(64);
  ctx.currentTime = 2;
  live.liveAllOff();
  assert.deepEqual(A.offs, [[60, 2, 'live'], [60, 2, 'live'], [64, 2, 'live']]);
  assert.deepEqual(U.offs, []);
  assert.equal(live.heldCount, 0);
  assert.equal(live.sustain, false);
  live.setSustain(false);   // nothing deferred is left
  live.liveOff(64);
  assert.equal(A.offs.length, 3);
});

test('flood limit: at most 200 note-ons per second; the 201st is dropped', () => {
  const { live, clock, A } = setup();
  for (let i = 0; i < 200; i++) live.liveOn(60, 100);
  assert.equal(A.ons.length, 200);
  live.liveOn(61, 100);
  assert.equal(A.ons.length, 200);
  clock.ms = 999;
  live.liveOn(61, 100);
  assert.equal(A.ons.length, 200);
  assert.equal(live.heldCount, 200);   // dropped notes are not held
  clock.ms = 1000;
  live.liveOn(62, 100);
  assert.equal(A.ons.length, 201);
  assert.deepEqual(A.ons[200], [62, 100, 1, 'live']);
});

test('flood limit: a dropped note-on\'s note-off is ignored', () => {
  const { live, A } = setup();
  for (let i = 0; i < 200; i++) live.liveOn(60, 100);
  live.liveOn(61, 100);   // dropped
  live.liveOff(61);
  assert.deepEqual(A.offs, []);
});

test('flood limit uses a rolling one-second window', () => {
  const { live, clock, A } = setup();
  for (let i = 0; i < 100; i++) live.liveOn(60, 100);
  clock.ms = 500;
  for (let i = 0; i < 100; i++) live.liveOn(60, 100);
  assert.equal(A.ons.length, 200);
  clock.ms = 999;
  live.liveOn(60, 100);
  assert.equal(A.ons.length, 200);
  clock.ms = 1000;                     // the 100 from t = 0 have expired
  for (let i = 0; i < 101; i++) live.liveOn(60, 100);
  assert.equal(A.ons.length, 300);
  clock.ms = 1500;                     // the 100 from t = 500 have expired
  live.liveOn(60, 100);
  assert.equal(A.ons.length, 301);
});

test('flood limit counts note-ons even with no armed widget; dropped ones do not call onNoTarget', () => {
  const { live, stats } = setup({ targets: [] });
  for (let i = 0; i < 201; i++) live.liveOn(60, 100);
  assert.equal(stats.noTarget, 200);
});

test('disarm calls noteOff once per held live voice on that instrument only', () => {
  const { live, ctx, A, B } = setup();
  live.liveOn(60, 100);
  live.liveOn(60, 100);
  live.liveOn(64, 100);
  ctx.currentTime = 4;
  live.disarm(A);
  assert.deepEqual(A.offs, [[60, 4, 'live'], [60, 4, 'live'], [64, 4, 'live']]);
  assert.deepEqual(B.offs, []);
  assert.equal(live.heldCount, 3);   // the keys are still physically held
  assert.doesNotThrow(() => live.disarm(null));
});

test('onNoTarget fires when a note-on finds no armed widget', () => {
  const U = fakeInst('U');
  const none = setup({ targets: [] });
  none.live.liveOn(60, 100);
  assert.equal(none.stats.noTarget, 1);

  const unarmed = setup({ targets: [{ armed: false, audible: true, inst: U }] });
  unarmed.live.liveOn(60, 100);
  unarmed.live.liveOn(62, 100);
  assert.equal(unarmed.stats.noTarget, 2);
  assert.deepEqual(U.ons, []);

  const M = fakeInst('M');
  const mutedOnly = setup({ targets: [{ armed: true, audible: false, inst: M }] });
  mutedOnly.live.liveOn(60, 100);
  assert.equal(mutedOnly.stats.noTarget, 0);   // armed, even though not audible
});

test('nothing happens while there is no AudioContext', () => {
  const A = fakeInst('A');
  let noTarget = 0;
  const live = new LiveInput({
    getContext: () => null,
    getTargets: () => [{ armed: true, audible: true, inst: A }],
    onNoTarget: () => { noTarget++; },
    now: () => 0,
  });
  live.liveOn(60, 100);
  live.liveOff(60);
  live.disarm(A);
  assert.deepEqual(A.ons, []);
  assert.deepEqual(A.offs, []);
  assert.equal(live.heldCount, 0);
  assert.equal(noTarget, 0);
});
