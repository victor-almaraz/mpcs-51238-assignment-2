'use client';

import { useImperativeHandle, useRef } from 'react';
import { cx } from '../classes';

const FLOOR_DB = -60;
const LABEL_INTERVAL_MS = 1000;

/** Maps dBFS to 0–1 on the −60…0 scale; anything below −60 (or not finite) is 0. */
function toFraction(db) {
  if (!Number.isFinite(db) || db < FLOOR_DB) return 0;
  return Math.min(1, (db - FLOOR_DB) / -FLOOR_DB);
}

/** "−12.3", "0.0", "−∞" (U+2212 minus). */
function formatDb(db) {
  if (!Number.isFinite(db) || db < FLOOR_DB) return '−∞';
  const s = Math.abs(db).toFixed(1);
  return db < 0 && s !== '0.0' ? `−${s}` : s;
}

/**
 * Horizontal level meter, −60…0 dBFS: RMS fill, peak tick, peak-hold tick and
 * numeric peak. Drive it per animation frame through the ref:
 *   meterRef.current.update({ peakDb, rmsDb, holdDb })
 * update() writes CSS variables and text directly (no React render). The
 * numeric readout shows the held peak when holdDb is given (steadier to read),
 * else the instantaneous peak. aria-label updates at most once per second.
 */
export default function Meter({ ref, label = 'Output level', className, ...rest }) {
  const rootRef = useRef(null);
  const textRef = useRef(null);
  const lastText = useRef('−∞');
  const lastLabelAt = useRef(-Infinity);

  useImperativeHandle(
    ref,
    () => ({
      update({ peakDb, rmsDb, holdDb } = {}) {
        const root = rootRef.current;
        if (!root) return;
        root.style.setProperty('--meter-rms', toFraction(rmsDb).toFixed(4));
        root.style.setProperty('--meter-peak', toFraction(peakDb).toFixed(4));
        root.style.setProperty('--meter-hold', toFraction(holdDb).toFixed(4));

        const shown = Number.isFinite(holdDb) ? holdDb : peakDb;
        const text = formatDb(shown);
        if (text !== lastText.current && textRef.current) {
          lastText.current = text;
          textRef.current.textContent = `${text} dB`;
        }

        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        if (now - lastLabelAt.current >= LABEL_INTERVAL_MS) {
          lastLabelAt.current = now;
          const next = `${label}: peak ${text} dBFS`;
          if (root.getAttribute('aria-label') !== next) root.setAttribute('aria-label', next);
        }
      },
    }),
    [label],
  );

  return (
    <div
      ref={rootRef}
      role="img"
      aria-label={`${label}: peak −∞ dBFS`}
      className={cx('flex min-w-0 items-center gap-2', className)}
      {...rest}
    >
      <div className="relative h-3 min-w-8 flex-1 overflow-hidden rounded-ds border border-border-strong bg-surface">
        <div className="absolute inset-y-0 left-0 w-[calc(var(--meter-rms,0)*100%)] bg-muted" />
        <div className="absolute inset-y-0 w-px bg-fg left-[calc(var(--meter-hold,0)*100%_-_1px)]" />
        <div className="absolute inset-y-0 w-0.5 bg-fg left-[calc(var(--meter-peak,0)*100%_-_2px)]" />
      </div>
      <span ref={textRef} className="w-16 shrink-0 text-right text-sm tabular-nums">
        −∞ dB
      </span>
    </div>
  );
}
