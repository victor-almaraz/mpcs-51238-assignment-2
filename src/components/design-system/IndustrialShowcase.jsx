'use client';

import * as ds from '@/design-systems/industrial';
import { about } from '@/design-systems/industrial/about';
import Showcase from './Showcase';

/** The showcase bound to the Industrial library (client side, so components can be passed). */
export default function IndustrialShowcase() {
  return <Showcase ds={ds} style="industrial" about={about} />;
}
