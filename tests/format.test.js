import test from 'node:test';
import assert from 'node:assert/strict';
import { formatParam, parseParam, parseVolume } from '../src/components/synth/format.js';
import { getDef } from '../src/audio/synths/param-defs.js';

const cutoff = getDef('subtractive', 'cutoff');
const attack = getDef('subtractive', 'attack');
const ratio = getDef('fm', 'ratio');
const spray = getDef('granular', 'spray');

test('parseParam reads explicit units', () => {
  assert.equal(parseParam(cutoff, '2.5 kHz'), 2500);
  assert.equal(parseParam(cutoff, '2k'), 2000);
  assert.equal(parseParam(cutoff, '440hz'), 440);
  assert.equal(parseParam(attack, '250 ms'), 0.25);
  assert.equal(parseParam(attack, '1.5s'), 1.5);
  assert.equal(parseParam(spray, '40 %'), 0.4);
});

test('parseParam gives a bare number the unit currently shown', () => {
  assert.equal(parseParam(cutoff, '3', formatParam(cutoff, 2000)), 3000);   // shown "2.0 kHz"
  assert.equal(parseParam(cutoff, '300', formatParam(cutoff, 500)), 300);   // shown "500 Hz"
  assert.equal(parseParam(attack, '20', formatParam(attack, 0.01)), 0.02);  // shown "10 ms"
  assert.equal(parseParam(spray, '25', formatParam(spray, 0.2)), 0.25);     // shown "20 %"
});

test('parseParam accepts the × prefix, the minus sign and decimal commas', () => {
  assert.equal(parseParam(ratio, '×3.5', formatParam(ratio, 2)), 3.5);
  assert.equal(parseParam(ratio, '4x'), 4);
  assert.equal(parseParam(getDef('subtractive', 'resonance'), '−2,5 dB'), -2.5);
});

test('parseParam rejects unreadable text and foreign units', () => {
  assert.equal(parseParam(cutoff, 'loud'), null);
  assert.equal(parseParam(cutoff, ''), null);
  assert.equal(parseParam(cutoff, '5 ms'), null);
  assert.equal(parseParam(attack, '5 Hz'), null);
});

test('parseVolume reads dB and Off', () => {
  assert.equal(parseVolume('-6'), -6);
  assert.equal(parseVolume('−12.5 dB'), -12.5);
  assert.equal(parseVolume('Off'), -Infinity);
  assert.equal(parseVolume('−∞ dB'), -Infinity);
  assert.equal(parseVolume('6 Hz'), null);
  assert.equal(parseVolume('quiet'), null);
});
