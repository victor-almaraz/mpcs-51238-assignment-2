'use client';

import { useLayoutEffect, useRef } from 'react';
import { cx, focusRing } from '../classes';

const PAGE = 0.1;
/** Pointer positions this far outside every bar (px) are ignored; equals the gap. */
const HIT_SLOP = 8;

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

function snap(v, step) {
  const s = step > 0 ? Math.round(v / step) * step : v;
  return clamp01(Number(s.toFixed(6)));
}

function defaultItemLabel(i) {
  return `Harmonic ${i + 1}`;
}

function defaultValueText(v) {
  return `${Math.round(v * 100)} %`;
}

/**
 * Row of custom vertical sliders (harmonic bars), values 0–1.
 * Fill heights are written to a --level CSS variable through refs.
 */
export default function SliderGroup({
  label,
  values,
  onChange,
  itemLabel = defaultItemLabel,
  valueText = defaultValueText,
  disabled = false,
  step = 0.01,
  className,
  ref,
  ...rest
}) {
  const barRefs = useRef([]);
  const valuesRef = useRef(values);
  const dragPointer = useRef(null);

  // Layout effect so fills update in the same frame as a drag (no SSR warning in React 19).
  useLayoutEffect(() => {
    valuesRef.current = values;
    values.forEach((v, i) => {
      barRefs.current[i]?.style.setProperty('--level', String(clamp01(v)));
    });
  }, [values]);

  function commit(i, raw) {
    const next = snap(raw, step);
    if (next !== valuesRef.current[i]) onChange(i, next);
  }

  function barIndexAt(clientX) {
    let best = -1;
    let bestDist = Infinity;
    barRefs.current.forEach((el, i) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const d = clientX < r.left ? r.left - clientX : clientX > r.right ? clientX - r.right : 0;
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return bestDist <= HIT_SLOP ? best : -1;
  }

  function setFromPointer(e) {
    const i = barIndexAt(e.clientX);
    if (i < 0) return -1;
    const r = barRefs.current[i].getBoundingClientRect();
    if (r.height > 0) commit(i, 1 - (e.clientY - r.top) / r.height);
    return i;
  }

  function handlePointerDown(e) {
    if (disabled) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const i = barIndexAt(e.clientX);
    if (i < 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragPointer.current = e.pointerId;
    barRefs.current[i]?.focus({ preventScroll: true });
    setFromPointer(e);
  }

  function handlePointerMove(e) {
    if (dragPointer.current !== e.pointerId) return;
    setFromPointer(e);
  }

  function handlePointerEnd(e) {
    if (dragPointer.current === e.pointerId) dragPointer.current = null;
  }

  function handleKeyDown(e, i) {
    if (disabled) return;
    const v = values[i];
    let next;
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowRight':
        next = v + step;
        break;
      case 'ArrowDown':
      case 'ArrowLeft':
        next = v - step;
        break;
      case 'PageUp':
        next = v + PAGE;
        break;
      case 'PageDown':
        next = v - PAGE;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    commit(i, next);
  }

  return (
    <div
      ref={ref}
      role="group"
      aria-label={label}
      className={cx(
        'flex touch-none gap-2 select-none',
        disabled && 'cursor-not-allowed opacity-40',
        className,
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onLostPointerCapture={handlePointerEnd}
      {...rest}
    >
      {values.map((v, i) => (
        <div key={i} className="flex shrink-0 flex-col items-center gap-1">
          <div
            ref={(el) => {
              barRefs.current[i] = el;
            }}
            role="slider"
            tabIndex={0}
            aria-orientation="vertical"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(clamp01(v) * 100)}
            aria-valuetext={valueText(v)}
            aria-label={itemLabel(i)}
            aria-disabled={disabled ? 'true' : undefined}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={cx(
              'relative h-30 w-8 overflow-hidden rounded-ds border border-border-strong bg-surface',
              !disabled && 'cursor-ns-resize',
              focusRing,
            )}
          >
            <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[calc(var(--level,0)*100%)] bg-fg" />
          </div>
          <span aria-hidden="true" className="text-sm text-muted tabular-nums">
            {i + 1}
          </span>
        </div>
      ))}
    </div>
  );
}
