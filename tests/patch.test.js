import test from 'node:test';
import assert from 'node:assert/strict';

import { defaultParams, PARAM_DEFS } from '../src/audio/synths/param-defs.js';
import { serializePatch, CURRENT_VERSION, APP_ID, MAX_WIDGETS, MAX_PATCH_BYTES } from '../src/patch/schema.js';
import { parsePatch, resolvePart, PatchError } from '../src/patch/validate.js';
import { migrate } from '../src/patch/migrate.js';
import { readPatchFile } from '../src/patch/file-io.js';

const song = { parts: [{ key: 't2c1', track: 2, channel: 1, label: 'Bass', noteCount: 4 }] };

function rackWidget(type, fields = {}) {
  return {
    id: 'w1', type, name: 'X 1', muted: false, solo: false, armed: true, volumeDb: -6,
    part: 'all', requestedPart: null, partLabel: null, params: defaultParams(type), ...fields,
  };
}

const patchText = (widgets, version = 1) => JSON.stringify({ version, app: 'synth-rack', widgets });

test('serialize → parsePatch round trip', () => {
  const widgets = [
    rackWidget('subtractive', { solo: true, volumeDb: -12.5 }),
    rackWidget('additive', { id: 'w2', muted: true, volumeDb: -Infinity, part: 't2c1', partLabel: 'Bass' }),
    rackWidget('fm', { id: 'w3', part: 'all', requestedPart: 't5c0', partLabel: 'Lead' }),
  ];
  const obj = serializePatch(widgets);
  assert.equal(obj.version, CURRENT_VERSION);
  assert.equal(obj.app, APP_ID);
  assert.deepEqual(Object.keys(obj.widgets[0]), ['type', 'muted', 'solo', 'volumeDb', 'part', 'params']);
  assert.deepEqual(Object.keys(obj.widgets[1]), ['type', 'muted', 'solo', 'volumeDb', 'part', 'partLabel', 'params']);
  assert.equal(obj.widgets[1].volumeDb, 'off');
  assert.equal(obj.widgets[2].part, 't5c0'); // remembered assignment survives
  assert.notEqual(obj.widgets[1].params.harmonics, widgets[1].params.harmonics); // arrays copied

  const { widgets: out, warnings } = parsePatch(JSON.stringify(obj, null, 2), song);
  assert.deepEqual(out[0], {
    type: 'subtractive', muted: false, solo: true, locked: false, volumeDb: -12.5, part: 'all', requestedPart: null,
    partLabel: null, octave: 0, cents: 0, params: defaultParams('subtractive'),
  });
  assert.deepEqual(out[1], {
    type: 'additive', muted: true, solo: false, locked: false, volumeDb: -Infinity, part: 't2c1', requestedPart: null,
    partLabel: 'Bass', octave: 0, cents: 0, params: defaultParams('additive'),
  });
  assert.equal(out[2].part, 'all');
  assert.equal(out[2].requestedPart, 't5c0');
  assert.equal(out[2].partLabel, 'Lead');
  assert.deepEqual(warnings, ["Widget 3: Part 'Lead' not in this file"]);
});

test('numbers are clamped; NaN, null and Infinity become defaults', () => {
  const text = `{"version":1,"widgets":[{"type":"subtractive","volumeDb":1e999,
    "params":{"cutoff":999999,"resonance":"NaN","attack":null,"release":1e999,"waveform":"kazoo"}},
    {"type":"fm","volumeDb":10,"params":{"ratio":-5,"index":2.34}},
    {"type":"pluck","volumeDb":-100},{"type":"pluck","volumeDb":-12.3}]}`;
  const { widgets, warnings } = parsePatch(text, null);
  const p = widgets[0].params;
  assert.equal(p.cutoff, 16000);
  assert.equal(p.resonance, 1);
  assert.equal(p.attack, 0.01);
  assert.equal(p.release, 0.3);
  assert.equal(p.waveform, 'sawtooth');
  assert.equal(widgets[0].volumeDb, -6); // Infinity → widget default
  assert.equal(widgets[1].params.ratio, 0.5);
  assert.equal(widgets[1].params.index, 2.3);
  assert.equal(widgets[1].volumeDb, 0);
  assert.equal(widgets[2].volumeDb, -60);
  assert.equal(widgets[3].volumeDb, -12.5);
  assert.ok(warnings.length >= 9);
  assert.ok(warnings.includes('Widget 1: Cutoff adjusted'));
  assert.ok(warnings.includes('Widget 2: Volume adjusted'));
});

test('missing params use defaults without warnings', () => {
  const { widgets, warnings } = parsePatch(patchText([{ type: 'granular' }]), null);
  assert.deepEqual(widgets[0].params, defaultParams('granular'));
  assert.equal(widgets[0].volumeDb, -6);
  assert.equal(widgets[0].muted, false);
  assert.deepEqual(warnings, ['Widget 1: Invalid part; using All parts']);
});

test('unknown types are skipped with a warning', () => {
  const { widgets, warnings } = parsePatch(
    patchText([{ type: 'theremin' }, { type: 'toString' }, { type: '__proto__' }, 7, null, { type: 'fm', part: 'all' }]),
    null,
  );
  assert.equal(widgets.length, 1);
  assert.equal(widgets[0].type, 'fm');
  assert.equal(warnings.filter((w) => /unknown type, skipped/.test(w)).length, 5);
});

test('__proto__ keys are ignored', () => {
  const text = '{"version":1,"__proto__":{"polluted":1},"widgets":[{"type":"fm","part":"all","__proto__":{"polluted":1},' +
    '"params":{"__proto__":{"ratio":99,"polluted":1},"ratio":3,"evil":1}}]}';
  const { widgets } = parsePatch(text, null);
  const w = widgets[0];
  assert.equal(({}).polluted, undefined);
  assert.equal(Object.getPrototypeOf(w), Object.prototype);
  assert.equal(Object.getPrototypeOf(w.params), Object.prototype);
  assert.deepEqual(Object.keys(w), ['type', 'muted', 'solo', 'locked', 'volumeDb', 'part', 'requestedPart', 'partLabel', 'octave', 'cents', 'params']);
  assert.deepEqual(Object.keys(w.params), PARAM_DEFS.fm.map((d) => d.name));
  assert.equal(w.params.ratio, 3);
  assert.equal(w.polluted, undefined);
  assert.equal(w.params.polluted, undefined);
});

test('harmonics are padded or truncated to 8 and clamped', () => {
  const { widgets, warnings } = parsePatch(
    patchText([
      { type: 'additive', part: 'all', params: { harmonics: [1, 0.5] } },
      { type: 'additive', part: 'all', params: { harmonics: [2, -1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.9, 0.9] } },
      { type: 'additive', part: 'all', params: { harmonics: 'loud' } },
    ]),
    null,
  );
  assert.deepEqual(widgets[0].params.harmonics, [1, 0.5, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(widgets[1].params.harmonics, [1, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
  assert.deepEqual(widgets[2].params.harmonics, PARAM_DEFS.additive[0].default);
  assert.equal(warnings.length, 3);
});

test('"off" volume round-trips as Off', () => {
  const { widgets, warnings } = parsePatch(patchText([{ type: 'pluck', part: 'all', volumeDb: 'off' }]), null);
  assert.equal(widgets[0].volumeDb, -Infinity);
  assert.deepEqual(warnings, []);
  assert.equal(serializePatch([rackWidget('pluck', { volumeDb: -Infinity })]).widgets[0].volumeDb, 'off');
});

test('versions, invalid JSON and missing fields', () => {
  assert.throws(() => parsePatch(patchText([], 2), null), (e) => e instanceof PatchError && e.message === 'Made with a newer version');
  assert.throws(() => migrate({ version: 2, widgets: [] }), /newer version/);
  assert.deepEqual(migrate({ version: 1, widgets: [] }), { version: 1, widgets: [] });
  assert.throws(() => parsePatch('{', null), (e) => e instanceof PatchError && e.message === 'Not valid JSON');
  assert.throws(() => parsePatch('', null), /Not valid JSON/);
  assert.throws(() => parsePatch('[]', null), /Missing version/);
  assert.throws(() => parsePatch('{"widgets":[]}', null), /Missing version/);
  assert.throws(() => parsePatch('{"version":1}', null), /Missing widgets/);
  assert.throws(() => parsePatch('{"version":0,"widgets":[]}', null), /Unsupported version/);
});

test('widget count is limited', () => {
  const many = Array.from({ length: MAX_WIDGETS + 6 }, () => ({ type: 'fm', part: 'all' }));
  const { widgets, warnings } = parsePatch(patchText(many), null);
  assert.equal(widgets.length, MAX_WIDGETS);
  assert.equal(warnings.length, 1);
});

test('part fallback with a song', () => {
  const w = [];
  assert.deepEqual(resolvePart('t2c1', song, w, 'Bass'), { part: 't2c1', requestedPart: null });
  assert.deepEqual(resolvePart('all', song, w), { part: 'all', requestedPart: null });
  assert.deepEqual(w, []);
  assert.deepEqual(resolvePart('t9c0', song, w, 'Bass'), { part: 'all', requestedPart: 't9c0' });
  assert.deepEqual(w, ["Part 'Bass' not in this file"]);
  assert.deepEqual(resolvePart('t9c0', song, w, null), { part: 'all', requestedPart: 't9c0' });
  assert.equal(w[1], "Part 't9c0' not in this file");
  for (const bad of ['foo', 't1234c0', 'T1C1', 3, null, undefined, { key: 't2c1' }]) {
    assert.deepEqual(resolvePart(bad, song, w), { part: 'all', requestedPart: null });
  }
  assert.equal(w.length, 9);

  const { widgets, warnings } = parsePatch(patchText([{ type: 'pluck', part: 't9c0', partLabel: 'Bass' }]), song);
  assert.equal(widgets[0].part, 'all');
  assert.equal(widgets[0].requestedPart, 't9c0');
  assert.equal(widgets[0].partLabel, 'Bass');
  assert.deepEqual(warnings, ["Widget 1: Part 'Bass' not in this file"]);
});

test('part fallback without a song keeps the requested part', () => {
  const w = [];
  assert.deepEqual(resolvePart('t2c1', null, w, 'Bass'), { part: 'all', requestedPart: 't2c1' });
  assert.equal(w.length, 1);
  assert.match(w[0], /'Bass'/);
  // A later MIDI load re-runs resolvePart and restores the assignment.
  assert.deepEqual(resolvePart('t2c1', song, [], 'Bass'), { part: 't2c1', requestedPart: null });
});

test('readPatchFile rejects files over 256 KB before reading', async () => {
  let read = false;
  const big = { size: MAX_PATCH_BYTES + 1, text: async () => { read = true; return '{}'; } };
  await assert.rejects(readPatchFile(big), (e) => e instanceof PatchError && e.message === 'File is larger than 256 KB');
  assert.equal(read, false);
  assert.equal(await readPatchFile({ size: 10, text: async () => '{"a":1}' }), '{"a":1}');
});

test('a granular sample is saved by name only and asks to be loaded again', () => {
  const g = { type: 'granular', muted: false, solo: false, volumeDb: -6, part: 'all', params: { source: 'sample' }, sample: { name: 'loop.wav', buffer: {} } };
  const obj = serializePatch([g]);
  assert.equal(obj.widgets[0].sampleName, 'loop.wav');
  assert.equal(JSON.stringify(obj).includes('buffer'), false);
  const { widgets, warnings } = parsePatch(JSON.stringify(obj), null);
  assert.equal(widgets[0].params.source, 'sample');
  assert.ok(warnings.some((m) => m.includes("file 'loop.wav' is not stored in patches")), warnings.join('; '));
});

test('tuning and the lock round-trip; out-of-range tuning is clamped with a warning', () => {
  const w = { type: 'fm', muted: false, solo: false, volumeDb: -6, part: 'all', octave: -2, cents: 15, locked: true, params: {} };
  const obj = serializePatch([w, { type: 'fm', muted: false, solo: false, volumeDb: -6, part: 'all', params: {} }]);
  assert.equal(obj.widgets[0].octave, -2);
  assert.equal(obj.widgets[0].cents, 15);
  assert.equal(obj.widgets[0].locked, true);
  assert.deepEqual(Object.keys(obj.widgets[1]), ['type', 'muted', 'solo', 'volumeDb', 'part', 'params']);
  const back = parsePatch(JSON.stringify(obj), null).widgets[0];
  assert.equal(back.octave, -2);
  assert.equal(back.cents, 15);
  assert.equal(back.locked, true);
  const bad = parsePatch(patchText([{ type: 'fm', octave: 7, cents: 'x' }]), null);
  assert.equal(bad.widgets[0].octave, 3);
  assert.equal(bad.widgets[0].cents, 0);
  assert.ok(bad.warnings.some((m) => m.includes('Octave adjusted')) && bad.warnings.some((m) => m.includes('Cents adjusted')));
});
