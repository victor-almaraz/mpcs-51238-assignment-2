'use client';

import { cx, focusRing } from '../classes';
import ValueField from './ValueField';

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

/**
 * Labelled native range with a value readout.
 * PageUp/PageDown jump by `pageStep` (default 10 % of the range); Delete and
 * double-click call onReset. With `onEditValue(text)` the readout is a ValueField the
 * user can type into. `className` goes on the row, other props on the input.
 */
export default function Slider({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  onEditValue,
  valueText,
  display,
  onReset,
  pageStep,
  disabled = false,
  describedBy,
  labelHidden = false,
  className,
  onKeyDown,
  onDoubleClick,
  ref,
  ...rest
}) {
  const helpId = onReset ? `${id}-reset-help` : undefined;
  const describedByIds = [describedBy, helpId].filter(Boolean).join(' ') || undefined;

  function handleKeyDown(e) {
    onKeyDown?.(e);
    if (e.defaultPrevented || disabled) return;
    if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault();
      const jump = pageStep ?? (max - min) / 10;
      const raw = value + (e.key === 'PageUp' ? jump : -jump);
      const snapped = step > 0 ? min + Math.round((raw - min) / step) * step : raw;
      const next = clamp(Number(snapped.toFixed(10)), min, max);
      if (next !== value) onChange(next);
    } else if (e.key === 'Delete' && onReset) {
      e.preventDefault();
      onReset();
    }
  }

  function handleDoubleClick(e) {
    onDoubleClick?.(e);
    if (!disabled) onReset?.();
  }

  return (
    <div className={cx('flex min-w-0 items-center gap-2', className)}>
      <label htmlFor={id} className={labelHidden ? 'sr-only' : 'w-24 shrink-0 text-sm'}>
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={valueText}
        aria-describedby={describedByIds}
        onChange={(e) => onChange(Number(e.target.value))}
        onKeyDown={handleKeyDown}
        onDoubleClick={handleDoubleClick}
        className={cx(
          'h-6 min-h-6 min-w-0 flex-1 cursor-pointer rounded-ds bg-transparent disabled:cursor-not-allowed disabled:opacity-40',
          focusRing,
        )}
        {...rest}
      />
      {onEditValue ? (
        <ValueField
          label={`${label} value`}
          display={String(display ?? valueText ?? value)}
          onCommit={onEditValue}
          disabled={disabled}
          className="w-20 shrink-0 px-1 text-right"
        />
      ) : (
        <output htmlFor={id} aria-live="off" className="w-20 shrink-0 text-right text-sm tabular-nums">
          {display ?? valueText ?? value}
        </output>
      )}
      {onReset ? (
        <span id={helpId} className="sr-only">
          Press Delete or double-click to reset
        </span>
      ) : null}
    </div>
  );
}
