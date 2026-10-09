import { cx, focusRing } from '../classes';

/**
 * Button that shows or hides a region (APG disclosure pattern): ▾ when expanded, ▸ when
 * collapsed, `aria-expanded` and `aria-controls={controls}`. Text-styled so it can sit in a
 * heading; the label truncates.
 */
export default function DisclosureButton({ expanded, controls, children, className, ref, ...rest }) {
  return (
    <button
      ref={ref}
      type="button"
      aria-expanded={expanded ? 'true' : 'false'}
      aria-controls={controls}
      className={cx('flex min-h-8 min-w-0 cursor-pointer items-center gap-2 rounded-ds text-left', focusRing, className)}
      {...rest}
    >
      <span aria-hidden="true" className="w-3 shrink-0 text-sm">{expanded ? '▾' : '▸'}</span>
      <span className="truncate">{children}</span>
    </button>
  );
}
