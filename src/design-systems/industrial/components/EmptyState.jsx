import { cx } from '../classes';

/** A blank panel: a dashed cut-out awaiting a module. */
export default function EmptyState({ title, children, className, ref, ...rest }) {
  return (
    <div
      ref={ref}
      className={cx(
        'flex flex-col items-center gap-4 rounded-ds border-2 border-dashed border-border-strong bg-surface-2 p-8 text-center text-sm',
        className,
      )}
      {...rest}
    >
      {title ? <p>{title}</p> : null}
      {children}
    </div>
  );
}
