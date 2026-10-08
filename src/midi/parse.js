// Standard MIDI File parser (midi-decoding.md). Synchronous, no DOM APIs.
// parseMidi(arrayBuffer) → Song; throws ParseError(message, offset) for unreadable files.

import { ByteReader, ParseError } from './reader.js';
import { findRmidData } from './rmid.js';
import { buildTempoMap, makeTickToSeconds } from './tempo-map.js';
import { buildParts } from './parts.js';

export { ParseError };

/** File size limit, checked by the UI against `file.size` before reading. */
export const MAX_MIDI_BYTES = 4 * 1024 * 1024;
export const MAX_TRACKS = 256;
export const MAX_NOTES = 200000;
export const MAX_SONG_SECONDS = 3600;
export const MIN_NOTE_SECONDS = 0.005;

const SMPTE_RATES = [24, 25, 29, 30];

let utf8Decoder = null;
let cp1252Decoder = null;

/** Decodes meta text: strict UTF-8, else windows-1252; trailing NULs and whitespace trimmed. */
export function decodeText(bytes) {
  let s;
  try {
    if (!utf8Decoder) utf8Decoder = new TextDecoder('utf-8', { fatal: true });
    s = utf8Decoder.decode(bytes);
  } catch {
    try {
      if (!cp1252Decoder) cp1252Decoder = new TextDecoder('windows-1252');
      s = cp1252Decoder.decode(bytes);
    } catch {
      s = '';
      for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    }
  }
  return s.replace(/[\u0000\s]+$/, '');
}

function toView(input) {
  if (input instanceof ArrayBuffer) return new DataView(input);
  if (ArrayBuffer.isView(input)) return new DataView(input.buffer, input.byteOffset, input.byteLength);
  throw new ParseError('Not a MIDI file', 0);
}

/**
 * Parses one MTrk payload [start, end) into raw notes (ticks) and meta data.
 * A track that runs out of bytes mid-event keeps what was parsed, with a warning.
 */
function parseTrack(view, start, end, index, ctx) {
  const r = new ByteReader(view, start, end);
  const label = `Track ${index + 1}`;
  const warnings = ctx.warnings;
  const queues = new Map(); // channel * 128 + pitch → FIFO of open note-ons
  const notes = [];
  const tempos = [];
  const timeSigs = [];
  let name = null;
  let tick = 0;
  let lastTick = 0; // tick of the last complete event
  let running = 0; // last channel status, 0 = none
  let crossed = false; // a meta/SysEx event appeared since `running` was set
  let crossWarned = false;
  let openCount = 0;

  try {
    while (r.pos < r.end) {
      tick += r.vlq();
      const evOffset = r.pos;
      let status = r.u8();
      let data1;

      if (status < 0x80) {
        if (!running) throw new ParseError('Data byte without a preceding status byte', evOffset);
        if (crossed && !crossWarned) {
          warnings.push(`${label}: running status continued across a meta or SysEx event`);
          crossWarned = true;
        }
        data1 = status;
        status = running;
      } else if (status < 0xf0) {
        running = status;
        crossed = false;
        data1 = r.u8() & 0x7f;
      } else if (status === 0xff) {
        const type = r.u8();
        const len = r.vlq();
        const data = r.bytes(len); // declared length is always honoured
        lastTick = tick;
        crossed = true;
        if (type === 0x2f) break; // End of Track: ignore anything after it
        if (type === 0x03 && name === null) {
          const text = decodeText(data);
          if (text) name = text;
        } else if (type === 0x51 && data.length >= 3) {
          tempos.push({ tick, usPerQuarter: (data[0] << 16) | (data[1] << 8) | data[2], track: index });
        } else if (type === 0x58 && data.length >= 2 && data[0] > 0 && data[1] <= 10) {
          timeSigs.push({ tick, numerator: data[0], denominator: 2 ** data[1], track: index });
        }
        continue;
      } else if (status === 0xf0 || status === 0xf7) {
        // SysEx packet or continuation/escape: store nothing, skip by length.
        r.skip(r.vlq());
        lastTick = tick;
        crossed = true;
        continue;
      } else {
        warnings.push(`${label}: invalid status byte 0x${status.toString(16).toUpperCase()} at offset ${evOffset}; rest of track ignored`);
        break;
      }

      const kind = status & 0xf0;
      const channel = status & 0x0f;
      if (kind === 0xc0 || kind === 0xd0) {
        lastTick = tick;
        continue; // one data byte, already read
      }
      const data2 = r.u8() & 0x7f;
      lastTick = tick;

      if (kind === 0x90 && data2 > 0) {
        if (ctx.noteCount >= MAX_NOTES) {
          ctx.limitHit = true;
          break;
        }
        ctx.noteCount++;
        const key = channel * 128 + data1;
        let q = queues.get(key);
        if (!q) {
          q = [];
          queues.set(key, q);
        }
        q.push({ tick, velocity: data2 });
        openCount++;
      } else if (kind === 0x80 || kind === 0x90) {
        const q = queues.get(channel * 128 + data1);
        if (q && q.length) {
          const on = q.shift();
          openCount--;
          notes.push({ startTick: on.tick, endTick: tick, pitch: data1, velocity: on.velocity, track: index, channel });
        } else {
          ctx.unmatched++;
        }
      }
      // An (aftertouch), Bn (control change), En (pitch bend): not used.
    }
  } catch (e) {
    if (!(e instanceof ParseError) || !e.truncated) throw e;
    warnings.push(`${label} ends mid-event at offset ${e.offset}; the file may be truncated`);
  }

  if (openCount > 0) {
    for (const [key, q] of queues) {
      for (const on of q) {
        notes.push({ startTick: on.tick, endTick: lastTick, pitch: key % 128, velocity: on.velocity, track: index, channel: Math.floor(key / 128) });
      }
    }
    warnings.push(`${label}: ${openCount} note${openCount === 1 ? ' was' : 's were'} still on at the end of the track and ${openCount === 1 ? 'was' : 'were'} closed there`);
  }

  return { name, notes, tempos, timeSigs, lastTick };
}

function parseDivision(raw, offset, warnings) {
  if (raw & 0x8000) {
    const fpsCode = 256 - ((raw >> 8) & 0xff); // high byte is a negative two's-complement frame rate
    const ticksPerFrame = raw & 0xff;
    if (ticksPerFrame === 0) throw new ParseError('Invalid time division (0 ticks per frame)', offset);
    if (!SMPTE_RATES.includes(fpsCode)) warnings.push(`Unusual SMPTE frame rate ${fpsCode}`);
    return { type: 'smpte', fps: fpsCode === 29 ? 29.97 : fpsCode, ticksPerFrame };
  }
  if (raw === 0) throw new ParseError('Invalid time division (0 ticks per quarter note)', offset);
  return { type: 'ppq', ticksPerQuarter: raw };
}

/**
 * Parses an SMF (or RMID-wrapped SMF).
 * @param {ArrayBuffer} arrayBuffer
 * @returns {import('./types.js').Song}
 */
export function parseMidi(arrayBuffer) {
  const view = toView(arrayBuffer);
  const warnings = [];

  let start = 0;
  let end = view.byteLength;
  const rmid = findRmidData(view);
  if (rmid) {
    start = rmid.start;
    end = rmid.end;
  }

  // --- MThd ---
  const hr = new ByteReader(view, start, end);
  if (hr.remaining < 8 || hr.ascii4() !== 'MThd') throw new ParseError('Not a MIDI file', start);
  const headerLen = hr.u32();
  if (headerLen < 6) throw new ParseError('Invalid MIDI header length', start + 4);
  if (hr.remaining < 6) throw new ParseError('MIDI header is truncated', hr.pos);
  if (headerLen > hr.remaining) warnings.push('MIDI header is truncated');
  let format = hr.u16();
  const ntrks = hr.u16();
  const division = parseDivision(hr.u16(), start + 12, warnings);
  if (format === 2) warnings.push('Format 2 (independent patterns) is played as format 1');
  else if (format > 2) {
    warnings.push(`Unknown MIDI format ${format}; treated as format 1`);
    format = 1;
  }

  let trackLimit = Math.min(ntrks, MAX_TRACKS);
  if (ntrks > MAX_TRACKS) warnings.push(`File lists ${ntrks} tracks; only the first ${MAX_TRACKS} were read`);
  if (ntrks === 0) {
    warnings.push('Header lists 0 tracks');
    trackLimit = MAX_TRACKS;
  }

  // --- Chunks ---
  const ctx = { warnings, noteCount: 0, unmatched: 0, limitHit: false };
  const results = [];
  let pos = Math.min(start + 8 + headerLen, end);
  while (pos + 8 <= end && results.length < trackLimit && !ctx.limitHit) {
    const cr = new ByteReader(view, pos, end);
    const id = cr.ascii4();
    const len = cr.u32();
    const dataStart = pos + 8;
    let dataEnd = dataStart + len;
    if (dataEnd > end) {
      warnings.push(`Chunk "${id}" is truncated (${len} bytes declared, ${end - dataStart} present)`);
      dataEnd = end;
    }
    if (id === 'MTrk') results.push(parseTrack(view, dataStart, dataEnd, results.length, ctx));
    else warnings.push(`Skipped unknown chunk "${id}"`);
    pos = dataEnd;
  }
  if (results.length === 0) throw new ParseError('No tracks found', pos);
  if (ctx.limitHit) warnings.push(`Note limit (${MAX_NOTES}) reached; the rest of the file was ignored`);
  else if (ntrks > 0 && results.length < trackLimit) {
    warnings.push(`Header lists ${ntrks} tracks but only ${results.length} were found`);
  }
  if (ctx.unmatched > 0) {
    warnings.push(`${ctx.unmatched} note-off event${ctx.unmatched === 1 ? '' : 's'} had no matching note-on and ${ctx.unmatched === 1 ? 'was' : 'were'} ignored`);
  }

  // --- Timing ---
  const tempoEvents = [];
  for (const t of results) for (const e of t.tempos) tempoEvents.push(e);
  const tempoMap = buildTempoMap(tempoEvents, division, warnings);
  const tickToSeconds = makeTickToSeconds(tempoMap, division);

  const sigs = [];
  for (const t of results) for (const s of t.timeSigs) sigs.push(s);
  sigs.sort((a, b) => a.tick - b.tick || a.track - b.track);
  const timeSignatures = [];
  for (const s of sigs) {
    const last = timeSignatures[timeSignatures.length - 1];
    const sig = { tick: s.tick, numerator: s.numerator, denominator: s.denominator };
    if (last && last.tick === s.tick) timeSignatures[timeSignatures.length - 1] = sig;
    else timeSignatures.push(sig);
  }
  if (timeSignatures.length === 0 || timeSignatures[0].tick > 0) timeSignatures.unshift({ tick: 0, numerator: 4, denominator: 4 });

  // --- Notes, tracks, parts ---
  const notes = [];
  const tracks = [];
  let durationSeconds = 0;
  for (let i = 0; i < results.length; i++) {
    const t = results[i];
    const channels = new Set();
    for (const n of t.notes) {
      const s = tickToSeconds(n.startTick);
      const d = Math.max(MIN_NOTE_SECONDS, tickToSeconds(n.endTick) - s);
      notes.push({
        start: s,
        duration: d,
        startTick: n.startTick,
        durationTicks: n.endTick - n.startTick,
        pitch: n.pitch,
        velocity: n.velocity,
        track: n.track,
        channel: n.channel,
      });
      channels.add(n.channel);
      if (s + d > durationSeconds) durationSeconds = s + d;
    }
    tracks.push({ index: i, name: t.name, noteCount: t.notes.length, channels: Array.from(channels).sort((a, b) => a - b) });
    const trackEnd = tickToSeconds(t.lastTick);
    if (trackEnd > durationSeconds) durationSeconds = trackEnd;
  }
  notes.sort((a, b) => a.start - b.start || a.pitch - b.pitch);
  const parts = buildParts(notes, tracks, format);

  if (notes.length === 0) warnings.push('No notes found');
  if (durationSeconds > MAX_SONG_SECONDS) warnings.push('Song is longer than 1 hour');

  return { format, division, tracks, parts, notes, tempoMap, timeSignatures, durationSeconds, warnings };
}
