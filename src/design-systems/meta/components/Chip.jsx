import { controlBase, cx, selectedLook, unselectedLook } from '../classes';

/** Compact toggle chip (Live / M / S). */
export default function Chip({ pressed = false, className, ref, ...rest }) {
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={pressed ? 'true' : 'false'}
      className={cx(
        controlBase,
        'min-h-8 min-w-8 px-2',
        pressed ? selectedLook : unselectedLook,
        className,
      )}
      {...rest}
    />
  );
}
