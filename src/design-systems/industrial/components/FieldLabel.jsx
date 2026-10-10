import { cx } from '../classes';

/**
 * A field's visible label in this style's label typography, for labels the app places itself
 * (the Harmonics label above the bars). Sliders, selects and segmented controls set their own.
 */
export default function FieldLabel({ as: Tag = 'span', className, ref, ...rest }) {
  return <Tag ref={ref} className={cx('text-[0.6875rem] font-bold uppercase tracking-[0.04em] text-muted', className)} {...rest} />;
}
