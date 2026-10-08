// WAV encoder (recording.md): header writer, body encoder, TPDF dither.
// Formats: 'pcm16' (44-byte header, WAVE_FORMAT_PCM = 1) and 'float32' (58-byte header,
// WAVE_FORMAT_IEEE_FLOAT = 3 with cbSize and a fact chunk). All fields little-endian.

import { mulberry32 } from '../random.js';

export function headerSize(format) {
  return format === 'float32' ? 58 : 44;
}

export function writeWavHeader(format, sampleRate, frames, channels = 2) {
  const isFloat = format === 'float32';
  const bits = isFloat ? 32 : 16;
  const blockAlign = (channels * bits) / 8;
  const dataBytes = frames * blockAlign;
  const size = headerSize(format);
  const v = new DataView(new ArrayBuffer(size));
  let p = 0;
  const str = (s) => { for (let i = 0; i < 4; i++) v.setUint8(p++, s.charCodeAt(i)); };
  const u16 = (x) => { v.setUint16(p, x, true); p += 2; };
  const u32 = (x) => { v.setUint32(p, x, true); p += 4; };
  str('RIFF'); u32(size - 8 + dataBytes); str('WAVE');
  str('fmt '); u32(isFloat ? 18 : 16);
  u16(isFloat ? 3 : 1); u16(channels); u32(sampleRate);
  u32(sampleRate * blockAlign); u16(blockAlign); u16(bits);
  if (isFloat) { u16(0); str('fact'); u32(4); u32(frames); }
  str('data'); u32(dataBytes);
  return v.buffer;
}

/**
 * Encodes frames [start, start + count) of planar L/R into an interleaved body part.
 * o = { format: 'pcm16' | 'float32', dither: boolean, rand: () => number in [0, 1) }
 */
export function encodeBody(left, right, start, count, o) {
  const isFloat = o.format === 'float32';
  const out = new DataView(new ArrayBuffer(count * (isFloat ? 8 : 4)));
  const dither = !isFloat && o.dither;
  let p = 0;
  for (let i = start; i < start + count; i++) {
    for (let c = 0; c < 2; c++) {
      let s = c === 0 ? left[i] : right[i];
      if (!Number.isFinite(s)) s = 0;
      if (isFloat) { out.setFloat32(p, s, true); p += 4; continue; }
      if (s > 1) s = 1; else if (s < -1) s = -1;
      let x = s * 32767;
      if (dither) x += o.rand() - o.rand();   // TPDF, ±1 LSB peak
      let q = Math.round(x);
      if (q > 32767) q = 32767; else if (q < -32768) q = -32768;
      out.setInt16(p, q, true); p += 2;
    }
  }
  return out.buffer;
}

/**
 * take = { sampleRate, frames, chunkFrames, chunks: [{ offset, frames, data: Float32Array(2 * chunkFrames) }] }
 * Gaps between chunks (dropped frames) and any missing tail are encoded as zeros.
 */
export function takeToWavBlob(take, format, dither = true, seed = 1) {
  const parts = [writeWavHeader(format, take.sampleRate, take.frames)];
  const opts = { format, dither, rand: mulberry32(seed) };
  const bpf = format === 'float32' ? 8 : 4;
  let pos = 0;
  const sorted = take.chunks.slice().sort((a, b) => a.offset - b.offset);
  for (const ch of sorted) {
    if (ch.offset >= take.frames) break;
    if (ch.offset + ch.frames <= pos) continue;                 // fully overlapped (defensive)
    if (ch.offset > pos) { parts.push(new ArrayBuffer((ch.offset - pos) * bpf)); pos = ch.offset; } // gap → zeros
    const skip = pos - ch.offset;                                // > 0 only for overlapping chunks
    const n = Math.min(ch.frames, take.frames - ch.offset) - skip;
    if (n <= 0) continue;
    parts.push(encodeBody(ch.data.subarray(0, take.chunkFrames), ch.data.subarray(take.chunkFrames), skip, n, opts));
    pos += n;
  }
  if (pos < take.frames) parts.push(new ArrayBuffer((take.frames - pos) * bpf));
  return new Blob(parts, { type: 'audio/wav' });
}
