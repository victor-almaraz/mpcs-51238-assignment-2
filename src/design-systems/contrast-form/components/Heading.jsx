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
          ? // A stepped rule in the three inks under the title, like a Deco speed line.
            "text-6xl leading-none font-black tracking-[0.04em] after:mt-4 after:block after:h-[15px] after:w-[min(18rem,60%)] after:content-[''] after:[background:var(--ds-steps)] md:text-8xl"
          : 'text-lg leading-tight font-medium tracking-[0.04em] sm:text-xl',
        'rounded-ds',
        focusRing,
        className,
      )}
      {...rest}
    />
  );
}
