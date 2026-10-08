'use client';

import { useId } from 'react';
import { cx, peerFocusRing, selectedLook } from '../classes';

/**
 * Radio group styled as segmented buttons. Native radios are visually hidden
 * but focusable; arrow keys move the selection natively.
 * The legend floats so it lays out inline (w-24) with the options.
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
      className={cx('flex min-w-0 items-center gap-2', className)}
      {...rest}
    >
      <legend className="float-left w-24 shrink-0 text-sm">{legend}</legend>
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
              />
              <label
                htmlFor={id}
                title={opt.title}
                className={cx(
                  'relative flex min-h-8 min-w-0 flex-1 items-center justify-center rounded-ds border px-2 text-sm select-none motion-safe:transition-colors',
                  'peer-focus-visible:z-10',
                  peerFocusRing,
                  checked ? cx(selectedLook, 'z-[1]') : 'border-border-strong bg-surface text-fg',
                  disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
                  !disabled && !checked && 'hover:bg-hover active:bg-active',
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
