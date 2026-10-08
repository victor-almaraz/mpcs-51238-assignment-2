'use client';

import { PARAM_DEFS } from '@/audio/synths/param-defs';
import ParamControl from './ParamControl';

/** `engine`: 'loading' until worklets resolve, 'unavailable' when ks-processor failed. */
export default function PluckParams({ engine, ...props }) {
  return (
    <>
      {engine === 'loading' && <p className="text-sm text-muted">Loading pluck engine…</p>}
      {engine === 'unavailable' && <p className="text-sm">Pluck unavailable in this browser. This widget is silent.</p>}
      {PARAM_DEFS.pluck.map((def) => (
        <ParamControl key={def.name} def={def} {...props} disabled={props.disabled || engine === 'loading'} />
      ))}
    </>
  );
}
