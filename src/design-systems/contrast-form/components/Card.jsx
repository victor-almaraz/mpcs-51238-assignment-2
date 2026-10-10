import { chamferPanel, cx } from '../classes';

/** A widget panel: square on three corners, chamfered at the top right. */
export default function Card({ as: Tag = 'article', className, ref, ...rest }) {
  return <Tag ref={ref} className={cx('flex flex-col gap-4 p-3 text-fg [--cf-notch:var(--ds-surface)] md:p-4', chamferPanel, className)} {...rest} />;
}
