import { buttonVariants, controlBase, controlSizes, cx } from '../classes';

export default function Button({
  variant = 'secondary',
  size = 'md',
  type = 'button',
  className,
  ref,
  ...rest
}) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        controlBase,
        controlSizes[size] ?? controlSizes.md,
        buttonVariants[variant] ?? buttonVariants.secondary,
        className,
      )}
      {...rest}
    />
  );
}
