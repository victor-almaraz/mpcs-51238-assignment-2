import test from 'node:test';
import assert from 'node:assert/strict';

import { rackReducer, initialRack, createWidget } from '../src/state/rack.js';
import { defaultParams } from '../src/audio/synths/param-defs.js';

const add = (state, synth) => rackReducer(state, { type: 'add', synth });
const addAll = (...types) => types.reduce(add, initialRack);
const names = (state) => state.widgets.map((w) => w.name);
const armed = (state) => state.widgets.map((w) => w.armed);

test('add: first widget gets defaults, name "<Type> 1" and is armed', () => {
  const s = add(initialRack, 'subtractive');
  assert.equal(s.widgets.length, 1);
  const w = s.widgets[0];
  assert.equal(typeof w.id, 'string');
  assert.equal(w.type, 'subtractive');
  assert.equal(w.name, 'Subtractive 1');
  assert.equal(w.armed, true);
  assert.equal(w.muted, false);
  assert.equal(w.solo, false);
  assert.equal(w.volumeDb, -6);
  assert.equal(w.part, 'all');
  assert.equal(w.requestedPart, null);
  assert.equal(w.partLabel, null);
  assert.deepEqual(w.params, defaultParams('subtractive'));
  assert.equal(initialRack.widgets.length, 0);   // not mutated
});

test('add: names are numbered per type; later widgets are not armed', () => {
  const s = addAll('subtractive', 'subtractive', 'fm', 'subtractive', 'additive', 'pluck', 'granular', 'fm');
  assert.deepEqual(names(s), [
    'Subtractive 1', 'Subtractive 2', 'FM 1', 'Subtractive 3', 'Additive 1', 'Pluck 1', 'Granular 1', 'FM 2',
  ]);
  assert.deepEqual(armed(s), [true, false, false, false, false, false, false, false]);
  assert.equal(new Set(s.widgets.map((w) => w.id)).size, s.widgets.length);
});

test('add: numbering continues after the highest existing number', () => {
  let s = addAll('subtractive', 'subtractive', 'subtractive');
  s = rackReducer(s, { type: 'remove', id: s.widgets[1].id });
  s = add(s, 'subtractive');
  assert.deepEqual(names(s), ['Subtractive 1', 'Subtractive 3', 'Subtractive 4']);
  for (const w of s.widgets.slice()) s = rackReducer(s, { type: 'remove', id: w.id });
  assert.deepEqual(names(add(s, 'subtractive')), ['Subtractive 1']);
});

test('add: renamed widgets do not affect numbering', () => {
  let s = addAll('fm', 'fm');
  s = rackReducer(s, { type: 'update', id: s.widgets[1].id, fields: { name: 'Bass' } });
  assert.deepEqual(names(add(s, 'fm')), ['FM 1', 'Bass', 'FM 2']);
});

test('add: a new widget is armed when no other widget is armed', () => {
  let s = addAll('subtractive', 'fm');
  s = rackReducer(s, { type: 'remove', id: s.widgets[0].id });   // the armed one
  s = add(s, 'pluck');
  assert.deepEqual(armed(s), [false, true]);

  let t = addAll('subtractive');
  t = rackReducer(t, { type: 'update', id: t.widgets[0].id, fields: { armed: false } });
  t = add(t, 'fm');
  assert.deepEqual(armed(t), [false, true]);
});

test('remove deletes by id; an unknown id changes nothing', () => {
  const s = addAll('subtractive', 'fm', 'pluck');
  const r = rackReducer(s, { type: 'remove', id: s.widgets[1].id });
  assert.deepEqual(names(r), ['Subtractive 1', 'Pluck 1']);
  assert.equal(s.widgets.length, 3);   // not mutated
  assert.deepEqual(names(rackReducer(s, { type: 'remove', id: 'nope' })), names(s));
});

test('restore inserts the widget at its index (clamped to the end)', () => {
  const s = addAll('subtractive', 'fm', 'pluck');
  const [a, b, c] = s.widgets;
  const removed = rackReducer(s, { type: 'remove', id: b.id });
  const r1 = rackReducer(removed, { type: 'restore', widget: b, index: 1 });
  assert.deepEqual(r1.widgets, [a, b, c]);
  assert.equal(r1.widgets[1], b);
  assert.deepEqual(rackReducer(removed, { type: 'restore', widget: b, index: 0 }).widgets, [b, a, c]);
  assert.deepEqual(rackReducer(removed, { type: 'restore', widget: b, index: 99 }).widgets, [a, c, b]);
  assert.deepEqual(removed.widgets, [a, c]);   // not mutated
});

test('update merges fields into one widget and keeps the others by reference', () => {
  const s = addAll('subtractive', 'fm');
  const r = rackReducer(s, { type: 'update', id: s.widgets[1].id, fields: { muted: true, volumeDb: -12 } });
  assert.equal(r.widgets[0], s.widgets[0]);
  assert.equal(r.widgets[1].muted, true);
  assert.equal(r.widgets[1].volumeDb, -12);
  assert.equal(r.widgets[1].name, 'FM 1');
  assert.equal(s.widgets[1].muted, false);
});

test('param: values are coerced through PARAM_DEFS', () => {
  let s = addAll('subtractive', 'fm');
  const [sub, fm] = s.widgets;
  const p = (state, id, name, value) => rackReducer(state, { type: 'param', id, name, value });

  s = p(s, sub.id, 'cutoff', 99999);
  assert.equal(s.widgets[0].params.cutoff, 16000);
  assert.equal(sub.params.cutoff, 2000);   // old params object not mutated
  assert.equal(s.widgets[1], fm);          // other widgets untouched

  s = p(s, fm.id, 'ratio', 2.3);
  assert.equal(s.widgets[1].params.ratio, 2.5);
  s = p(s, fm.id, 'index', NaN);
  assert.equal(s.widgets[1].params.index, 3);

  s = p(s, sub.id, 'waveform', 'square');
  assert.equal(s.widgets[0].params.waveform, 'square');
  s = p(s, sub.id, 'waveform', 'bogus');
  assert.equal(s.widgets[0].params.waveform, 'sawtooth');   // default, not previous value
  assert.equal(s.widgets[0].params.cutoff, 16000);          // other params kept
});

test('param: an unknown param name leaves the widget unchanged', () => {
  const s = addAll('subtractive');
  const r = rackReducer(s, { type: 'param', id: s.widgets[0].id, name: 'ratio', value: 4 });
  assert.equal(r.widgets[0], s.widgets[0]);
});

test('harmonic: sets one harmonic, coerced; other harmonics kept', () => {
  let s = addAll('additive');
  const id = s.widgets[0].id;
  const before = s.widgets[0].params.harmonics;
  const h = (state, index, value) => rackReducer(state, { type: 'harmonic', id, index, value });

  s = h(s, 2, 0.9);
  assert.deepEqual(s.widgets[0].params.harmonics, [1, 0.5, 0.9, 0.25, 0.2, 0.17, 0.14, 0.12]);
  assert.equal(before[2], 0.33);   // not mutated
  s = h(s, 0, 5);
  assert.equal(s.widgets[0].params.harmonics[0], 1);
  s = h(s, 1, -1);
  assert.equal(s.widgets[0].params.harmonics[1], 0);
  s = h(s, 3, NaN);
  assert.equal(s.widgets[0].params.harmonics[3], 0);
  assert.equal(s.widgets[0].params.harmonics.length, 8);
  assert.equal(s.widgets[0].params.attack, 0.02);
});

test('replace builds widgets from fields, names them fresh and arms the first', () => {
  const existing = addAll('fm', 'fm', 'fm');
  const params = { ratio: 4, index: 1, indexDecay: 1, attack: 0.1, release: 1 };
  const r = rackReducer(existing, {
    type: 'replace',
    widgets: [
      { type: 'fm', muted: true, solo: true, volumeDb: -20, part: 't0c0', requestedPart: 't0c0', partLabel: 'Piano', params },
      { type: 'fm' },
      { type: 'pluck', volumeDb: -Infinity },
    ],
  });
  assert.deepEqual(names(r), ['FM 1', 'FM 2', 'Pluck 1']);
  assert.deepEqual(armed(r), [true, false, false]);
  const [a, b, c] = r.widgets;
  assert.equal(a.muted, true);
  assert.equal(a.solo, true);
  assert.equal(a.volumeDb, -20);
  assert.equal(a.part, 't0c0');
  assert.equal(a.requestedPart, 't0c0');
  assert.equal(a.partLabel, 'Piano');
  assert.deepEqual(a.params, params);
  assert.equal(b.muted, false);
  assert.equal(b.volumeDb, -6);
  assert.equal(b.part, 'all');
  assert.deepEqual(b.params, defaultParams('fm'));
  assert.equal(c.volumeDb, -Infinity);
  assert.deepEqual(rackReducer(existing, { type: 'replace', widgets: [] }).widgets, []);
});

test('createWidget only accepts muted/solo === true', () => {
  const w = createWidget('pluck', [], { muted: 'yes', solo: 1 });
  assert.equal(w.muted, false);
  assert.equal(w.solo, false);
  assert.equal(w.armed, false);
});

test('parts merges the resolver result into every widget', () => {
  const s = addAll('subtractive', 'fm');
  const r = rackReducer(s, {
    type: 'parts',
    resolve: (w) => (w.type === 'fm' ? { part: 't1c0', partLabel: 'Bass' } : { part: 'all', partLabel: null }),
  });
  assert.equal(r.widgets[0].part, 'all');
  assert.equal(r.widgets[1].part, 't1c0');
  assert.equal(r.widgets[1].partLabel, 'Bass');
  assert.equal(r.widgets[1].name, 'FM 1');
  assert.equal(s.widgets[1].part, 'all');
});

test('unknown actions return the same state', () => {
  const s = addAll('subtractive');
  assert.equal(rackReducer(s, { type: 'nope' }), s);
});
