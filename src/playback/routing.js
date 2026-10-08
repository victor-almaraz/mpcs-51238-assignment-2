// Routing by part and mute/solo (midi-playback-scheduling.md). A target is
// { id, part, muted, solo, audible?, inst } as returned by engine.targets().

export function partKey(note) {
  return `t${note.track}c${note.channel}`;
}

export function anySolo(targets) {
  return targets.some((w) => !!w.solo);
}

/** Mute wins over solo when both are set on the same widget. */
export function isAudible(w, soloActive) {
  return !w.muted && (!soloActive || !!w.solo);
}

/** noteOn at `t` and noteOff at `t + duration` on every audible widget playing this part. */
export function dispatch(targets, note, t) {
  const key = partKey(note);
  let solo = null;
  for (const w of targets) {
    if (!w.inst) continue;
    let audible = w.audible;
    if (typeof audible !== 'boolean') {
      if (solo === null) solo = anySolo(targets);
      audible = isAudible(w, solo);
    }
    if (!audible) continue;
    if (w.part !== 'all' && w.part !== key) continue;
    w.inst.noteOn(note.pitch, note.velocity, t, 'file');
    w.inst.noteOff(note.pitch, t + note.duration, 'file');
  }
}
