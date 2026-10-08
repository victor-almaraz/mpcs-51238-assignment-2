import { cx, focusRing } from '../classes';

export default function Heading({ level = 2, className, ref, ...rest }) {
  const n = Math.min(6, Math.max(1, Math.round(Number(level)) || 2));
  const Tag = `h${n}`;
  return (
    <Tag
      ref={ref}
      className={cx(
        n === 1 ? 'text-xl font-semibold' : 'text-base font-semibold',
        'rounded-ds',
        focusRing,
        className,
      )}
      {...rest}
    />
  );
}
