import { cx } from '../classes';

export default function Badge({ tone = 'neutral', className, ref, ...rest }) {
  return (
    <span
      ref={ref}
      className={cx(
        'inline-flex min-h-6 items-center gap-1 rounded-ds border px-1.5 text-sm whitespace-nowrap',
        tone === 'strong' ? 'border-selected bg-selected text-selected-fg' : 'border-border-strong bg-surface text-fg',
        className,
      )}
      {...rest}
    />
  );
}
