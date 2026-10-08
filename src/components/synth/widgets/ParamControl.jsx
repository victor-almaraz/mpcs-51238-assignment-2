'use client';

import { useId } from 'react';
import { SegmentedControl } from '@/design-systems/meta';
import ParamSlider from './ParamSlider';
import HarmonicBars from './HarmonicBars';

/** Renders the control for one PARAM_DEFS entry: radio group, slider or harmonic bars. */
export default function ParamControl({ def, widget, onParam, onHarmonic, disabled }) {
  const name = useId();
  const value = widget.params[def.name];
  if (def.kind === 'enum') {
    return (
      <SegmentedControl
        legend={def.label}
        name={name}
        options={def.options.map((o, i) => ({ value: o, label: def.optionLabels[i] }))}
        value={value}
        onChange={(v) => onParam(def.name, v)}
        disabled={disabled}
      />
    );
  }
  if (def.kind === 'array') {
    return <HarmonicBars values={value} onChange={onHarmonic} disabled={disabled} />;
  }
  return <ParamSlider def={def} value={value} onChange={(v) => onParam(def.name, v)} disabled={disabled} />;
}
