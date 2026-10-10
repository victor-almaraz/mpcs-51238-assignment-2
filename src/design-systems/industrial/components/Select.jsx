'use client';

import { cx, fieldLabel, focusRing } from '../classes';

/**
 * Visible label + native select. `className` goes on the row, `labelClassName`
 * on the label, other props on the <select>. onChange receives the string value.
 */
export default function Select({
  id,
  label,
  value,
  onChange,
  options,
  disabled = false,
  title,
  labelClassName,
  className,
  ref,
  ...rest
}) {
  return (
    <div className={cx('flex min-w-0 items-center gap-2', className)}>
      <label htmlFor={id} className={cx(fieldLabel, labelClassName)}>
        {label}
      </label>
      <select
        ref={ref}
        id={id}
        value={value}
        disabled={disabled}
        title={title}
        onChange={(e) => onChange(e.target.value)}
        className={cx(
          'min-h-8 w-full min-w-0 flex-1 truncate rounded-ds border border-border-strong bg-surface px-2 text-sm text-fg',
          'cursor-pointer enabled:hover:border-fg enabled:hover:bg-hover disabled:cursor-not-allowed disabled:opacity-40',
          focusRing,
        )}
        {...rest}
      >
        {options.map((opt) => (
          <option key={String(opt.value)} value={opt.value} title={opt.title}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
