import { cx, focusRing } from '../classes';

/**
 * Level 1 (the page title) is the wide display face, like a panel's model legend; other
 * levels are compact bold capitals so a widget header fits on one row.
 */
export default function Heading({ level = 2, className, ref, ...rest }) {
  const n = Math.min(6, Math.max(1, Math.round(Number(level)) || 2));
  const Tag = `h${n}`;
  return (
    <Tag
      ref={ref}
      className={cx(
        'font-bold uppercase',
        n === 1
          ? 'font-display text-[1.75rem] leading-none tracking-[0.01em] sm:text-5xl md:text-6xl'
          : 'font-sans text-[0.8125rem] leading-tight sm:text-sm',
        'rounded-ds',
        focusRing,
        className,
      )}
      {...rest}
    />
  );
}
