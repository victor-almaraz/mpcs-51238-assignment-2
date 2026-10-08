import { cx, focusRing } from '../classes';

/** Native <details>/<summary>; the summary keeps its list-item marker as the open/closed cue. */
export default function Disclosure({ summary, children, className, ref, ...rest }) {
  return (
    <details ref={ref} className={cx('text-sm', className)} {...rest}>
      <summary className={cx('min-h-6 cursor-pointer rounded-ds py-0.5 hover:bg-hover', focusRing)}>
        <span className="underline underline-offset-4">{summary}</span>
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}
