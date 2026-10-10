'use client';

import { useId } from 'react';
import { controlBase, controlSizes, cx, peerFocusRing, secondaryLabelLook } from '../classes';

/**
 * File picker styled as a secondary button. The real input stays focusable
 * (sr-only) and the label shows its focus ring via peer-focus-visible.
 * `className` goes on the wrapper, other props on the input; `data-force` goes on both.
 */
export default function FileButton({
  id,
  accept,
  onFile,
  children,
  busy = false,
  disabled = false,
  size = 'lg',
  className,
  ref,
  'data-force': force,
  ...rest
}) {
  const autoId = useId();
  const inputId = id ?? autoId;

  function handleChange(e) {
    const input = e.target;
    const file = input.files && input.files[0];
    input.value = '';
    if (file) onFile(file);
  }

  return (
    <span className={cx('relative inline-flex', className)}>
      <input
        ref={ref}
        id={inputId}
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={handleChange}
        className="peer sr-only"
        data-force={force}
        {...rest}
      />
      <label
        htmlFor={inputId}
        aria-busy={busy ? 'true' : undefined}
        data-force={force}
        className={cx(
          controlBase,
          controlSizes[size] ?? controlSizes.md,
          'w-full',
          peerFocusRing,
          disabled
            ? 'cursor-not-allowed border-border-strong bg-surface text-fg opacity-40'
            : cx(secondaryLabelLook, busy ? 'cursor-progress' : 'cursor-pointer'),
        )}
      >
        {children}
      </label>
    </span>
  );
}
