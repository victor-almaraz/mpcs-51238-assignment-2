'use client';

import { useId } from 'react';
import { cx, fieldLabel, peerFocusRing, selectedLook } from '../classes';

/**
 * Radio group styled as segmented buttons. Native radios are visually hidden
 * but focusable; arrow keys move the selection natively.
 * From sm the legend floats so it lays out inline (w-24) with the options; below sm it sits
 * above them so the labels fit. An option's `force`
 * sets data-force on its input and label (design-system pages).
 */
export default function SegmentedControl({
  legend,
  name,
  options,
  value,
  onChange,
  disabled = false,
  className,
  ref,
  ...rest
}) {
  const baseId = useId();
  const groupName = name ?? baseId;

  return (
    <fieldset
      ref={ref}
      disabled={disabled}
      className={cx('flex min-w-0 flex-col items-stretch gap-1 sm:flex-row sm:items-center sm:gap-2', className)}
      {...rest}
    >
      <legend className={cx('mb-1 sm:float-left sm:mb-0', fieldLabel)}>{legend}</legend>
      <div className="flex min-w-0 flex-1">
        {options.map((opt, i) => {
          const id = `${baseId}-${i}`;
          const checked = opt.value === value;
          return (
            <div key={String(opt.value)} className={cx('relative flex min-w-0 flex-auto', i > 0 && '-ml-px')}>
              <input
                id={id}
                type="radio"
                name={groupName}
                value={String(opt.value)}
                checked={checked}
                onChange={() => onChange(opt.value)}
                className="peer sr-only"
                data-force={opt.force}
              />
              <label
                htmlFor={id}
                title={opt.title}
                data-force={opt.force}
                className={cx(
                  'relative flex min-h-8 min-w-0 flex-1 items-center justify-center border px-1.5 text-sm font-bold select-none motion-safe:transition-[color,background-color,border-color,box-shadow]',
                  // One rounded capsule: only the outer ends are rounded.
                  i === 0 && 'rounded-l-ds',
                  i === options.length - 1 && 'rounded-r-ds',
                  'peer-focus-visible:z-10',
                  peerFocusRing,
                  checked ? cx(selectedLook, 'z-[1]') : 'border-border-strong bg-transparent text-fg',
                  disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
                  !disabled && !checked && 'hover:z-[2] hover:border-fg hover:bg-hover active:bg-active',
                )}
              >
                <span className="truncate">{opt.label}</span>
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
