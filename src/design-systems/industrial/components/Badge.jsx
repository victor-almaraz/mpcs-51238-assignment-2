import { controlType, cx } from '../classes';

/** Annunciator: `strong` is a lit amber lamp (Limit, Clip); neutral is an unlit legend. */
export default function Badge({ tone = 'neutral', className, ref, ...rest }) {
  return (
    <span
      ref={ref}
      className={cx(
        'inline-flex min-h-6 items-center gap-1 rounded-ds border px-2 whitespace-nowrap',
        controlType,
        tone === 'strong' ? 'border-lamp bg-lamp text-fg' : 'border-border-strong bg-surface text-fg',
        className,
      )}
      {...rest}
    />
  );
}
