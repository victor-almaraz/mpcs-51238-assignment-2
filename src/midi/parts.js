// Part keys and labels (midi-decoding.md, "Parts"). A part is one (track, channel) pair with notes.

export const DRUM_CHANNEL = 9; // GM percussion, shown to users as channel 10

export function makePartKey(track, channel) {
  return `t${track}c${channel}`;
}

/** Part key of a note: `t${track}c${channel}`. */
export function partKey(note) {
  return makePartKey(note.track, note.channel);
}

/**
 * Label rules, in order:
 * 1. Base name: the track name, else `Track ${track + 1}`; format 0 with no name has no base.
 * 2. Append `Ch ${channel + 1}` (in parentheses after a base) when the track has more than one
 *    part, or when there is no base name.
 * 3. Channel index 9 appends `Drums` (skipped when the label already mentions drums).
 */
export function partLabel(trackName, track, channel, format, partsInTrack) {
  const base = trackName ? trackName : format === 0 ? null : `Track ${track + 1}`;
  let label;
  if (base === null) label = `Ch ${channel + 1}`;
  else if (partsInTrack > 1) label = `${base} (Ch ${channel + 1})`;
  else label = base;
  if (channel === DRUM_CHANNEL && !/drum/i.test(label)) label += ' Drums';
  return label;
}

/**
 * @param {{track:number, channel:number}[]} notes
 * @param {{index:number, name:string|null}[]} tracks  indexed by track number
 * @param {number} format
 * @returns {{key:string, track:number, channel:number, label:string, noteCount:number}[]}
 *   sorted by track, then channel
 */
export function buildParts(notes, tracks, format) {
  const byKey = new Map();
  for (const n of notes) {
    const key = partKey(n);
    let p = byKey.get(key);
    if (!p) {
      p = { key, track: n.track, channel: n.channel, label: '', noteCount: 0 };
      byKey.set(key, p);
    }
    p.noteCount++;
  }
  const parts = Array.from(byKey.values()).sort((a, b) => a.track - b.track || a.channel - b.channel);
  const perTrack = new Map();
  for (const p of parts) perTrack.set(p.track, (perTrack.get(p.track) || 0) + 1);
  for (const p of parts) {
    const t = tracks[p.track];
    p.label = partLabel(t ? t.name : null, p.track, p.channel, format, perTrack.get(p.track));
  }
  return parts;
}
