// Patch validation for untrusted input (patch-format.md, "Validation" and "Part fallback").
// Objects are built from the PARAM_DEFS whitelist only; parsed objects are never spread or
// assigned, so `__proto__` keys and other prototype tricks have no effect.

import { PARAM_DEFS, VOLUME, coerceParam, coerceVolume } from '../audio/synths/param-defs.js';
import { MAX_WIDGETS, PatchError } from './schema.js';
import { migrate } from './migrate.js';

export { PatchError };

const PART_RE = /^t\d{1,3}c\d{1,2}$/;
const MAX_LABEL_LENGTH = 200;

function hasOwn(o, k) {
  return Object.prototype.hasOwnProperty.call(o, k);
}

function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function sameValue(a, b) {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }
  return a === b;
}

/**
 * Resolves a requested part against the loaded song ("Part fallback").
 * @param {unknown} requested  "all" or a part key such as "t2c1"
 * @param {{parts:{key:string}[]}|null} song
 * @param {string[]} warnings  receives a message when the part cannot be used
 * @param {string|null} [label] the part's label at save time, used in the warning
 * @returns {{part:string, requestedPart:string|null}}  requestedPart is non-null only while a
 *   valid key is waiting for a matching MIDI file
 */
export function resolvePart(requested, song, warnings, label) {
  if (requested === 'all') return { part: 'all', requestedPart: null };
  if (typeof requested !== 'string' || !PART_RE.test(requested)) {
    warnings.push('Invalid part; using All parts');
    return { part: 'all', requestedPart: null };
  }
  const name = typeof label === 'string' && label ? label : requested;
  if (!song) {
    warnings.push(`Part '${name}' needs a MIDI file; using All parts until one is loaded`);
    return { part: 'all', requestedPart: requested };
  }
  const found = Array.isArray(song.parts) && song.parts.some((p) => p && p.key === requested);
  if (found) return { part: requested, requestedPart: null };
  warnings.push(`Part '${name}' not in this file`);
  return { part: 'all', requestedPart: requested };
}

/**
 * Parses and validates patch JSON text.
 * @param {string} text
 * @param {Object|null} song  the loaded Song, or null
 * @returns {{widgets:{type:string, muted:boolean, solo:boolean, volumeDb:number, part:string,
 *   requestedPart:string|null, partLabel:string|null, params:Object}[], warnings:string[]}}
 *   volumeDb is a number in [-60, 0] or -Infinity (Off)
 */
export function parsePatch(text, song) {
  let raw;
  try {
    if (typeof text !== 'string') throw new Error();
    raw = JSON.parse(text);
  } catch {
    throw new PatchError('Not valid JSON');
  }
  if (!isObject(raw) || typeof raw.version !== 'number') throw new PatchError('Missing version');
  raw = migrate(raw);
  if (!isObject(raw) || !Array.isArray(raw.widgets)) throw new PatchError('Missing widgets');

  const warnings = [];
  if (raw.widgets.length > MAX_WIDGETS) {
    warnings.push(`Only the first ${MAX_WIDGETS} of ${raw.widgets.length} widgets were loaded`);
  }
  const widgets = [];
  const list = raw.widgets.slice(0, MAX_WIDGETS);
  for (let i = 0; i < list.length; i++) {
    const w = list[i];
    const prefix = `Widget ${i + 1}: `;
    if (!isObject(w) || typeof w.type !== 'string' || !hasOwn(PARAM_DEFS, w.type)) {
      warnings.push(`${prefix}unknown type, skipped`);
      continue;
    }
    const type = w.type;

    const src = isObject(w.params) ? w.params : null;
    const params = {};
    for (const def of PARAM_DEFS[type]) {
      const present = src !== null && hasOwn(src, def.name);
      const value = coerceParam(def, present ? src[def.name] : undefined);
      if (present && !sameValue(value, src[def.name])) warnings.push(`${prefix}${def.label} adjusted`);
      params[def.name] = value;
    }

    const volumeDb = coerceVolume(w.volumeDb, VOLUME.widgetDefault);
    if (hasOwn(w, 'volumeDb') && !(w.volumeDb === 'off' ? volumeDb === -Infinity : volumeDb === w.volumeDb)) {
      warnings.push(`${prefix}Volume adjusted`);
    }

    let partLabel = typeof w.partLabel === 'string' && w.partLabel ? w.partLabel.slice(0, MAX_LABEL_LENGTH) : null;
    const partWarnings = [];
    const { part, requestedPart } = resolvePart(w.part, song, partWarnings, partLabel);
    for (const m of partWarnings) warnings.push(prefix + m);
    if (part !== 'all') {
      const info = song.parts.find((p) => p && p.key === part);
      if (info && typeof info.label === 'string') partLabel = info.label;
    } else if (requestedPart === null) {
      partLabel = null;
    }

    widgets.push({ type, muted: w.muted === true, solo: w.solo === true, volumeDb, part, requestedPart, partLabel, params });
  }
  return { widgets, warnings };
}
