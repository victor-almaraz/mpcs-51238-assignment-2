'use client';

import { useLayoutEffect, useRef } from 'react';
import { cx, focusRing } from '../classes';
import ValueField from './ValueField';

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

function defaultFieldText(v) {
  return String(Math.round(v * 100));
}

/**
 * Row of custom vertical sliders (harmonic bars), values 0–1. Columns share the width,
 * up to 32 px per bar. Fill heights are written to a --level CSS variable through refs.
 * With `onEditValue(i, text)` a row of ValueFields (showing `fieldText(v)`) sits under the
 * bars, outside the pointer-capturing group so the fields keep normal text input.
 */
export default function SliderGroup({
  label,
  values,
  onChange,
  onEditValue,
  itemLabel = defaultItemLabel,
  valueText = defaultValueText,
  fieldText = defaultFieldText,
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

  const group = (
    <div
      ref={ref}
      role="group"
      aria-label={label}
      className={cx(
        'flex w-full touch-none gap-2 select-none',
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
        <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1">
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
              'relative h-30 w-full max-w-8 overflow-hidden rounded-ds border border-border-strong bg-bg',
              !disabled && 'cursor-ns-resize',
              focusRing,
            )}
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-linear-to-t/oklch from-level-low via-level-mid to-level-high [clip-path:inset(calc((1_-_var(--level,0))*100%)_0_0_0)]"
            />
          </div>
          <span aria-hidden="true" className="text-sm text-muted tabular-nums">
            {i + 1}
          </span>
        </div>
      ))}
    </div>
  );

  if (!onEditValue) return group;

  return (
    <>
      {group}
      <div className="flex w-full gap-2">
        {values.map((v, i) => (
          <div key={i} className="flex min-w-0 flex-1 justify-center">
            <ValueField
              label={`${itemLabel(i)} value`}
              display={fieldText(v)}
              onCommit={(text) => onEditValue(i, text)}
              disabled={disabled}
              className="w-full max-w-10 text-center"
            />
          </div>
        ))}
      </div>
    </>
  );
}
