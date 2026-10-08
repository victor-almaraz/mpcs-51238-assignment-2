import { cx } from '../classes';
import IconButton from './IconButton';

/* U+FE0E keeps ⚠ and ℹ as text glyphs rather than emoji. */
const TONES = {
  error: { word: 'Error', glyph: '✕', look: 'border-danger bg-danger-bg text-danger' },
  warning: { word: 'Warning', glyph: '⚠︎', look: 'border-warning bg-warning-bg text-warning' },
  info: { word: 'Note', glyph: 'ℹ︎', look: 'border-border-strong bg-surface text-fg' },
  success: { word: 'Done', glyph: '✓', look: 'border-success bg-success-bg text-success' },
};

/**
 * Inline message. Meaning is carried by a leading glyph and a tone word, never
 * colour alone. role="alert" for live errors, role="status" for other live tones.
 */
export default function Alert({
  tone = 'error',
  title,
  children,
  onDismiss,
  dismissLabel = 'Dismiss',
  action,
  live = true,
  className,
  ref,
  ...rest
}) {
  const t = TONES[tone] ?? TONES.error;
  const role = live ? (tone === 'error' ? 'alert' : 'status') : undefined;
  const hasBody = title != null && children != null;

  return (
    <div
      ref={ref}
      role={role}
      className={cx('flex flex-wrap items-start gap-2 rounded-ds border p-3 text-sm', t.look, className)}
      {...rest}
    >
      <span aria-hidden="true" className="w-4 shrink-0 text-center font-semibold">
        {t.glyph}
      </span>
      <div className="min-w-0 flex-1 basis-48">
        <div>
          <span className="font-semibold">{t.word}:</span>{' '}
          {title != null ? <span className="font-semibold">{title}</span> : children}
        </div>
        {hasBody ? <div className="mt-1">{children}</div> : null}
      </div>
      {action || onDismiss ? (
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {action}
          {onDismiss ? (
            <IconButton label={dismissLabel} onClick={onDismiss}>
              ✕
            </IconButton>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
