'use client';

import * as ds from '@/design-systems/contrast-form';
import { about } from '@/design-systems/contrast-form/about';
import Showcase from './Showcase';

/** The showcase bound to the Contrast/Form library (client side, so components can be passed). */
export default function ContrastFormShowcase() {
  return <Showcase ds={ds} style="contrast-form" about={about} />;
}
