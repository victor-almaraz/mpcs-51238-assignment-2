'use client';

import { PARAM_DEFS } from '@/audio/synths/param-defs';
import ParamControl from './ParamControl';

export default function GranularParams(props) {
  return PARAM_DEFS.granular.map((def) => <ParamControl key={def.name} def={def} {...props} />);
}
