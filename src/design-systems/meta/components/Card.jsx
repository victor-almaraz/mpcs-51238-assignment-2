import { cx } from '../classes';

export default function Card({ as: Tag = 'article', className, ref, ...rest }) {
  return (
    <Tag
      ref={ref}
      className={cx('flex flex-col gap-4 rounded-ds border border-border bg-surface p-4 text-fg', className)}
      {...rest}
    />
  );
}
