/*
 * Page-level alignment shared by every row of the synth page (layout-and-responsive.md
 * "Alignment"). Each row's outer element takes `rowPad` and its content takes `rowInner`, so
 * all meta controls share one left edge at every width. The rack is a bordered panel
 * (`rackPanel`) on that edge; its padding indents the widgets past the meta controls.
 * Class names are written out in full so Tailwind's scanner finds them.
 */

/** Side padding of a full-width row (header, transport, main). */
export const rowPad = 'px-4 md:px-8';

/** Content width of a row, centred inside `rowPad`. */
export const rowInner = 'mx-auto w-full max-w-7xl';

/** The rack's own frame: border on the meta edge, padding as the widgets' extra indent. */
export const rackPanel = 'rounded-ds border border-border-strong p-2 md:p-6';
