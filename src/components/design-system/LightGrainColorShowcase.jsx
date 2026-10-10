'use client';

import * as ds from '@/design-systems/light-grain-color';
import { about } from '@/design-systems/light-grain-color/about';
import Showcase from './Showcase';

/** The showcase bound to the Light/Grain/Color library (client side, so components can be passed). */
export default function LightGrainColorShowcase() {
  return <Showcase ds={ds} style="light-grain-color" about={about} />;
}
