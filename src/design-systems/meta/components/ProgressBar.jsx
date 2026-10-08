import { cx } from '../classes';

/** Native progress, 0–100. `value` null/undefined renders indeterminate (no value attribute). */
export default function ProgressBar({ value = null, label, className, ref, ...rest }) {
  const determinate = typeof value === 'number' && Number.isFinite(value);
  return (
    <progress
      ref={ref}
      max={100}
      value={determinate ? Math.min(100, Math.max(0, value)) : undefined}
      aria-label={label}
      className={cx(
        'block h-3 w-full appearance-none overflow-hidden rounded-ds border border-border-strong bg-surface',
        '[&::-webkit-progress-bar]:bg-surface [&::-webkit-progress-value]:bg-fg [&::-moz-progress-bar]:bg-fg',
        // The pseudo-element bars cover the element background, so tint them too when indeterminate.
        'indeterminate:bg-active indeterminate:[&::-webkit-progress-bar]:bg-active indeterminate:[&::-moz-progress-bar]:bg-active',
        'motion-safe:indeterminate:animate-pulse',
        className,
      )}
      {...rest}
    />
  );
}
