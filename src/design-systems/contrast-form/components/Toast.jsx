import { castShadow, cx } from '../classes';
import IconButton from './IconButton';

/**
 * Transient message strip (GNOME HIG "Toasts"): text, an optional action button and a
 * Dismiss button. Presentational only; the caller owns positioning, timing and the live
 * region. `children` is the message; `details` renders under it (e.g. a Disclosure).
 */
export default function Toast({ children, action, details, onDismiss, className, ...rest }) {
  return (
    <div
      className={cx(
        'pointer-events-auto flex max-w-full flex-col gap-1 rounded-ds border border-border-strong border-l-4 border-l-fg bg-surface-2 py-1 pr-1 pl-4 text-sm text-fg',
        castShadow,
        className,
      )}
      {...rest}
    >
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1">{children}</span>
        {action}
        {onDismiss ? (
          <IconButton label="Dismiss" onClick={onDismiss}>
            ✕
          </IconButton>
        ) : null}
      </div>
      {details ? <div className="pr-3 pb-2">{details}</div> : null}
    </div>
  );
}
