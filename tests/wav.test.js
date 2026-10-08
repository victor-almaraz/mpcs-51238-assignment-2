import { test } from 'node:test';
import assert from 'node:assert/strict';
import { headerSize, writeWavHeader, encodeBody, takeToWavBlob } from '../src/audio/recording/wav.js';
import { wavFilename } from '../src/audio/recording/download.js';
import { mulberry32 } from '../src/audio/random.js';

function ascii(view, offset) {
  let s = '';
  for (let i = 0; i < 4; i++) s += String.fromCharCode(view.getUint8(offset + i));
  return s;
}

test('headerSize', () => {
  assert.equal(headerSize('pcm16'), 44);
  assert.equal(headerSize('float32'), 58);
});

test('pcm16 header fields', () => {
  const buf = writeWavHeader('pcm16', 48000, 10);
  assert.equal(buf.byteLength, 44);
  const v = new DataView(buf);
  assert.equal(ascii(v, 0), 'RIFF');
  assert.equal(v.getUint32(4, true), 36 + 40);
  assert.equal(ascii(v, 8), 'WAVE');
  assert.equal(ascii(v, 12), 'fmt ');
  assert.equal(v.getUint32(16, true), 16);
  assert.equal(v.getUint16(20, true), 1);
  assert.equal(v.getUint16(22, true), 2);
  assert.equal(v.getUint32(24, true), 48000);
  assert.equal(v.getUint32(28, true), 48000 * 4);
  assert.equal(v.getUint16(32, true), 4);
  assert.equal(v.getUint16(34, true), 16);
  assert.equal(ascii(v, 36), 'data');
  assert.equal(v.getUint32(40, true), 40);
});

test('float32 header fields', () => {
  const buf = writeWavHeader('float32', 44100, 10);
  assert.equal(buf.byteLength, 58);
  const v = new DataView(buf);
  assert.equal(ascii(v, 0), 'RIFF');
  assert.equal(v.getUint32(4, true), 50 + 80);
  assert.equal(ascii(v, 8), 'WAVE');
  assert.equal(ascii(v, 12), 'fmt ');
  assert.equal(v.getUint32(16, true), 18);
  assert.equal(v.getUint16(20, true), 3);
  assert.equal(v.getUint16(22, true), 2);
  assert.equal(v.getUint32(24, true), 44100);
  assert.equal(v.getUint32(28, true), 44100 * 8);
  assert.equal(v.getUint16(32, true), 8);
  assert.equal(v.getUint16(34, true), 32);
  assert.equal(v.getUint16(36, true), 0);
  assert.equal(ascii(v, 38), 'fact');
  assert.equal(v.getUint32(42, true), 4);
  assert.equal(v.getUint32(46, true), 10);
  assert.equal(ascii(v, 50), 'data');
  assert.equal(v.getUint32(54, true), 80);
});

test('pcm16 body: clamp, scale, non-finite, interleave', () => {
  const L = new Float32Array([0, 1, -1, 2, NaN]);
  const R = new Float32Array([0.5, -0.5, -2, Infinity, 0.25]);
  const noRand = () => { throw new Error('rand must not be called without dither'); };
  const buf = encodeBody(L, R, 0, 5, { format: 'pcm16', dither: false, rand: noRand });
  assert.equal(buf.byteLength, 20);
  const v = new DataView(buf);
  const got = [];
  for (let i = 0; i < 10; i++) got.push(v.getInt16(i * 2, true));
  assert.deepEqual(got, [0, 16384, 32767, -16383, -32767, -32767, 32767, 0, 0, Math.round(0.25 * 32767)]);
});

test('pcm16 body: start/count select a frame range', () => {
  const L = new Float32Array([0.1, 0.2, 0.3, 0.4]);
  const R = new Float32Array([-0.1, -0.2, -0.3, -0.4]);
  const v = new DataView(encodeBody(L, R, 1, 2, { format: 'pcm16', dither: false, rand: Math.random }));
  assert.equal(v.byteLength, 8);
  assert.equal(v.getInt16(0, true), Math.round(L[1] * 32767));
  assert.equal(v.getInt16(2, true), Math.round(R[1] * 32767));
  assert.equal(v.getInt16(4, true), Math.round(L[2] * 32767));
  assert.equal(v.getInt16(6, true), Math.round(R[2] * 32767));
});

test('float32 body: no clamp, no dither, non-finite → 0', () => {
  const L = new Float32Array([0.5, 2, NaN]);
  const R = new Float32Array([-0.25, -3, 1]);
  const noRand = () => { throw new Error('float must not dither'); };
  const v = new DataView(encodeBody(L, R, 0, 3, { format: 'float32', dither: true, rand: noRand }));
  assert.equal(v.byteLength, 24);
  const got = [];
  for (let i = 0; i < 6; i++) got.push(v.getFloat32(i * 4, true));
  assert.deepEqual(got, [0.5, -0.25, 2, -3, 0, 1]);
});

test('TPDF dither is deterministic for a seed and within ±1 LSB', () => {
  const N = 1000;
  const L = new Float32Array(N);
  const R = new Float32Array(N);
  for (let i = 0; i < N; i++) { L[i] = Math.sin(i * 0.01) * 0.3; R[i] = Math.cos(i * 0.013) * 0.2; }
  const enc = (seed) => new Int16Array(encodeBody(L, R, 0, N, { format: 'pcm16', dither: true, rand: mulberry32(seed) }));
  const a = enc(7);
  const b = enc(7);
  const c = enc(8);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  for (let i = 0; i < N; i++) {
    assert.ok(Math.abs(a[2 * i] - Math.round(L[i] * 32767)) <= 1);
    assert.ok(Math.abs(a[2 * i + 1] - Math.round(R[i] * 32767)) <= 1);
  }
});

function makeChunk(chunkFrames, offset, left, right) {
  const data = new Float32Array(2 * chunkFrames);
  data.set(left, 0);
  data.set(right, chunkFrames);
  return { offset, frames: left.length, data };
}

test('takeToWavBlob fills gaps and the tail with zeros, sorts and truncates chunks', async () => {
  const cf = 4;
  const a = makeChunk(cf, 0, [0.1, 0.2, 0.3, 0.4], [-0.1, -0.2, -0.3, -0.4]);
  const b = makeChunk(cf, 6, [0.5, 0.6, 0.7], [-0.5, -0.6, -0.7]);
  const take = { sampleRate: 48000, frames: 10, chunkFrames: cf, chunks: [b, a] };
  const blob = takeToWavBlob(take, 'pcm16', false);
  assert.equal(blob.type, 'audio/wav');
  const buf = await blob.arrayBuffer();
  assert.equal(buf.byteLength, 44 + 10 * 4);
  const v = new DataView(buf);
  assert.equal(v.getUint32(40, true), 40);
  const q = (x) => Math.round(Math.fround(x) * 32767);
  const expected = [
    q(0.1), q(-0.1), q(0.2), q(-0.2), q(0.3), q(-0.3), q(0.4), q(-0.4),
    0, 0, 0, 0,                                      // dropped frames 4..5
    q(0.5), q(-0.5), q(0.6), q(-0.6), q(0.7), q(-0.7),
    0, 0,                                            // missing tail frame 9
  ];
  const got = [];
  for (let i = 0; i < 20; i++) got.push(v.getInt16(44 + i * 2, true));
  assert.deepEqual(got, expected);

  // Trimmed take: frames = 8 cuts chunk b after two frames.
  const short = await takeToWavBlob({ ...take, frames: 8 }, 'float32', false).arrayBuffer();
  assert.equal(short.byteLength, 58 + 8 * 8);
  const sv = new DataView(short);
  assert.equal(sv.getFloat32(58 + 6 * 8, true), Math.fround(0.5));
  assert.equal(sv.getFloat32(58 + 7 * 8 + 4, true), Math.fround(-0.6));
});

test('takeToWavBlob dither is reproducible with the same seed', async () => {
  const cf = 8;
  const ch = makeChunk(cf, 0, [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8], [0, 0, 0, 0, 0, 0, 0, 0]);
  const take = { sampleRate: 44100, frames: 8, chunkFrames: cf, chunks: [ch] };
  const x = new Uint8Array(await takeToWavBlob(take, 'pcm16', true, 3).arrayBuffer());
  const y = new Uint8Array(await takeToWavBlob(take, 'pcm16', true, 3).arrayBuffer());
  assert.deepEqual(x, y);
});

test('wavFilename format', () => {
  const d = new Date(2026, 9, 7, 14, 32, 5);
  assert.equal(wavFilename('live', 48000, 'pcm16', undefined, d), 'synth-live-20261007-143205-48k-16.wav');
  assert.equal(wavFilename('render', 44100, 'float32', 'My Song.mid', d), 'my-song-render-20261007-143205-44.1k-f32.wav');
  assert.equal(wavFilename('render', 96000, 'pcm16', '!!!.mid', d), 'synth-render-20261007-143205-96k-16.wav');
  assert.match(wavFilename('live', 48000, 'float32'), /^synth-live-\d{8}-\d{6}-48k-f32\.wav$/);
});
