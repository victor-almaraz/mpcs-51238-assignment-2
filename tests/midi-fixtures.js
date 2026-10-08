// Builders for Standard MIDI File bytes, so tests need no committed binary files.
// All builders work on plain number arrays; `toBuffer` makes the final ArrayBuffer.

export function writeVLQ(n) {
  const out = [n & 0x7f];
  n >>>= 7;
  while (n > 0) {
    out.unshift((n & 0x7f) | 0x80);
    n >>>= 7;
  }
  return out;
}

export const u16 = (n) => [(n >> 8) & 0xff, n & 0xff];
export const u32 = (n) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
export const u32le = (n) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];
export const ascii = (s) => Array.from(s, (c) => c.charCodeAt(0));

/** Big-endian SMF chunk: id, u32 length, data. */
export function chunk(id, data) {
  return [...ascii(id), ...u32(data.length), ...data];
}

/** MThd chunk; `extra` bytes extend the header length past 6. */
export function header(format, ntrks, division, extra = []) {
  return chunk('MThd', [...u16(format), ...u16(ntrks), ...u16(division), ...extra]);
}

/**
 * MTrk chunk from events given as `[delta, ...eventBytes]`. Appends End of Track unless
 * `opts.end === false`.
 */
export function track(events, opts = {}) {
  const data = [];
  for (const [delta, ...bytes] of events) data.push(...writeVLQ(delta), ...bytes);
  if (opts.end !== false) data.push(0x00, 0xff, 0x2f, 0x00);
  return chunk('MTrk', data);
}

// Event byte helpers (without the delta).
export const on = (ch, pitch, vel) => [0x90 | ch, pitch, vel];
export const off = (ch, pitch, vel = 0) => [0x80 | ch, pitch, vel];
export const tempo = (us) => [0xff, 0x51, 0x03, (us >> 16) & 0xff, (us >> 8) & 0xff, us & 0xff];
export const meta = (type, bytes) => [0xff, type, ...writeVLQ(bytes.length), ...bytes];
export const trackName = (s) => meta(0x03, ascii(s));

export function toBuffer(bytes) {
  return Uint8Array.from(bytes).buffer;
}

/** Concatenates chunks into one SMF ArrayBuffer. */
export function smf(...chunks) {
  return toBuffer(chunks.flat());
}

/** RIFF chunk (little-endian size) with a pad byte after odd-sized data. */
export function riffChunk(id, data) {
  const out = [...ascii(id), ...u32le(data.length), ...data];
  if (data.length & 1) out.push(0);
  return out;
}

/** Wraps SMF bytes in RIFF/RMID, with an odd-sized LIST chunk before `data`. */
export function rmid(smfBytes) {
  const body = [...ascii('RMID'), ...riffChunk('LIST', ascii('INFOx')), ...riffChunk('data', smfBytes)];
  return toBuffer([...ascii('RIFF'), ...u32le(body.length), ...body]);
}

/** Fixture 1 bytes: format 0, PPQ 480, C4 for one quarter note at the default tempo. */
export function fixture1Bytes() {
  return [...header(0, 1, 480), ...track([[0, ...on(0, 60, 100)], [480, ...off(0, 60)]])];
}

/** Deterministic pseudo-random bytes (LCG). */
export function randomBytes(n, seed = 12345) {
  const out = [];
  let s = seed >>> 0;
  for (let i = 0; i < n; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    out.push(s >>> 24);
  }
  return out;
}
