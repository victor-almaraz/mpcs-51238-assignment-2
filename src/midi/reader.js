// Bounds-checked big-endian byte reader for SMF parsing (midi-decoding.md, "Byte-level rules").
// Every read goes through `need()`, so nothing is ever read past `end`, even when a chunk's
// declared length is wrong. No DOM APIs.

/**
 * Fatal parse error. `offset` is the byte offset where the problem was found (-1 if unknown).
 * `truncated` is true when the error is "ran out of bytes", which callers may treat as a
 * truncated chunk instead of a fatal error.
 */
export class ParseError extends Error {
  constructor(message, offset = -1, truncated = false) {
    super(message);
    this.name = 'ParseError';
    this.offset = offset;
    this.truncated = truncated;
  }
}

/** Max VLQ value (4 bytes of 7 bits). */
export const VLQ_MAX = 0x0fffffff;

/**
 * Reads a variable-length quantity from `view` at `p.o`, never past `end`. Advances `p.o`.
 * Throws ParseError for a 5th continuation byte or when the bytes run out.
 */
export function readVLQ(view, p, end) {
  let value = 0;
  for (let i = 0; i < 4; i++) {
    if (p.o >= end) throw new ParseError('VLQ past end', p.o, true);
    const b = view.getUint8(p.o++);
    value = (value << 7) | (b & 0x7f);
    if ((b & 0x80) === 0) return value;
  }
  throw new ParseError('VLQ longer than 4 bytes', p.o);
}

export class ByteReader {
  /**
   * @param {DataView} view  view over the whole buffer
   * @param {number} start   absolute offset to start reading at
   * @param {number} end     absolute offset one past the last readable byte
   */
  constructor(view, start, end) {
    this.view = view;
    this.end = Math.max(0, Math.min(end, view.byteLength));
    this.pos = Math.max(0, Math.min(start, this.end));
  }

  get remaining() {
    return this.end - this.pos;
  }

  atEnd() {
    return this.pos >= this.end;
  }

  need(n) {
    if (!(n >= 0) || this.pos + n > this.end) {
      throw new ParseError('Unexpected end of data', this.pos, true);
    }
  }

  u8() {
    this.need(1);
    return this.view.getUint8(this.pos++);
  }

  u16() {
    this.need(2);
    const v = this.view.getUint16(this.pos, false);
    this.pos += 2;
    return v;
  }

  u24() {
    this.need(3);
    const v = (this.view.getUint8(this.pos) << 16) | (this.view.getUint8(this.pos + 1) << 8) | this.view.getUint8(this.pos + 2);
    this.pos += 3;
    return v;
  }

  u32() {
    this.need(4);
    const v = this.view.getUint32(this.pos, false);
    this.pos += 4;
    return v;
  }

  vlq() {
    const p = { o: this.pos };
    const v = readVLQ(this.view, p, this.end);
    this.pos = p.o;
    return v;
  }

  /** Four bytes as ASCII; bytes outside printable ASCII become '?'. */
  ascii4() {
    this.need(4);
    let s = '';
    for (let i = 0; i < 4; i++) {
      const b = this.view.getUint8(this.pos + i);
      s += b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '?';
    }
    this.pos += 4;
    return s;
  }

  skip(n) {
    this.need(n);
    this.pos += n;
  }

  /** `n` bytes as a Uint8Array view (no copy). */
  bytes(n) {
    this.need(n);
    const out = new Uint8Array(this.view.buffer, this.view.byteOffset + this.pos, n);
    this.pos += n;
    return out;
  }
}
