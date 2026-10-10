import { cx } from '../classes';

export default function EmptyState({ title, children, className, ref, ...rest }) {
  return (
    <div
      ref={ref}
      className={cx(
        'relative isolate flex flex-col items-center gap-4 rounded-ds border border-border px-8 pt-12 pb-8 text-center text-sm',
        // A hard-edged beam from above: light as a flat plane, not a soft wash.
        "before:absolute before:inset-0 before:-z-10 before:bg-active before:content-[''] before:[clip-path:polygon(44%_0,56%_0,78%_100%,22%_100%)]",
        className,
      )}
      {...rest}
    >
      {title ? <p>{title}</p> : null}
      {children}
    </div>
  );
}
