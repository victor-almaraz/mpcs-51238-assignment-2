import { controlBase, controlSizes, cx, lamp, selectedLook, unselectedLook } from '../classes';

/** Toggle with an indicator lamp that lights while pressed (Record, Play with Keyboard). */
export default function ToggleButton({ pressed = false, size = 'md', className, ref, ...rest }) {
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={pressed ? 'true' : 'false'}
      className={cx(
        controlBase,
        lamp,
        controlSizes[size] ?? controlSizes.md,
        pressed ? selectedLook : unselectedLook,
        className,
      )}
      {...rest}
    />
  );
}
