import { cx, focusRing } from '../classes';

export default function Heading({ level = 2, className, ref, ...rest }) {
  const n = Math.min(6, Math.max(1, Math.round(Number(level)) || 2));
  const Tag = `h${n}`;
  return (
    <Tag
      ref={ref}
      className={cx(
        'font-bold uppercase',
        n === 1
          ? // The full-width Heros Bold, wider and heavier than the condensed headings, lit like the
            // board's titles: sodium white warming into amber, across the text only (w-fit).
            'w-fit bg-linear-to-r/oklch from-fg to-level-high bg-clip-text font-sans text-5xl leading-[0.95] tracking-[-0.01em] text-transparent sm:text-6xl md:text-8xl'
          : 'font-display text-[1.0625rem] leading-tight tracking-[-0.01em] sm:text-xl',
        'rounded-ds',
        focusRing,
        className,
      )}
      {...rest}
    />
  );
}
