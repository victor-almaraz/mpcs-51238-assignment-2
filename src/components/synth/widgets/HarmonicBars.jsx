'use client';

import { SliderGroup } from '@/design-systems/meta';
import { formatPercent } from '../format';

export default function HarmonicBars({ values, onChange, disabled }) {
  const silent = values.every((v) => v === 0);
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm">Harmonics</span>
      <SliderGroup
        label="Harmonic levels"
        values={values}
        onChange={onChange}
        itemLabel={(i) => `Harmonic ${i + 1}`}
        valueText={formatPercent}
        disabled={disabled}
      />
      {silent && <p className="text-sm text-muted">All harmonics at 0</p>}
    </div>
  );
}
