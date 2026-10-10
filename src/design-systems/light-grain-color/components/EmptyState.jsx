import { cx } from '../classes';

export default function EmptyState({ title, children, className, ref, ...rest }) {
  return (
    <div
      ref={ref}
      className={cx(
        'flex flex-col items-center gap-4 rounded-ds border border-border px-8 pt-12 pb-8 text-center text-sm',
        // A soft pool of sodium light from above.
        'bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,var(--ds-accent-glow),transparent)]',
        className,
      )}
      {...rest}
    >
      {title ? <p>{title}</p> : null}
      {children}
    </div>
  );
}
