import { buttonVariants, controlBase, cx, iconSizes } from '../classes';

/** Ghost button whose only content is a decorative glyph; the name comes from `label`. */
export default function IconButton({ label, size = 'md', children, className, ref, ...rest }) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={cx(controlBase, iconSizes[size] ?? iconSizes.md, 'p-0', buttonVariants.ghost, className)}
      {...rest}
    >
      <span aria-hidden="true">{children}</span>
    </button>
  );
}
