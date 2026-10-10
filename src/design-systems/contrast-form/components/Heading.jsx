import { cx, focusRing } from '../classes';

export default function Heading({ level = 2, className, ref, ...rest }) {
  const n = Math.min(6, Math.max(1, Math.round(Number(level)) || 2));
  const Tag = `h${n}`;
  return (
    <Tag
      ref={ref}
      className={cx(
        'font-display uppercase',
        n === 1
          ? 'text-6xl leading-none font-black tracking-[0.04em] md:text-8xl'
          : 'text-lg leading-tight font-medium tracking-[0.04em] sm:text-xl',
        'rounded-ds',
        focusRing,
        className,
      )}
      {...rest}
    />
  );
}
