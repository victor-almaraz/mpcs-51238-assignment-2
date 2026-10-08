import { cx } from '../classes';

export default function EmptyState({ title, children, className, ref, ...rest }) {
  return (
    <div
      ref={ref}
      className={cx(
        'flex flex-col items-center gap-4 rounded-ds border border-dashed border-border-strong p-8 text-center text-sm',
        className,
      )}
      {...rest}
    >
      {title ? <p>{title}</p> : null}
      {children}
    </div>
  );
}
