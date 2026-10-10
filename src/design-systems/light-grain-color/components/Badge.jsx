import { controlType, cx } from '../classes';

export default function Badge({ tone = 'neutral', className, ref, ...rest }) {
  return (
    <span
      ref={ref}
      className={cx(
        'inline-flex min-h-6 items-center gap-1 rounded-ds border px-2 whitespace-nowrap',
        controlType,
        tone === 'strong' ? 'border-selected bg-selected text-selected-fg shadow-[0_0_14px_var(--ds-glow)]' : 'border-border-strong bg-transparent text-fg',
        className,
      )}
      {...rest}
    />
  );
}
