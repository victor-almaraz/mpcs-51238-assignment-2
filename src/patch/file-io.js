// Patch save/load through files only (patch-format.md, "Save" and "Load").
// DOM APIs are used at call time only, never at import time.

import { MAX_PATCH_BYTES, PatchError, serializePatch } from './schema.js';

export const PATCH_FILENAME = 'synth-rack-patch.json';

/** Starts a download of the serialized rack. The browser does not report completion. */
export function savePatch(widgets) {
  const json = JSON.stringify(serializePatch(widgets), null, 2);
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = PATCH_FILENAME;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Reads a chosen patch file as text. Rejects with PatchError when it is over 256 KB
 * (checked before reading) or cannot be read.
 * @param {File} file
 * @returns {Promise<string>}
 */
export function readPatchFile(file) {
  if (!file || typeof file.text !== 'function') return Promise.reject(new PatchError('No file selected'));
  if (file.size > MAX_PATCH_BYTES) return Promise.reject(new PatchError('File is larger than 256 KB'));
  return file.text().catch(() => {
    throw new PatchError("Couldn't read the file");
  });
}
