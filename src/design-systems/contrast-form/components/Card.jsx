import { cx } from '../classes';

export default function Card({ as: Tag = 'article', className, ref, ...rest }) {
  return (
    <Tag
      ref={ref}
      className={cx('flex flex-col gap-4 rounded-ds border border-border border-t-border-strong bg-surface p-3 text-fg md:p-4', className)}
      {...rest}
    />
  );
}
