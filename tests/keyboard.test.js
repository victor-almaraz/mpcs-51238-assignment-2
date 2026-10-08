import test from 'node:test';
import assert from 'node:assert/strict';

import {
  KEYMAP, KEYBOARD_VELOCITY, OCTAVE_DEFAULT, OCTAVE_MIN, OCTAVE_MAX,
  KeyboardInput, isTextEntry, octaveName,
} from '../src/live/keyboard.js';

test('KEYMAP maps physical key codes per live-input.md', () => {
  assert.deepEqual({ ...KEYMAP }, {
    KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyF: 5, KeyT: 6,
    KeyG: 7, KeyY: 8, KeyH: 9, KeyU: 10, KeyJ: 11, KeyK: 12,
    KeyZ: 'down', KeyX: 'up',
  });
  assert.ok(Object.isFrozen(KEYMAP));
  for (const code of ['Space', 'Enter', 'Tab', 'Escape', 'ArrowLeft', 'KeyQ']) assert.equal(KEYMAP[code], undefined);
});

test('keyboard constants: velocity 100, base C4, range C1..C7', () => {
  assert.equal(KEYBOARD_VELOCITY, 100);
  assert.equal(OCTAVE_DEFAULT, 60);
  assert.equal(OCTAVE_MIN, 24);
  assert.equal(OCTAVE_MAX, 96);
});

test('octaveName', () => {
  assert.equal(octaveName(60), 'C4');
  assert.equal(octaveName(24), 'C1');
  assert.equal(octaveName(96), 'C7');
  assert.equal(octaveName(72), 'C5');
  assert.equal(octaveName(0), 'C-1');
});

test('isTextEntry: text-like inputs, textarea, select and contenteditable take keys', { skip: typeof document !== 'undefined' && 'needs no global document' }, () => {
  assert.equal(isTextEntry({ tagName: 'INPUT', type: 'text' }), true);
  assert.equal(isTextEntry({ tagName: 'input' }), true);              // missing type means text
  assert.equal(isTextEntry({ tagName: 'INPUT', type: 'search' }), true);
  assert.equal(isTextEntry({ tagName: 'INPUT', type: 'number' }), true);
  assert.equal(isTextEntry({ tagName: 'TEXTAREA' }), true);
  assert.equal(isTextEntry({ tagName: 'SELECT' }), true);
  assert.equal(isTextEntry({ tagName: 'DIV', isContentEditable: true }), true);
});

test('isTextEntry: sliders, buttons and other elements do not take keys', { skip: typeof document !== 'undefined' && 'needs no global document' }, () => {
  for (const type of ['range', 'RANGE', 'checkbox', 'radio', 'button', 'submit', 'reset', 'color', 'file', 'image', 'hidden']) {
    assert.equal(isTextEntry({ tagName: 'INPUT', type }), false, type);
  }
  assert.equal(isTextEntry({ tagName: 'BUTTON' }), false);
  assert.equal(isTextEntry({ tagName: 'DIV', isContentEditable: false }), false);
  assert.equal(isTextEntry({ tagName: 'BODY' }), false);
  assert.equal(isTextEntry(null), false);
  assert.equal(isTextEntry(undefined), false);
  assert.equal(isTextEntry({}), false);
});

test('KeyboardInput octave shifting stays within C1..C7', () => {
  const labels = [];
  const kb = new KeyboardInput({ onOctave: (l) => labels.push(l) });
  assert.equal(kb.octave, 60);
  assert.equal(kb.octaveLabel, 'C4');
  assert.equal(kb.enabled, false);

  assert.equal(kb.shiftOctave('up'), true);
  assert.equal(kb.shiftOctave('up'), true);
  assert.equal(kb.shiftOctave('up'), true);
  assert.equal(kb.octave, 96);
  assert.equal(kb.canShift('up'), false);
  assert.equal(kb.shiftOctave('up'), false);
  assert.equal(kb.octave, 96);

  for (let i = 0; i < 6; i++) assert.equal(kb.shiftOctave('down'), true);
  assert.equal(kb.octave, 24);
  assert.equal(kb.shiftOctave('down'), false);
  assert.equal(kb.shiftOctave('sideways'), false);
  assert.deepEqual(labels, ['C5', 'C6', 'C7', 'C6', 'C5', 'C4', 'C3', 'C2', 'C1']);
});
