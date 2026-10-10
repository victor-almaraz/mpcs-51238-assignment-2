import { chipBase, cx, selectedLook, unselectedLook } from '../classes';

/** Pill-shaped toggle chip (Live / M / S / Lock). */
export default function Chip({ pressed = false, className, ref, ...rest }) {
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={pressed ? 'true' : 'false'}
      className={cx(
        chipBase,
        'min-h-8 min-w-8 px-1.5 sm:px-2',
        pressed ? selectedLook : unselectedLook,
        className,
      )}
      {...rest}
    />
  );
}
