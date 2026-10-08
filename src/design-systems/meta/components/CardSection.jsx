import { cx } from '../classes';

/** A region inside a Card. `dimmed` fades it (muted widget params); headers stay full contrast. */
export default function CardSection({ dimmed = false, as: Tag = 'div', className, ref, ...rest }) {
  return (
    <Tag
      ref={ref}
      className={cx('flex flex-col gap-3 motion-safe:transition-opacity', dimmed && 'opacity-60', className)}
      {...rest}
    />
  );
}
