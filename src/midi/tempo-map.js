// Tempo map and tick → seconds conversion (midi-decoding.md, "Tempo map and tick → seconds").

export const DEFAULT_US_PER_QUARTER = 500000; // 120 BPM

/**
 * Builds tempo segments from every track's FF 51 events.
 * @param {{tick:number, usPerQuarter:number, track:number}[]} events  in file order per track
 * @param {{type:'ppq', ticksPerQuarter:number}|{type:'smpte', fps:number, ticksPerFrame:number}} division
 * @param {string[]} warnings  receives a warning for invalid (zero) tempos
 * @returns {{tick:number, usPerQuarter:number, seconds:number}[]}  starts at tick 0, ascending ticks
 *
 * Under SMPTE timing tempo has no effect on timing; the segments are still listed, and their
 * `seconds` field is the SMPTE time of their tick.
 */
export function buildTempoMap(events, division, warnings) {
  // Stable sort by tick then track keeps file order within a track; the last change on a tick wins.
  const sorted = events
    .map((e, i) => ({ tick: e.tick, usPerQuarter: e.usPerQuarter, track: e.track, i }))
    .sort((a, b) => a.tick - b.tick || a.track - b.track || a.i - b.i);

  const segs = [];
  let zeroWarned = false;
  for (const e of sorted) {
    let us = e.usPerQuarter;
    if (!(us > 0)) {
      us = DEFAULT_US_PER_QUARTER;
      if (!zeroWarned) {
        warnings.push('Tempo of 0 is invalid; used 120 BPM instead');
        zeroWarned = true;
      }
    }
    const last = segs[segs.length - 1];
    if (last && last.tick === e.tick) last.usPerQuarter = us;
    else segs.push({ tick: e.tick, usPerQuarter: us, seconds: 0 });
  }
  if (segs.length === 0 || segs[0].tick > 0) segs.unshift({ tick: 0, usPerQuarter: DEFAULT_US_PER_QUARTER, seconds: 0 });

  if (division.type === 'smpte') {
    const tps = division.fps * division.ticksPerFrame;
    for (const s of segs) s.seconds = s.tick / tps;
  } else {
    const ppq = division.ticksPerQuarter;
    for (let i = 1; i < segs.length; i++) {
      const p = segs[i - 1];
      segs[i].seconds = p.seconds + ((segs[i].tick - p.tick) * p.usPerQuarter) / 1e6 / ppq;
    }
  }
  return segs;
}

/** Index of the last segment with tick <= t (segments are ascending and start at tick 0). */
function findSegment(segs, t) {
  let lo = 0;
  let hi = segs.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (segs[mid].tick <= t) lo = mid;
    else hi = mid - 1;
  }
  return segs[lo];
}

/** Returns a `tickToSeconds(tick)` function for the given segments and division. */
export function makeTickToSeconds(segs, division) {
  if (division.type === 'smpte') {
    const tps = division.fps * division.ticksPerFrame;
    return (t) => t / tps;
  }
  const ppq = division.ticksPerQuarter;
  return (t) => {
    const s = findSegment(segs, t);
    return s.seconds + ((t - s.tick) * s.usPerQuarter) / 1e6 / ppq;
  };
}
