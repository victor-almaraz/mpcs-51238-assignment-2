'use client';

import { PARAM_DEFS } from '@/audio/synths/param-defs';
import ParamControl from './ParamControl';

export default function FmParams(props) {
  return PARAM_DEFS.fm.map((def) => <ParamControl key={def.name} def={def} {...props} />);
}
