import test from 'node:test';
import assert from 'node:assert/strict';

import { parseMidi, ParseError, MAX_MIDI_BYTES, decodeText } from '../src/midi/parse.js';
import { readVLQ, ByteReader } from '../src/midi/reader.js';
import { findRmidData } from '../src/midi/rmid.js';
import { partKey } from '../src/midi/parts.js';
import {
  writeVLQ, header, track, chunk, on, off, tempo, meta, trackName, toBuffer, smf, rmid,
  fixture1Bytes, randomBytes, ascii,
} from './midi-fixtures.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test('fixture 1: format 0, one quarter note at default tempo', () => {
  const song = parseMidi(toBuffer(fixture1Bytes()));
  assert.equal(song.format, 0);
  assert.deepEqual(song.division, { type: 'ppq', ticksPerQuarter: 480 });
  assert.equal(song.notes.length, 1);
  const n = song.notes[0];
  assert.equal(n.start, 0);
  assert.equal(n.duration, 0.5);
  assert.equal(n.startTick, 0);
  assert.equal(n.durationTicks, 480);
  assert.equal(n.pitch, 60);
  assert.equal(n.velocity, 100);
  assert.equal(n.track, 0);
  assert.equal(n.channel, 0);
  assert.deepEqual(song.tempoMap, [{ tick: 0, usPerQuarter: 500000, seconds: 0 }]);
  assert.deepEqual(song.timeSignatures, [{ tick: 0, numerator: 4, denominator: 4 }]);
  assert.equal(song.durationSeconds, 0.5);
  assert.deepEqual(song.tracks, [{ index: 0, name: null, noteCount: 1, channels: [0] }]);
  assert.deepEqual(song.parts, [{ key: 't0c0', track: 0, channel: 0, label: 'Ch 1', noteCount: 1 }]);
  assert.deepEqual(song.warnings, []);
});

test('fixture 2: tempo change at tick 960 from 120 to 60 BPM', () => {
  const buf = smf(
    header(1, 2, 480),
    track([[0, ...tempo(500000)], [960, ...tempo(1000000)]]),
    track([
      [480, ...on(0, 60, 100)], // tick 480, spans the change
      [960, ...off(0, 60)], // tick 1440
      [0, ...on(0, 64, 100)], // tick 1440
      [480, ...off(0, 64)], // tick 1920
    ]),
  );
  const song = parseMidi(buf);
  assert.equal(song.tempoMap.length, 2);
  assert.deepEqual(song.tempoMap[0], { tick: 0, usPerQuarter: 500000, seconds: 0 });
  assert.deepEqual(song.tempoMap[1], { tick: 960, usPerQuarter: 1000000, seconds: 1 });
  const [a, b] = song.notes;
  close(a.start, 0.5);
  close(a.duration, 1.5); // 480 ticks at 120 BPM (0.5 s) + 480 ticks at 60 BPM (1 s)
  close(b.start, 2);
  close(b.duration, 1);
  close(song.durationSeconds, 3);
  assert.deepEqual(song.warnings, []);
});

test('tempo map: same-tick changes, last wins; tempo 0 warns', () => {
  const buf = smf(
    header(1, 2, 480),
    track([[0, ...tempo(250000)], [0, ...tempo(1000000)]]),
    track([[0, ...tempo(0)], [0, ...on(0, 60, 1)], [480, ...off(0, 60)]]),
  );
  const song = parseMidi(buf);
  // Track 1's (zero → default 500000) change is last on tick 0.
  assert.deepEqual(song.tempoMap, [{ tick: 0, usPerQuarter: 500000, seconds: 0 }]);
  assert.equal(song.notes[0].duration, 0.5);
  assert.ok(song.warnings.some((w) => /tempo of 0/i.test(w)));
});

test('fixture 3: running status, including across a meta event', () => {
  const buf = smf(
    header(0, 1, 480),
    track([
      [0, ...on(0, 60, 100)],
      [0, 62, 100], // running status
      [240, ...meta(0x01, ascii('text'))],
      [0, 60, 0], // running status after a meta event → warning
      [0, 62, 0], // running status again → no second warning
    ]),
  );
  const song = parseMidi(buf);
  assert.equal(song.notes.length, 2);
  assert.deepEqual(song.notes.map((n) => [n.pitch, n.startTick, n.durationTicks]), [[60, 0, 240], [62, 0, 240]]);
  close(song.notes[0].duration, 0.25);
  assert.equal(song.warnings.filter((w) => /running status/i.test(w)).length, 1);
  assert.equal(song.warnings.length, 1);
});

test('running status with no prior channel status throws', () => {
  const buf = smf(header(0, 1, 480), track([[0, 60, 100]]));
  assert.throws(() => parseMidi(buf), ParseError);
});

test('fixture 4: note-on velocity 0 is a note-off', () => {
  const buf = smf(header(0, 1, 480), track([[0, ...on(0, 64, 90)], [480, ...on(0, 64, 0)]]));
  const song = parseMidi(buf);
  assert.equal(song.notes.length, 1);
  assert.equal(song.notes[0].velocity, 90);
  assert.equal(song.notes[0].duration, 0.5);
  assert.deepEqual(song.warnings, []);
});

test('fixture 5: overlapping same-pitch notes pair FIFO', () => {
  const buf = smf(
    header(0, 1, 480),
    track([
      [0, ...on(0, 60, 100)],
      [240, ...on(0, 60, 80)],
      [240, ...off(0, 60)],
      [240, ...off(0, 60)],
    ]),
  );
  const song = parseMidi(buf);
  assert.equal(song.notes.length, 2);
  assert.deepEqual(
    song.notes.map((n) => [n.startTick, n.durationTicks, n.velocity]),
    [[0, 480, 100], [240, 480, 80]],
  );
});

test('fixture 6: SMPTE (-25, 40) is 1000 ticks per second; tempo ignored', () => {
  const division = (0xe7 << 8) | 40; // -25 two's complement, 40 ticks per frame
  const buf = smf(
    header(0, 1, division),
    track([[0, ...tempo(1000000)], [500, ...on(0, 60, 100)], [1000, ...off(0, 60)]]),
  );
  const song = parseMidi(buf);
  assert.deepEqual(song.division, { type: 'smpte', fps: 25, ticksPerFrame: 40 });
  close(song.notes[0].start, 0.5);
  close(song.notes[0].duration, 1);
  close(song.durationSeconds, 1.5);
});

test('SMPTE -29 means 29.97 fps', () => {
  const buf = smf(header(0, 1, (0xe3 << 8) | 100), track([[0, ...on(0, 60, 100)], [2997, ...off(0, 60)]]));
  const song = parseMidi(buf);
  assert.equal(song.division.fps, 29.97);
  close(song.notes[0].duration, 1);
});

test('fixture 7: truncated file keeps notes before the cut', () => {
  const full = [
    ...header(0, 1, 480),
    ...track([
      [0, ...on(0, 60, 100)], [480, ...off(0, 60)],
      [0, ...on(0, 62, 100)], [480, ...off(0, 62)],
      [0, ...on(0, 64, 100)], [480, ...off(0, 64)],
    ]),
  ];
  const cut = full.slice(0, full.length - 6); // drops End of Track and the last 2 bytes of the last note-off
  const song = parseMidi(toBuffer(cut));
  assert.ok(song.notes.length >= 2);
  assert.deepEqual(song.notes.slice(0, 2).map((n) => [n.pitch, n.start, n.duration]), [[60, 0, 0.5], [62, 0.5, 0.5]]);
  assert.ok(song.warnings.some((w) => /truncated/i.test(w)));
  assert.ok(song.warnings.some((w) => /mid-event/i.test(w)));
  // The note whose note-off was cut is closed at the last complete event (zero length, clamped).
  const last = song.notes[2];
  assert.equal(last.pitch, 64);
  assert.equal(last.durationTicks, 0);
  assert.equal(last.duration, 0.005);
});

test('fixture 8: random bytes and an empty file are rejected', () => {
  const junk = randomBytes(256);
  junk[0] = 0; // never "MThd" or "RIFF"
  assert.throws(() => parseMidi(toBuffer(junk)), (e) => e instanceof ParseError && /Not a MIDI file/.test(e.message));
  assert.throws(() => parseMidi(new ArrayBuffer(0)), (e) => e instanceof ParseError && /Not a MIDI file/.test(e.message));
  assert.throws(() => parseMidi(smf(header(0, 1, 480))), ParseError); // header only
});

test('fixture 8: MThd with length 10 is honoured', () => {
  const buf = smf(header(0, 1, 480, [1, 2, 3, 4]), track([[0, ...on(0, 60, 100)], [480, ...off(0, 60)]]));
  const song = parseMidi(buf);
  assert.equal(song.notes.length, 1);
  assert.equal(song.notes[0].duration, 0.5);
});

test('fixture 9: RMID wrapper around fixture 1', () => {
  const buf = rmid(fixture1Bytes());
  const r = findRmidData(new DataView(buf));
  assert.ok(r);
  assert.equal(r.end - r.start, fixture1Bytes().length);
  const song = parseMidi(buf);
  assert.equal(song.notes.length, 1);
  assert.equal(song.notes[0].start, 0);
  assert.equal(song.notes[0].duration, 0.5);
  assert.equal(findRmidData(new DataView(toBuffer(fixture1Bytes()))), null);
});

test('fixture 10: unknown chunk "XFIH" between tracks is skipped', () => {
  const buf = smf(
    header(1, 2, 480),
    track([[0, ...tempo(500000)]]),
    chunk('XFIH', [1, 2, 3, 4, 5]),
    track([[0, ...on(1, 67, 100)], [480, ...off(1, 67)]]),
  );
  const song = parseMidi(buf);
  assert.equal(song.tracks.length, 2);
  assert.equal(song.notes.length, 1);
  assert.equal(song.notes[0].track, 1);
  assert.equal(song.notes[0].channel, 1);
  assert.ok(song.warnings.some((w) => w.includes('XFIH')));
});

test('part labels follow the "Parts" rules', () => {
  const buf = smf(
    header(1, 4, 480),
    track([[0, ...trackName('Bass')], [0, ...on(0, 40, 100)], [480, ...off(0, 40)]]),
    track([[0, ...trackName('Piano')], [0, ...on(0, 60, 100)], [0, ...on(1, 64, 100)], [480, ...off(0, 60)], [0, ...off(1, 64)]]),
    track([[0, ...on(2, 70, 100)], [480, ...off(2, 70)]]),
    track([[0, ...on(9, 36, 100)], [480, ...off(9, 36)]]),
  );
  const song = parseMidi(buf);
  assert.deepEqual(song.parts.map((p) => [p.key, p.label]), [
    ['t0c0', 'Bass'],
    ['t1c0', 'Piano (Ch 1)'],
    ['t1c1', 'Piano (Ch 2)'],
    ['t2c2', 'Track 3'],
    ['t3c9', 'Track 4 Drums'],
  ]);
  assert.equal(partKey(song.notes.find((n) => n.channel === 1)), 't1c1');

  const f0 = parseMidi(smf(header(0, 1, 480), track([[0, ...on(0, 60, 100)], [0, ...on(9, 36, 100)], [480, ...off(0, 60)], [0, ...off(9, 36)]])));
  assert.deepEqual(f0.parts.map((p) => p.label), ['Ch 1', 'Ch 10 Drums']);
});

test('track names: UTF-8, windows-1252 fallback, trailing NULs trimmed', () => {
  assert.equal(decodeText(Uint8Array.from([0x43, 0x61, 0x66, 0xc3, 0xa9])), 'Café');
  assert.equal(decodeText(Uint8Array.from([0x43, 0x61, 0x66, 0xe9])), 'Café');
  assert.equal(decodeText(Uint8Array.from([...ascii('Bass'), 0, 0, 0x20])), 'Bass');
  const song = parseMidi(smf(header(0, 1, 480), track([[0, ...meta(0x03, [...ascii('Lead'), 0])], [0, ...on(0, 60, 100)], [1, ...off(0, 60)]])));
  assert.equal(song.tracks[0].name, 'Lead');
});

test('unmatched note-offs aggregate into one warning; open notes are closed', () => {
  const buf = smf(
    header(0, 1, 480),
    track([[0, ...off(0, 50)], [0, ...off(0, 51)], [0, ...off(0, 52)], [0, ...on(0, 60, 100)], [960, ...on(0, 61, 1)]]),
  );
  const song = parseMidi(buf);
  const unmatched = song.warnings.filter((w) => /no matching note-on/.test(w));
  assert.equal(unmatched.length, 1);
  assert.match(unmatched[0], /^3 /);
  assert.ok(song.warnings.some((w) => /still on/.test(w)));
  // End of Track has delta 0, so both open notes close at tick 960.
  assert.deepEqual(song.notes.map((n) => [n.pitch, n.durationTicks]), [[60, 960], [61, 0]]);
  assert.equal(song.notes[1].duration, 0.005);
});

test('format 2 is read as format 1 with a warning', () => {
  const song = parseMidi(smf(header(2, 1, 480), track([[0, ...on(0, 60, 100)], [480, ...off(0, 60)]])));
  assert.equal(song.format, 2);
  assert.ok(song.warnings.some((w) => /format 2/i.test(w)));
});

test('SysEx and invalid status bytes', () => {
  const sysex = smf(header(0, 1, 480), track([[0, 0xf0, 3, 0x7e, 0x01, 0xf7], [0, 0xf7, 2, 1, 2], [0, ...on(0, 60, 100)], [480, ...off(0, 60)]]));
  assert.equal(parseMidi(sysex).notes.length, 1);
  const bad = smf(header(0, 1, 480), track([[0, ...on(0, 60, 100)], [480, ...off(0, 60)], [0, 0xf8], [0, ...on(0, 62, 100)]]));
  const song = parseMidi(bad);
  assert.equal(song.notes.length, 1);
  assert.ok(song.warnings.some((w) => /invalid status/i.test(w)));
});

test('VLQ: max value, 5-byte error, past-end error', () => {
  const max = writeVLQ(0x0fffffff);
  assert.deepEqual(max, [0xff, 0xff, 0xff, 0x7f]);
  const view = new DataView(toBuffer(max));
  const p = { o: 0 };
  assert.equal(readVLQ(view, p, 4), 0x0fffffff);
  assert.equal(p.o, 4);
  assert.deepEqual(writeVLQ(0), [0]);
  assert.deepEqual(writeVLQ(480), [0x83, 0x60]);

  const five = new DataView(toBuffer([0x81, 0x80, 0x80, 0x80, 0x00]));
  assert.throws(() => readVLQ(five, { o: 0 }, 5), (e) => e instanceof ParseError && /longer than 4/.test(e.message));
  assert.throws(() => new ByteReader(five, 0, 3).vlq(), (e) => e instanceof ParseError && e.truncated);

  // A 5-byte delta inside a track is corruption, not truncation.
  const buf = smf(header(0, 1, 480), chunk('MTrk', [0x81, 0x80, 0x80, 0x80, 0x00, ...on(0, 60, 100)]));
  assert.throws(() => parseMidi(buf), ParseError);
});

test('reader never reads past its end', () => {
  const r = new ByteReader(new DataView(toBuffer([1, 2, 3, 4, 5])), 1, 3);
  assert.equal(r.u16(), 0x0203);
  assert.throws(() => r.u8(), ParseError);
  assert.equal(MAX_MIDI_BYTES, 4 * 1024 * 1024);
});
