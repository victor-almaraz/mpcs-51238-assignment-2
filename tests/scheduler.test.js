import test from 'node:test';
import assert from 'node:assert/strict';

import {
  Transport, createOfflineScheduler, lowerBound,
  INTERVAL_MS, LOOKAHEAD_VISIBLE, LOOKAHEAD_HIDDEN, START_OFFSET, LATE_TOLERANCE,
} from '../src/playback/scheduler.js';
import { close, fakeInst, installFakeTimers } from './fakes.js';

function note(start, pitch = 60, { duration = 0.25, velocity = 100, track = 0, channel = 0 } = {}) {
  return { start, duration, pitch, velocity, track, channel };
}

/** Transport over one 'all' widget, a fake context at `now` and counters for the callbacks. */
function setup(notes, { durationSeconds, now = 10 } = {}) {
  const ctx = { currentTime: now };
  const inst = fakeInst();
  const targets = [{ id: 'a', part: 'all', muted: false, solo: false, inst }];
  const stats = { releases: 0, ends: 0, getTargets: 0 };
  const tr = new Transport({
    getContext: () => ctx,
    getTargets: () => { stats.getTargets++; return targets; },
    releaseAll: () => { stats.releases++; },
    onEnd: () => { stats.ends++; },
  });
  tr.setSong({ notes, durationSeconds });
  return { ctx, inst, tr, stats };
}

/** Runs `fn(timers)` with setInterval/clearInterval stubbed; restores them afterwards. */
function withTimers(fn) {
  return () => {
    const timers = installFakeTimers();
    try { fn(timers); } finally { timers.restore(); }
  };
}

const pitches = (calls) => calls.map((c) => c[0]);

test('constants match midi-playback-scheduling.md', () => {
  assert.equal(INTERVAL_MS, 25);
  assert.equal(LOOKAHEAD_VISIBLE, 0.1);
  assert.equal(LOOKAHEAD_HIDDEN, 1.5);
  assert.equal(START_OFFSET, 0.05);
  assert.equal(LATE_TOLERANCE, 0.005);
});

test('lowerBound returns the first index with start >= t', () => {
  const notes = [note(0), note(1), note(1), note(2)];
  assert.equal(lowerBound(notes, -1), 0);
  assert.equal(lowerBound(notes, 0), 0);
  assert.equal(lowerBound(notes, 1), 1);
  assert.equal(lowerBound(notes, 1.5), 3);
  assert.equal(lowerBound(notes, 5), 4);
  assert.equal(lowerBound([], 1), 0);
});

test('duration comes from durationSeconds, else the last note end', () => {
  assert.equal(setup([note(0)], { durationSeconds: 5 }).tr.duration, 5);
  assert.equal(setup([note(0, 60, { duration: 0.5 }), note(1, 62, { duration: 2 })]).tr.duration, 3);
  assert.equal(setup([note(0)], { durationSeconds: -1 }).tr.duration, 0);
});

test('play schedules notes inside the lookahead at songStartCtxTime + start, with a 50 ms offset', withTimers((timers) => {
  const { ctx, inst, tr } = setup([note(0, 60), note(0.04, 62), note(0.2, 64), note(1.0, 65)], { durationSeconds: 2 });
  tr.play();
  assert.equal(tr.playing, true);
  assert.equal(timers.timers.size, 1);
  assert.equal([...timers.timers.values()][0].ms, 25);
  assert.equal(tr.lookahead, 0.1);

  assert.deepEqual(pitches(inst.ons), [60, 62]);   // 10.05 and 10.09 ≤ 10.1; 10.25 is beyond
  close(inst.ons[0][2], 10.05);
  close(inst.ons[1][2], 10.09);
  assert.equal(inst.ons[0][1], 100);
  assert.equal(inst.ons[0][3], 'file');

  ctx.currentTime = 10.2;
  timers.fire();
  assert.deepEqual(pitches(inst.ons), [60, 62, 64]);
  close(inst.ons[2][2], 10.25);
}));

test('noteOff is dispatched with the noteOn at t + duration', withTimers(() => {
  const { inst, tr } = setup([note(0, 60, { duration: 1.5, velocity: 77 })], { durationSeconds: 2 });
  tr.play();
  assert.equal(inst.ons.length, 1);
  assert.equal(inst.offs.length, 1);
  assert.equal(inst.ons[0][1], 77);
  close(inst.offs[0][1], 11.55);
  assert.equal(inst.offs[0][0], 60);
  assert.equal(inst.offs[0][2], 'file');
}));

test('notes later than 5 ms are skipped, not played in a burst', withTimers((timers) => {
  const { ctx, inst, tr } = setup([note(0, 60), note(0.2, 64), note(1.0, 65), note(1.5, 67)], { durationSeconds: 3 });
  tr.play();
  assert.deepEqual(pitches(inst.ons), [60]);
  ctx.currentTime = 11.2;            // the notes at 10.25 and 11.05 are now late
  timers.fire();
  assert.deepEqual(pitches(inst.ons), [60]);
  assert.equal(inst.offs.length, 1);
  ctx.currentTime = 11.5;            // the note at 11.55 is inside the window
  timers.fire();
  assert.deepEqual(pitches(inst.ons), [60, 67]);
}));

test('a note late by less than 5 ms plays at the current time', withTimers((timers) => {
  const { ctx, inst, tr } = setup([note(0, 60), note(0.2, 64)], { durationSeconds: 2 });
  tr.play();
  ctx.currentTime = 10.254;          // note due at 10.25
  timers.fire();
  assert.deepEqual(pitches(inst.ons), [60, 64]);
  close(inst.ons[1][2], 10.254);
  close(inst.offs[1][1], 10.254 + 0.25);
}));

test('stop releases all voices, clears the timer and resets the position', withTimers((timers) => {
  const { ctx, tr, stats } = setup([note(0), note(1)], { durationSeconds: 2 });
  tr.play();
  ctx.currentTime = 10.55;
  tr.stop();
  assert.equal(stats.releases, 1);
  assert.equal(tr.playing, false);
  assert.equal(timers.timers.size, 0);
  assert.equal(timers.cleared.length, 1);
  assert.equal(tr.position, 0);
  assert.equal(tr.currentSongTime(), 0);
  tr.stop();                         // already stopped: nothing to release
  assert.equal(stats.releases, 1);
}));

test('pause releases all voices and keeps the position; play resumes from it', withTimers((timers) => {
  const { ctx, inst, tr, stats } = setup([note(0, 60), note(0.3, 62), note(0.52, 64), note(0.7, 65)], { durationSeconds: 2 });
  tr.play();
  ctx.currentTime = 10.3;
  timers.fire();                     // note 0.3 at 10.35
  assert.deepEqual(pitches(inst.ons), [60, 62]);
  ctx.currentTime = 10.55;
  tr.pause();
  assert.equal(stats.releases, 1);
  assert.equal(tr.playing, false);
  assert.equal(timers.timers.size, 0);
  close(tr.position, 0.5);
  ctx.currentTime = 20;
  close(tr.currentSongTime(), 0.5);  // does not advance while paused

  tr.play();                         // songStartCtxTime 20.05, songOffset 0.5
  assert.deepEqual(pitches(inst.ons), [60, 62, 64]);
  close(inst.ons[2][2], 20.05 + 0.02);
  ctx.currentTime = 20.2;
  timers.fire();
  assert.deepEqual(pitches(inst.ons), [60, 62, 64, 65]);
  close(inst.ons[3][2], 20.25);
}));

test('seek while playing restarts at the new position without re-triggering earlier notes', withTimers((timers) => {
  const { ctx, inst, tr, stats } = setup([note(0, 60, { duration: 3 }), note(1.5, 62), note(2.0, 64)], { durationSeconds: 4 });
  tr.play();
  ctx.currentTime = 10.5;
  timers.fire();
  assert.deepEqual(pitches(inst.ons), [60]);

  tr.seek(1.2);                      // the note at 0 is still sounding at 1.2: not re-triggered
  assert.equal(stats.releases, 1);
  assert.equal(tr.playing, true);
  assert.equal(timers.cleared.length, 1);
  assert.equal(timers.timers.size, 1);
  assert.deepEqual(pitches(inst.ons), [60]);
  close(tr.currentSongTime(), 1.2);

  ctx.currentTime = 10.8;            // 1.5 plays at 10.55 + 0.3 = 10.85
  timers.fire();
  assert.deepEqual(pitches(inst.ons), [60, 62]);
  close(inst.ons[1][2], 10.85);
  ctx.currentTime = 11.3;
  timers.fire();
  assert.deepEqual(pitches(inst.ons), [60, 62, 64]);
  close(inst.ons[2][2], 11.35);
}));

test('seek while paused only moves the position (clamped to [0, duration])', withTimers((timers) => {
  const { inst, tr, stats } = setup([note(0, 60), note(1, 62)], { durationSeconds: 2 });
  tr.seek(0.98);
  assert.equal(tr.position, 0.98);
  assert.equal(tr.playing, false);
  assert.equal(stats.releases, 0);
  assert.equal(timers.timers.size, 0);
  tr.play();                         // note at 1 is at 10.05 + 0.02
  assert.deepEqual(pitches(inst.ons), [62]);
  close(inst.ons[0][2], 10.07);
  tr.stop();

  tr.seek(-5);
  assert.equal(tr.position, 0);
  tr.seek(99);
  assert.equal(tr.position, 2);
  tr.seek(NaN);
  assert.equal(tr.position, 0);
}));

test('play at the end of the song starts again from 0', withTimers(() => {
  const { inst, tr } = setup([note(0, 60)], { durationSeconds: 1 });
  tr.seek(1);
  tr.play();
  assert.deepEqual(pitches(inst.ons), [60]);
}));

test('seek to the end while playing finishes instead of replaying from the start', withTimers((timers) => {
  const { ctx, inst, tr, stats } = setup([note(0, 60), note(1, 62)], { durationSeconds: 2 });
  tr.play();
  ctx.currentTime = 10.5;
  timers.fire();
  tr.seek(2);
  assert.deepEqual(pitches(inst.ons), [60]);   // the note at 0 is not played again
  ctx.currentTime = 10.6;
  timers.fire();
  assert.deepEqual(pitches(inst.ons), [60]);
  assert.equal(stats.ends, 1);
  assert.equal(tr.playing, false);
}));

test('end of song calls onEnd without releaseAll and resets the position', withTimers((timers) => {
  const { ctx, inst, tr, stats } = setup([note(0, 60)], { durationSeconds: 0.5 });
  tr.play();
  ctx.currentTime = 10.5;            // end is at 10.55
  timers.fire();
  assert.equal(stats.ends, 0);
  assert.equal(tr.playing, true);
  ctx.currentTime = 10.6;
  timers.fire();
  assert.equal(stats.ends, 1);
  assert.equal(stats.releases, 0);   // release tails ring out
  assert.equal(tr.playing, false);
  assert.equal(timers.timers.size, 0);
  assert.equal(tr.position, 0);

  tr.play();                         // plays again from the start
  assert.deepEqual(pitches(inst.ons), [60, 60]);
}));

test('setHidden(true) raises the lookahead to 1.5 s and ticks at once while playing', withTimers(() => {
  const { inst, tr } = setup([note(0, 60), note(0.5, 62), note(1.0, 64), note(1.4, 65), note(1.6, 67)], { durationSeconds: 3 });
  tr.play();
  assert.deepEqual(pitches(inst.ons), [60]);
  tr.setHidden(true);
  assert.equal(tr.lookahead, 1.5);
  assert.deepEqual(pitches(inst.ons), [60, 62, 64, 65]);   // up to 10 + 1.5; 1.6 → 11.65 is beyond
  tr.setHidden(false);
  assert.equal(tr.lookahead, 0.1);
  assert.equal(inst.ons.length, 4);
}));

test('setHidden(true) while stopped only changes the lookahead', withTimers((timers) => {
  const { inst, tr, stats } = setup([note(0, 60)], { durationSeconds: 1 });
  tr.setHidden(true);
  assert.equal(tr.lookahead, 1.5);
  assert.equal(inst.ons.length, 0);
  assert.equal(stats.getTargets, 0);
  assert.equal(timers.timers.size, 0);
}));

test('play does nothing without a song or a context', withTimers((timers) => {
  const tr = new Transport({ getContext: () => ({ currentTime: 0 }), getTargets: () => [] });
  tr.play();
  assert.equal(tr.playing, false);
  const tr2 = new Transport({ getContext: () => null, getTargets: () => [] });
  tr2.setSong({ notes: [note(0)], durationSeconds: 1 });
  tr2.play();
  assert.equal(tr2.playing, false);
  assert.equal(timers.timers.size, 0);
}));

// ----- offline mode -----

function offline(notes, targetsList) {
  const inst = fakeInst();
  const targets = targetsList ?? [{ id: 'a', part: 'all', muted: false, solo: false, inst }];
  const stats = { targets: 0, pumps: [] };
  const engine = {
    targets: () => { stats.targets++; return targets; },
    pump: (to) => { stats.pumps.push(to); },
  };
  const sched = createOfflineScheduler({ currentTime: 0 }, { notes }, engine);
  return { sched, inst, stats };
}

test('offline scheduleRange dispatches from <= start < to at context time n.start and pumps to `to`', () => {
  const { sched, inst, stats } = offline([note(0, 60), note(0.5, 62), note(1.0, 64), note(1.5, 65)]);
  sched.scheduleRange(0, 1);
  assert.deepEqual(inst.ons, [[60, 100, 0, 'file'], [62, 100, 0.5, 'file']]);
  assert.deepEqual(inst.offs, [[60, 0.25, 'file'], [62, 0.75, 'file']]);
  assert.deepEqual(stats.pumps, [1]);
  assert.equal(stats.targets, 1);

  sched.scheduleRange(1, 2);
  assert.deepEqual(pitches(inst.ons), [60, 62, 64, 65]);
  assert.equal(inst.ons[2][2], 1.0);
  assert.equal(inst.ons[3][2], 1.5);
  assert.deepEqual(stats.pumps, [1, 2]);

  sched.scheduleRange(2, 3);           // no notes: still pumps, no targets lookup
  assert.equal(stats.targets, 2);
  assert.deepEqual(stats.pumps, [1, 2, 3]);
  assert.equal(inst.ons.length, 4);
});

test('offline scheduleRange skips notes before `from` and excludes `to`', () => {
  const { sched, inst } = offline([note(0, 60), note(0.5, 62), note(1.0, 64), note(1.5, 65)]);
  sched.scheduleRange(1, 1.5);
  assert.deepEqual(pitches(inst.ons), [64]);
  sched.scheduleRange(1.5, 2);
  assert.deepEqual(pitches(inst.ons), [64, 65]);
});

test('offline mode applies mute and part routing', () => {
  const a = fakeInst('a'), b = fakeInst('b'), c = fakeInst('c');
  const { sched } = offline([note(0, 60, { track: 1 })], [
    { id: 'a', part: 'all', muted: true, solo: false, inst: a },
    { id: 'b', part: 't1c0', muted: false, solo: false, inst: b },
    { id: 'c', part: 't0c0', muted: false, solo: false, inst: c },
  ]);
  sched.scheduleRange(0, 1);
  assert.equal(a.ons.length, 0);
  assert.equal(b.ons.length, 1);
  assert.equal(c.ons.length, 0);
});
