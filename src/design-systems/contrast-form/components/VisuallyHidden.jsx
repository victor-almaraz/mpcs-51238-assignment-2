import { cx } from '../classes';

export default function VisuallyHidden({ as: Tag = 'span', className, ref, ...rest }) {
  return <Tag ref={ref} className={cx('sr-only', className)} {...rest} />;
}
