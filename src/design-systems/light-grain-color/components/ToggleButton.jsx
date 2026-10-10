import { controlBase, controlSizes, cx, selectedLook, unselectedLook } from '../classes';

export default function ToggleButton({ pressed = false, size = 'md', className, ref, ...rest }) {
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={pressed ? 'true' : 'false'}
      className={cx(
        controlBase,
        controlSizes[size] ?? controlSizes.md,
        pressed ? selectedLook : unselectedLook,
        className,
      )}
      {...rest}
    />
  );
}
