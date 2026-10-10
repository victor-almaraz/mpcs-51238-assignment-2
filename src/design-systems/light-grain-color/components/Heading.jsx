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
          ? // Sporting Grotesque Bold: wide, heavy capitals like a film's title card, lit sodium
            // white warming into amber, across the text only (w-fit). Sizes keep "SYNTHESIZER"
            // (9.34 em wide) inside the column at every breakpoint. The clipped gradient paints
            // only inside the box, so the line height clears the capitals (which rise above a
            // tighter line) and the right padding covers the last letter's overhang.
            'w-fit bg-linear-to-r/oklch from-fg to-level-high bg-clip-text pr-[0.06em] font-hero text-[2.125rem] leading-[1.15] text-transparent sm:text-[3.5rem] md:text-[4rem] lg:text-[5rem] xl:text-8xl'
          : 'font-display text-[1.0625rem] leading-tight tracking-[-0.01em] sm:text-xl',
        'rounded-ds',
        focusRing,
        className,
      )}
      {...rest}
    />
  );
}
