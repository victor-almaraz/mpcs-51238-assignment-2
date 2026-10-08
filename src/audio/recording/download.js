// Blob download helper and WAV filename builder (recording.md).

export const REVOKE_DELAY_MS = 30000;   // (project limit)

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.hidden = true;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}

/**
 * kind: 'live' | 'render'; format: 'pcm16' | 'float32'.
 * e.g. synth-live-20261007-143205-48k-16.wav, mysong-render-20261007-143205-48k-f32.wav
 * `date` is optional (for tests); defaults to now.
 */
export function wavFilename(kind, sampleRate, format, songName, date) {
  const d = date instanceof Date ? date : new Date();
  const z = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}`;
  const base = String(songName ?? 'synth')
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, '')
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'synth';
  const rate = sampleRate === 44100 ? '44.1k' : `${Math.round(sampleRate / 1000)}k`;
  return `${base}-${kind}-${stamp}-${rate}-${format === 'float32' ? 'f32' : '16'}.wav`;
}
