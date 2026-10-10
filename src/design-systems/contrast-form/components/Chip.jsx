import { chipBase, cx, selectedLook, unselectedLook } from '../classes';

/** Compact toggle chip (Live / M / S / Lock): smaller, tighter capitals so a widget header fits on one row. */
export default function Chip({ pressed = false, className, ref, ...rest }) {
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={pressed ? 'true' : 'false'}
      className={cx(
        chipBase,
        'min-h-8 min-w-8 px-1.5',
        pressed ? selectedLook : unselectedLook,
        className,
      )}
      {...rest}
    />
  );
}
