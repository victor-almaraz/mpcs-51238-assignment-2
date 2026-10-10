import { cx } from '../classes';

export default function Card({ as: Tag = 'article', className, ref, ...rest }) {
  return (
    <Tag
      ref={ref}
      className={cx('flex flex-col gap-4 rounded-ds border border-border bg-surface bg-[image:var(--ds-grain),linear-gradient(165deg,var(--ds-surface-2),var(--ds-surface)_55%)] p-3 text-fg shadow-[0_10px_30px_rgb(0_0_0/0.35)] md:p-4', className)}
      {...rest}
    />
  );
}
