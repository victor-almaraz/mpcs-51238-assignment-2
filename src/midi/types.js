// Shapes produced by parseMidi (midi-decoding.md, "Output data structure"). Documentation only.

/**
 * @typedef {Object} Note
 * @property {number} start          seconds (tempo map already applied)
 * @property {number} duration       seconds, >= 0.005
 * @property {number} startTick
 * @property {number} durationTicks  may be 0 for zero-length notes
 * @property {number} pitch          0–127
 * @property {number} velocity       1–127
 * @property {number} track          MTrk index (0-based)
 * @property {number} channel        0–15
 */

/**
 * @typedef {Object} TrackInfo
 * @property {number} index
 * @property {string|null} name      track name meta (03), if any
 * @property {number} noteCount
 * @property {number[]} channels     channels with notes, ascending
 */

/**
 * @typedef {Object} PartInfo
 * @property {string} key            `t${track}c${channel}`, e.g. "t2c1"
 * @property {number} track
 * @property {number} channel        0–15
 * @property {string} label          e.g. "Bass", "Piano (Ch 1)", "Ch 10 Drums", "Track 3"
 * @property {number} noteCount
 */

/**
 * @typedef {Object} TempoSegment
 * @property {number} tick
 * @property {number} usPerQuarter
 * @property {number} seconds        time at `tick`
 */

/**
 * @typedef {{type:'ppq', ticksPerQuarter:number} | {type:'smpte', fps:number, ticksPerFrame:number}} Division
 */

/**
 * @typedef {Object} Song
 * @property {0|1|2} format
 * @property {Division} division
 * @property {TrackInfo[]} tracks
 * @property {PartInfo[]} parts      sorted by track, then channel
 * @property {Note[]} notes          sorted by start, then pitch
 * @property {TempoSegment[]} tempoMap
 * @property {{tick:number, numerator:number, denominator:number}[]} timeSignatures
 * @property {number} durationSeconds
 * @property {string[]} warnings     non-fatal problems
 */

export {};
