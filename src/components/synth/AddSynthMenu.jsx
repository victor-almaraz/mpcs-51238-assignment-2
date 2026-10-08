'use client';

import { MenuButton } from '@/design-systems/meta';
import { SYNTH_INFO, SYNTH_TYPES } from '@/audio/synths/param-defs';

/** Primary button + menu of the five types; the only accent-coloured control. */
export default function AddSynthMenu({ onAdd, pluckAvailable, className }) {
  const items = SYNTH_TYPES.map((type) => ({
    value: type,
    label: SYNTH_INFO[type].label,
    description: SYNTH_INFO[type].description,
    disabled: type === 'pluck' && pluckAvailable === false,
    disabledReason: 'not supported in this browser',
  }));
  return (
    <MenuButton
      label="Add synth"
      items={items}
      onSelect={onAdd}
      variant="primary"
      size="lg"
      className={className}
      buttonClassName="w-full md:w-auto"
    />
  );
}
