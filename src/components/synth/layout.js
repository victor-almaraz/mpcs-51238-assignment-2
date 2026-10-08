/*
 * Page-level alignment shared by every row of the synth page (layout-and-responsive.md
 * "Alignment"). Each row's outer element takes `rowPad` and its content takes `rowInner`, so
 * all meta controls share one left edge at every width. The rack adds `rackIndent` on top.
 * Class names are written out in full so Tailwind's scanner finds them.
 */

/** Side padding of a full-width row (header, transport, main). */
export const rowPad = 'px-4 md:px-8';

/** Content width of a row, centred inside `rowPad`. */
export const rowInner = 'mx-auto w-full max-w-7xl';

/** Extra left indent of the rack (Add synth and widgets); the right edge stays with the meta rows. */
export const rackIndent = 'pl-2 md:pl-6';
