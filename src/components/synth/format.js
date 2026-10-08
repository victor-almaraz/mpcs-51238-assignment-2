// Display formatting for values (controls-and-accessibility.md "Unit formatting").

const MINUS = '−';

function signed(x, digits) {
  const s = Math.abs(x).toFixed(digits);
  return x < 0 && Number(s) !== 0 ? `${MINUS}${s}` : s;
}

export function formatHz(hz) {
  if (hz < 10) return `${hz.toFixed(1)} Hz`;          // LFO rates
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
    case 'offset': return `${v > 0 ? '+' : ''}${signed(v, 2)}`;
    case 'oct': return `${v.toFixed(1)} oct`;
    case 'cents': return `${Math.round(v)} cents`;
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

// ----- typed values (the editable value fields) -----

// Suffixes accepted per PARAM_DEFS unit, as multipliers to the stored unit.
const UNIT_SCALES = {
  Hz: { hz: 1, k: 1000, khz: 1000 },
  s: { s: 1, ms: 0.001 },
  dB: { db: 1 },
  ratio: { x: 1 },
  offset: {},
  oct: { oct: 1 },
  cents: { cents: 1, ct: 1 },
  index: {},
  'per-s': { '/s': 1 },
  fraction: { '%': 0.01 },
};

const NUMBER = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*(.*)$/;

/** "−2,5 kHz" → [−2.5, 'khz']; a leading × or x is dropped. Null when there is no number. */
function splitNumber(text) {
  const t = String(text).trim().toLowerCase().replace(/−/g, '-').replace(/,/g, '.').replace(/^[×x]\s*/, '');
  const m = NUMBER.exec(t);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? [n, m[2].trim()] : null;
}

/**
 * Parses a typed value for `def` into its stored unit, or null when it cannot be read.
 * A bare number takes the unit currently shown (`current`, e.g. "10 ms" makes "20" mean
 * 20 ms). Range clamping and step snapping are left to coerceParam.
 */
export function parseParam(def, text, current = '') {
  const typed = splitNumber(text);
  if (!typed) return null;
  const [n, written] = typed;
  const unit = written || (splitNumber(current)?.[1] ?? '');
  if (unit === '') return n;
  const scale = (UNIT_SCALES[def.unit] ?? {})[unit];
  return scale === undefined ? null : n * scale;
}

/** Parses a typed volume: "Off", "-inf" or "−∞" give −Infinity; otherwise dB. Null when unreadable. */
export function parseVolume(text) {
  const t = String(text).trim().toLowerCase().replace(/−/g, '-').replace(/\s*db$/, '');
  if (t === 'off' || t === '-inf' || t === '-∞') return -Infinity;
  const typed = splitNumber(t);
  return typed && typed[1] === '' ? typed[0] : null;
}
