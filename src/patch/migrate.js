// Patch migration (patch-format.md, "Versioning and migration"). MIGRATIONS[i] is a pure
// function turning a version i+1 patch into version i+2. There are none yet.

import { CURRENT_VERSION, PatchError } from './schema.js';

export const MIGRATIONS = [];

/** Returns `raw` upgraded to CURRENT_VERSION. Throws PatchError for unknown or newer versions. */
export function migrate(raw) {
  const v = raw && typeof raw === 'object' ? raw.version : undefined;
  if (typeof v !== 'number') throw new PatchError('Missing version');
  if (v > CURRENT_VERSION) throw new PatchError('Made with a newer version');
  if (!Number.isInteger(v) || v < 1) throw new PatchError('Unsupported version');
  let out = raw;
  for (let from = v; from < CURRENT_VERSION; from++) out = MIGRATIONS[from - 1](out);
  return out;
}
