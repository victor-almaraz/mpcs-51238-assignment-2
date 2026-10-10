import { cx } from '../classes';

/**
 * A field's visible label in this style's label typography, for labels the app places itself
 * (the Harmonics label above the bars). Sliders, selects and segmented controls set their own.
 */
export default function FieldLabel({ as: Tag = 'span', className, ref, ...rest }) {
  return <Tag ref={ref} className={cx('font-display text-base leading-none font-medium tracking-[0.08em] text-muted uppercase', className)} {...rest} />;
}
