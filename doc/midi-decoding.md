# MIDI decoding

## Scope
A hand-written parser for Standard MIDI Files (SMF) and the RMID wrapper. It takes an `ArrayBuffer` and returns a `Song`. Playback scheduling is in `midi-playback-scheduling.md`.

## Output data structure
```ts
type Note = {
  start: number;      // seconds (tempo map already applied)
  duration: number;   // seconds, > 0
  startTick: number;
  durationTicks: number;
  pitch: number;      // 0–127
  velocity: number;   // 1–127
  track: number;      // MTrk index (0-based)
  channel: number;    // 0–15
};
type TrackInfo = { index: number; name: string | null; noteCount: number; channels: number[] };
type PartInfo = {
  key: string;        // `t${track}c${channel}`, e.g. "t2c1"
  track: number;
  channel: number;    // 0–15
  label: string;      // see "Parts"
  noteCount: number;
};
type TempoSegment = { tick: number; usPerQuarter: number; seconds: number };
type Song = {
  format: 0 | 1 | 2;
  division: { type: 'ppq'; ticksPerQuarter: number } | { type: 'smpte'; fps: number; ticksPerFrame: number };
  tracks: TrackInfo[];
  parts: PartInfo[];    // one per (track, channel) pair that has notes; sorted by track, then channel
  notes: Note[];        // sorted by start, then pitch
  tempoMap: TempoSegment[];
  timeSignatures: { tick: number; numerator: number; denominator: number }[];
  durationSeconds: number;
  warnings: string[];   // non-fatal problems (truncation, unknown chunks, unmatched note-offs)
};
```

## Byte-level rules
- Byte order:
  - All multi-byte integers in SMF are **big-endian**.
  - RMID/RIFF sizes are **little-endian**.
- **Chunk:** 4-byte ASCII type, then 4-byte length, then data. Unrecognised chunk types are skipped by their length, never treated as errors.
- **MThd:** `"MThd"`, length (normally 6), then `format` (u16), `ntrks` (u16), `division` (u16).
  - Honour the length even if it is greater than 6. The spec warns that more header fields may be added.
  - Format values:
    - 0: one multi-channel track.
    - 1: simultaneous tracks; the tempo map lives in the first track.
    - 2: independent patterns played in sequence, each with its own tempo.
  - Format 2 is treated as format 1, with a warning.
- **Division:**
  - Bit 15 clear: ticks per quarter note (PPQ).
  - Bit 15 set: SMPTE timing.
    - The high byte is a negative two's-complement frame rate: −24, −25, −29 or −30.
    - The low byte is ticks per frame.
  - −29 means 29.97 drop-frame (`fps = 29.97`).
  - Under SMPTE timing, `seconds = tick / (fps * ticksPerFrame)`. Tempo meta events have no effect on timing.
- **MTrk:** `"MTrk"`, length, then a sequence of `<delta VLQ><event>`.
- **Variable-length quantity (VLQ):**
  - 7 bits per byte, MSB first. A set high bit means another byte follows.
  - At most 4 bytes, so the max value is `0x0FFFFFFF`.
  - A 5th continuation byte means the file is corrupt.
```ts
function readVLQ(v: DataView, p: { o: number }, end: number): number {
  let value = 0;
  for (let i = 0; i < 4; i++) {
    if (p.o >= end) throw new ParseError('VLQ past end', p.o);
    const b = v.getUint8(p.o++);
    value = (value << 7) | (b & 0x7f);
    if ((b & 0x80) === 0) return value;
  }
  throw new ParseError('VLQ longer than 4 bytes', p.o);
}
```

## Events
| Status | Event | Data bytes |
|---|---|---|
| `8n` | Note off | key, velocity |
| `9n` | Note on (velocity 0 = note off) | key, velocity |
| `An` | Poly aftertouch | key, pressure |
| `Bn` | Control change | controller, value |
| `Cn` | Program change | program (1 byte) |
| `Dn` | Channel pressure | pressure (1 byte) |
| `En` | Pitch bend | LSB, MSB (14-bit, centre 8192) |
| `F0` | SysEx | VLQ length, bytes (should end in F7) |
| `F7` | SysEx continuation / escape | VLQ length, bytes |
| `FF` | Meta | type byte, VLQ length, bytes |

**Running status**
- A data byte (< 0x80) where a status byte should be means "reuse the previous channel status". Running status carries across delta-times.
- Per the spec, SysEx and meta events cancel running status. Some files in circulation rely on running status surviving across meta events (MIDI.org forum).
- Defensive rule:
  - If a data byte appears and the last *channel* status is known, apply it and add one warning.
  - If there is no prior channel status, throw `ParseError`.

**SysEx**
- Store nothing; skip the bytes by length.
- An `F7` event with no open `F0` packet is an "escape": arbitrary bytes, no terminating F7 needed.
- `F1`–`F6` and `F8`–`FE` are not valid as raw statuses in a file. Treat them as corruption: warn, then stop parsing that track.

**Meta events to handle**
| Type | Name | Payload | Use |
|---|---|---|---|
| `00` | Sequence number | 2 bytes | ignore |
| `01`–`07` | Text, copyright, **track name (03)**, instrument, lyric, marker, cue | text | track name → `TrackInfo.name` |
| `20` | Channel prefix | 1 byte | ignore |
| `21` | Port prefix | 1 byte | ignore |
| `2F` | **End of track** | len 0 | stop the track; ignore bytes after it |
| `51` | **Set tempo** | 3 bytes, µs per quarter note (big-endian u24) | tempo map |
| `54` | SMPTE offset | 5 bytes | ignore |
| `58` | **Time signature** | nn dd cc bb; denominator = 2^dd | UI only |
| `59` | Key signature | sf mi | ignore |
| `7F` | Sequencer-specific | bytes | ignore |

- Meta lengths:
  - Even for known types, the declared length may differ from the expected size.
  - The parser reads the bytes it needs, if present, then skips by the declared length.
  - Per the spec, a program must never ignore the length of a meta event it recognizes, must expect it to be longer than the defined size, and must ignore bytes past the fields it knows. Unrecognized meta events are skipped by length.
- If a file has no tempo or time signature, assume 120 BPM (`500000` µs/quarter) and 4/4, as the spec says.
- Text encoding is unspecified:
  - Decode with `new TextDecoder('utf-8', { fatal: true })`.
  - On error, fall back to `new TextDecoder('windows-1252')`.
  - Trim trailing NULs and whitespace.

## Note pairing
- Key every open note by `(track, channel, pitch)` and keep a **FIFO queue** of open note-ons per key.
- Closing notes:
  - A note-off, or a note-on with velocity 0, closes the oldest open note on that key.
  - If nothing is open on that key, add a warning and ignore the event.
- Overlapping same-pitch note-ons are legal. Each one starts a new note.
- Zero-length notes (off at the same tick as on): keep them with `durationTicks = 0`, and clamp `duration` to at least 0.005 s so voices still sound.
- Notes still open at the end of a track: close them at the track's last tick and add a warning.
- GM percussion is on channel 10 (index 9). Those notes are kept and labelled as drums (see "Parts").

## Tempo map and tick → seconds
1. Collect every `FF 51` from **all** tracks with its absolute tick. The spec puts them in track 0 for format 1, but merge all tracks defensively.
2. Sort by tick, then by track order. When two changes share a tick, the last one wins.
3. If the first change is at tick > 0, insert the default segment `{tick:0, usPerQuarter:500000}`.
4. Accumulate seconds across segments:
```ts
seg[i].seconds = seg[i-1].seconds + (seg[i].tick - seg[i-1].tick) * seg[i-1].usPerQuarter / 1e6 / ppq;
function tickToSeconds(t: number): number {
  const s = findLastSegmentWithTickLE(t);   // binary search
  return s.seconds + (t - s.tick) * s.usPerQuarter / 1e6 / ppq;
}
```
- `duration = tickToSeconds(endTick) - tickToSeconds(startTick)`. Never multiply ticks by a single tempo.
- A tempo of 0 (`usPerQuarter = 0`, i.e. infinite BPM) is invalid. Treat it as 500000 and warn.

## Merging tracks
- Steps:
  1. Parse each track into absolute-tick events on its own.
  2. Convert to `Note[]`.
  3. Concatenate all tracks and sort by `(start, pitch)`.
- Each note keeps `track` and `channel` for routing (`midi-playback-scheduling.md`).

## Parts
- A **part** is one `(track, channel)` pair that contains at least one note. Parts are the unit of routing: each widget plays one part or all parts.
- This covers every file layout:
  - Format 0: one track, so parts are its channels (`t0c0`, `t0c1`, …).
  - Format 1 with one channel per track: one part per track.
  - Format 1 with several channels in one track: one part per channel in that track.
- Part key: `` `t${track}c${channel}` ``. Keys are stable for a given file, which `patch-format.md` relies on.
- Label rules, applied in order:
  1. Base name: the track name (meta `03`) if present, else `Track ${track + 1}`. Format 0 files with no track name use no base name.
  2. Append `Ch ${channel + 1}` in parentheses when the track has more than one part, or when there is no base name.
  3. Channel index 9 appends `Drums`.
  - Examples: `Bass`, `Piano (Ch 1)`, `Piano (Ch 2)`, `Ch 10 Drums`, `Track 3`.
- Program change, bank select and other channel messages are not used for routing or for choosing a synth type. Mapping parts to widgets is user-defined.

## RMID (RIFF-wrapped MIDI, `.rmi`)
- Detect it by the bytes `"RIFF"`, a u32 little-endian size, then `"RMID"`.
- The parser walks chunks until it reaches `"data"`:
  - Each chunk is a 4-byte id, a u32 little-endian size, the data, then a pad byte if the size is odd.
  - The `data` payload must start with `"MThd"`. Parse it as an SMF.
- Ignore other chunks (`LIST`/`INFO`, `DISP`, embedded DLS/SF2 banks).
- `data` is not assumed to be the first chunk.

## Defensive limits (project limits, not spec values)
| Limit | Value | On violation |
|---|---|---|
| File size | 4 MB | reject before reading (`file.size`) |
| Track count read | `min(ntrks, 256)` | warn, ignore the rest |
| Chunk length > remaining bytes | read to end of buffer | warn ("truncated") and continue |
| Notes | 200 000 | stop parsing, warn |
| Song length | 1 hour | warn |
| Missing `MThd` at offset 0 (and not RMID) | — | `ParseError('Not a MIDI file')` |

- Read every byte through bounds-checked helpers that know the chunk's end offset. Never read past the chunk end, even if the declared length is wrong.
- Parsing is synchronous. The UI still shows the loading state (`controls-and-accessibility.md`).
- Errors:
  - Throw `ParseError(message, offset)`.
  - The UI shows "Couldn't read this MIDI file" plus the message.
  - Warnings never block playback.

## Test fixtures
Fixtures are generated by code at test time; no binary MIDI files are committed. Cases:
1. Format 0, PPQ 480, one note C4 lasting one quarter at the default tempo. Expect start 0, duration 0.5 s.
2. Format 1, tempo change at tick 960 from 120 to 60 BPM, with notes spanning the change. Checks the tempo map.
3. Running status, including a meta event between running-status notes.
4. Note-on velocity 0 used as note-off.
5. Two overlapping note-ons on the same pitch. Expect two notes, FIFO pairing.
6. SMPTE division (−25, 40). Expect 1000 ticks/s.
7. Truncated file (cut mid-track). Expect the notes before the cut plus a warning.
8. Random bytes, an empty file, and `MThd` with length 10. Expect an error or a tolerant parse, whichever applies.
9. RMID wrapper around fixture 1.
10. An unknown chunk type `"XFIH"` between tracks. Expect it to be skipped.

## Sources
- Standard MIDI-File Format Spec 1.1, MIDI Manufacturers Association (mirror: https://midimusic.github.io/tech/midispec.html)
- Somascape, MIDI Files technical specification (http://www.somascape.org/midi/tech/mfile.html)
- MIDI.org forum, "Running status observation" (https://midi.org/community/creating-with-midi/running-status-observation-plus-other-updates-in-my-editor)
- IBM/Microsoft, Multimedia Programming Interface and Data Specifications 1.0 (RIFF/RMID) (https://www.aelius.com/njh/wavemetatools/doc/riffmci.pdf)
- Library of Congress, RMID format description (https://www.loc.gov/preservation/digital/formats/fdd/fdd000120.shtml)
