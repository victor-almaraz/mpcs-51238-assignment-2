import { cx, focusRing } from '../classes';

/**
 * Native <details>/<summary>; the summary keeps its list-item marker as the open/closed cue.
 * `data-force` goes on the summary (design-system pages).
 */
export default function Disclosure({ summary, children, className, ref, 'data-force': force, ...rest }) {
  return (
    <details ref={ref} className={cx('text-sm', className)} {...rest}>
      <summary data-force={force} className={cx('min-h-6 cursor-pointer rounded-ds py-0.5 hover:bg-hover', focusRing)}>
        <span className="underline underline-offset-4">{summary}</span>
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}
