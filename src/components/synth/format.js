// Display formatting for values (controls-and-accessibility.md "Unit formatting").

const MINUS = '−';

function signed(x, digits) {
  const s = Math.abs(x).toFixed(digits);
  return x < 0 && Number(s) !== 0 ? `${MINUS}${s}` : s;
}

export function formatHz(hz) {
  return hz < 1000 ? `${Math.round(hz)} Hz` : `${(hz / 1000).toFixed(1)} kHz`;
}

export function formatTime(s) {
  return s < 1 ? `${Math.round(s * 1000)} ms` : `${s.toFixed(2)} s`;
}

export function formatDb(db) {
  if (!Number.isFinite(db)) return `${MINUS}∞ dB`;
  return `${signed(db, 1)} dB`;
}

export function formatVolume(db) {
  return Number.isFinite(db) ? formatDb(db) : 'Off';
}

export function formatRatio(x) {
  return `×${x.toFixed(1)}`;
}

export function formatPercent(x) {
  return `${Math.round(x * 100)} %`;
}

export function formatParam(def, v) {
  switch (def.unit) {
    case 'Hz': return formatHz(v);
    case 's': return formatTime(v);
    case 'dB': return formatDb(v);
    case 'ratio': return formatRatio(v);
    case 'index': return v.toFixed(1);
    case 'per-s': return `${v < 10 ? v.toFixed(1) : Math.round(v)} /s`;
    case 'fraction': return formatPercent(v);
    default: return String(v);
  }
}

/** 190 → "3:10" */
export function formatClock(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** 133 → "02:13" (recording elapsed/limit). */
export function formatClock2(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
