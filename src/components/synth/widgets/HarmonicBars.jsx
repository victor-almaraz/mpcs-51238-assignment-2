'use client';

import { SliderGroup } from '@/design-systems/meta';
import { formatPercent, parseParam } from '../format';

const FRACTION = { unit: 'fraction' };

/** Eight harmonic level bars, each with a typed percent field underneath (0–100). */
export default function HarmonicBars({ values, onChange, disabled }) {
  const silent = values.every((v) => v === 0);
  const edit = (i, typed) => {
    const v = parseParam(FRACTION, typed, '0 %');
    if (v !== null) onChange(i, Math.min(1, Math.max(0, v)));
  };
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm">Harmonics</span>
      <SliderGroup
        label="Harmonic levels"
        values={values}
        onChange={onChange}
        onEditValue={edit}
        itemLabel={(i) => `Harmonic ${i + 1}`}
        valueText={formatPercent}
        disabled={disabled}
      />
      {silent && <p className="text-sm text-muted">All harmonics at 0</p>}
    </div>
  );
}
