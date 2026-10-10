import { cx } from '../classes';

/**
 * A field's visible label in this style's label typography, for labels the app places itself
 * (the Harmonics label above the bars). Sliders, selects and segmented controls set their own.
 */
export default function FieldLabel({ as: Tag = 'span', className, ref, ...rest }) {
  return <Tag ref={ref} className={cx('text-xs font-bold uppercase tracking-[0.06em] text-muted', className)} {...rest} />;
}
