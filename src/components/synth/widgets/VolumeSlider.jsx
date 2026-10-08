'use client';

import { useId } from 'react';
import { Slider } from '@/design-systems/meta';
import { VOLUME, VOLUME_OFF, coerceVolume } from '@/audio/synths/param-defs';
import { formatVolume, parseVolume } from '../format';

// Position 0 is Off; positions 1… map to −60 dB … maxDb in 0.5 dB steps (audio-safety.md).
const toPos = (db) => (Number.isFinite(db) ? Math.round((db - VOLUME.min) / VOLUME.step) + 1 : 0);
const toDb = (pos) => (pos <= 0 ? VOLUME_OFF : VOLUME.min + (pos - 1) * VOLUME.step);

/**
 * Volume slider in dB with Off at the minimum. `editable` makes the readout accept typed
 * values ("−6", "−12.5 dB", "Off"), clamped to the slider's range; the master leaves it off.
 */
export default function VolumeSlider({ label = 'Volume', value, onChange, maxDb = VOLUME.max, defaultDb, disabled, labelHidden, editable = false }) {
  const id = useId();
  const text = formatVolume(value);
  const edit = (typed) => {
    const db = parseVolume(typed);
    if (db !== null) onChange(coerceVolume(db, value, maxDb));
  };
  return (
    <Slider
      id={id}
      label={label}
      labelHidden={labelHidden}
      min={0}
      max={toPos(maxDb)}
      step={1}
      value={Math.min(toPos(value), toPos(maxDb))}
      onChange={(pos) => onChange(Math.min(toDb(pos), maxDb))}
      onEditValue={editable ? edit : undefined}
      valueText={text}
      display={text}
      onReset={() => onChange(Math.min(defaultDb, maxDb))}
      pageStep={12}
      disabled={disabled}
    />
  );
}
