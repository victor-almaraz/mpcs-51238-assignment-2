import { cx } from '../classes';

/**
 * Small <output> for values such as octave "C4" or position "0:42 / 3:10".
 * <output> is an implicit polite live region; pass aria-live="off" for values
 * that change on their own every second (the playback position).
 */
export default function TextOutput({ htmlFor, children, className, ref, ...rest }) {
  return (
    <output ref={ref} htmlFor={htmlFor} className={cx('text-sm tabular-nums', className)} {...rest}>
      {children}
    </output>
  );
}
