/*
 * The design system the rack renders with: one place to choose it. The synth page sets
 * data-ds={STYLE} and the library's font class on its root; SynthApp provides the library
 * to every synth component through DesignSystemProvider.
 */
import * as industrial from '@/design-systems/industrial';

export const STYLE = 'industrial';

export const ds = industrial;
