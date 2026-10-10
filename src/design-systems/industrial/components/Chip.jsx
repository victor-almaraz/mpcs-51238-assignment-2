import { chipBase, cx, lamp, selectedLook, unselectedLook } from '../classes';

/** Toggle chip (Live / M / S / Lock) with an indicator lamp that lights while pressed. */
export default function Chip({ pressed = false, className, ref, ...rest }) {
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={pressed ? 'true' : 'false'}
      className={cx(chipBase, lamp, 'min-h-8 min-w-8 px-1 pt-1 sm:px-1.5', pressed ? selectedLook : unselectedLook, className)}
      {...rest}
    />
  );
}
