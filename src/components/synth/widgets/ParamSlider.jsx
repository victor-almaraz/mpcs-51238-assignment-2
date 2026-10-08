'use client';

import { useId } from 'react';
import { Slider } from '@/design-systems/meta';
import { fromNorm, toNorm, usesNativeSteps, NORM_STEPS } from '@/audio/synths/scaling';
import { formatParam } from '../format';

/**
 * A PARAM_DEFS-driven slider. Log and curved params work in normalised steps
 * (0…1000); linear params with a step use their natural units.
 */
export default function ParamSlider({ def, value, onChange, disabled }) {
  const id = useId();
  const native = usesNativeSteps(def);
  const text = formatParam(def, value);
  const reset = () => onChange(def.default);
  if (native) {
    return (
      <Slider
        id={id}
        label={def.label}
        min={def.min}
        max={def.max}
        step={def.step}
        value={value}
        onChange={onChange}
        valueText={text}
        display={text}
        onReset={reset}
        pageStep={(def.max - def.min) / 10}
        disabled={disabled}
      />
    );
  }
  return (
    <Slider
      id={id}
      label={def.label}
      min={0}
      max={NORM_STEPS}
      step={1}
      value={Math.round(toNorm(def, value) * NORM_STEPS)}
      onChange={(u) => onChange(fromNorm(def, u / NORM_STEPS))}
      valueText={text}
      display={text}
      onReset={reset}
      pageStep={NORM_STEPS / 10}
      disabled={disabled}
    />
  );
}
