import { cx } from '../classes';
import IconButton from './IconButton';

/* U+FE0E keeps ⚠ and ℹ as text glyphs rather than emoji. */
/* The tone colours the bar, glyph and word; the message itself stays in the text colour. */
const TONES = {
  error: { word: 'Error', glyph: '✕', look: 'border-l-danger bg-danger-bg', ink: 'text-danger' },
  warning: { word: 'Warning', glyph: '⚠︎', look: 'border-l-warning bg-warning-bg', ink: 'text-warning' },
  info: { word: 'Note', glyph: 'ℹ︎', look: 'border-l-border-strong bg-surface-2', ink: 'text-fg' },
  success: { word: 'Done', glyph: '✓', look: 'border-l-success bg-success-bg', ink: 'text-success' },
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
      className={cx('flex flex-wrap items-start gap-2 rounded-ds border border-border border-l-4 p-3 text-sm text-fg', t.look, className)}
      {...rest}
    >
      <span aria-hidden="true" className={cx('w-4 shrink-0 text-center font-bold', t.ink)}>
        {t.glyph}
      </span>
      <div className="min-w-0 flex-1 basis-48">
        <div>
          <span className={cx('font-bold', t.ink)}>{t.word}:</span>{' '}
          {title != null ? <span className="font-bold">{title}</span> : children}
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
