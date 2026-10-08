// Patch schema constants and serialization (patch-format.md). Volume is stored in dB as
// `volumeDb` (number in [-60, 0]) or "off". Arming, ids and names are session state.

import { PARAM_DEFS, VOLUME, VOLUME_OFF, coerceVolume } from '../audio/synths/param-defs.js';

export const CURRENT_VERSION = 1;
export const APP_ID = 'synth-rack';
export const MAX_PATCH_BYTES = 256 * 1024;
export const MAX_WIDGETS = 24;

/** Error shown to the user as "Couldn't load patch: <message>". */
export class PatchError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PatchError';
  }
}

function serializeVolume(v) {
  const db = coerceVolume(v, VOLUME.widgetDefault);
  return db === VOLUME_OFF ? 'off' : db;
}

function serializeWidget(w) {
  const part = w.requestedPart ?? w.part ?? 'all';
  const out = {
    type: w.type,
    muted: w.muted === true,
    solo: w.solo === true,
    volumeDb: serializeVolume(w.volumeDb),
    part,
  };
  if (part !== 'all' && typeof w.partLabel === 'string' && w.partLabel) out.partLabel = w.partLabel;
  const params = {};
  const src = w.params || {};
  const defs = PARAM_DEFS[w.type] || [];
  for (const d of defs) {
    const v = src[d.name];
    params[d.name] = Array.isArray(v) ? v.slice() : v;
  }
  out.params = params;
  return out;
}

/**
 * @param {{type:string, muted:boolean, solo:boolean, volumeDb:number, part:string,
 *          requestedPart:string|null, partLabel:string|null, params:Object}[]} widgets
 * @returns {{version:number, app:string, widgets:Object[]}}  plain object ready for JSON.stringify
 */
export function serializePatch(widgets) {
  return { version: CURRENT_VERSION, app: APP_ID, widgets: widgets.map(serializeWidget) };
}
