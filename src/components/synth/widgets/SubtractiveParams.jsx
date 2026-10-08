'use client';

import { PARAM_DEFS } from '@/audio/synths/param-defs';
import ParamControl from './ParamControl';

export default function SubtractiveParams(props) {
  return PARAM_DEFS.subtractive.map((def) => <ParamControl key={def.name} def={def} {...props} />);
}
