'use client';

import { PARAM_DEFS } from '@/audio/synths/param-defs';
import ParamControl from './ParamControl';

export default function AdditiveParams(props) {
  return PARAM_DEFS.additive.map((def) => <ParamControl key={def.name} def={def} {...props} />);
}
