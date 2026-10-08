// RIFF/RMID (.rmi) unwrapping (midi-decoding.md, "RMID"). RIFF sizes are little-endian;
// chunks with odd sizes are followed by one pad byte; `data` is not assumed to be first.

import { ParseError } from './reader.js';

function tag(view, o) {
  return String.fromCharCode(view.getUint8(o), view.getUint8(o + 1), view.getUint8(o + 2), view.getUint8(o + 3));
}

/**
 * Returns `{ start, end }` (absolute offsets) of the `data` chunk payload when `view` holds an
 * RMID file, or null when it is not RIFF/RMID. Throws ParseError for an RMID with no `data`.
 * `end` is clamped to the buffer, so a truncated payload is reported later by the SMF parser.
 */
export function findRmidData(view) {
  const len = view.byteLength;
  if (len < 12 || tag(view, 0) !== 'RIFF' || tag(view, 8) !== 'RMID') return null;
  let o = 12;
  while (o + 8 <= len) {
    const id = tag(view, o);
    const size = view.getUint32(o + 4, true);
    const start = o + 8;
    if (id === 'data') return { start, end: Math.min(start + size, len) };
    o = start + size + (size & 1);
  }
  throw new ParseError('RMID file has no MIDI data', o);
}
