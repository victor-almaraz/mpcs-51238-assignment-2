'use client';

import { useId } from 'react';
import { Card, CardSection, Chip, Heading, IconButton, Select } from '@/design-systems/meta';
import { VOLUME } from '@/audio/synths/param-defs';
import VolumeSlider from './VolumeSlider';
import SubtractiveParams from './SubtractiveParams';
import FmParams from './FmParams';
import AdditiveParams from './AdditiveParams';
import PluckParams from './PluckParams';
import GranularParams from './GranularParams';

const PANELS = {
  subtractive: SubtractiveParams,
  fm: FmParams,
  additive: AdditiveParams,
  pluck: PluckParams,
  granular: GranularParams,
};

/**
 * One rack widget: header (identity and actions), params, footer (routing and level)
 * in a fixed vertical order (layout-and-responsive.md "Widget anatomy").
 */
export default function WidgetCard({ widget, song, pluckEngine, headingRef, actions }) {
  const partId = useId();
  const { id, name, type } = widget;
  const Panel = PANELS[type];
  const partOptions = [{ value: 'all', label: 'All parts' }];
  if (song) for (const p of song.parts) partOptions.push({ value: p.key, label: p.label, title: p.label });
  const selected = partOptions.find((o) => o.value === widget.part);

  return (
    <Card aria-labelledby={`${partId}-title`}>
      <div className="flex items-center gap-2">
        <Heading level={2} id={`${partId}-title`} ref={headingRef} tabIndex={-1} className="min-w-0 flex-1 truncate">
          {name}
        </Heading>
        <Chip pressed={widget.armed} aria-label={`Live input to ${name}`} onClick={() => actions.arm(id, !widget.armed)}>
          Live
        </Chip>
        <Chip pressed={widget.muted} aria-label={`Mute ${name}`} onClick={() => actions.update(id, { muted: !widget.muted })}>
          M
        </Chip>
        <Chip pressed={widget.solo} aria-label={`Solo ${name}`} onClick={() => actions.update(id, { solo: !widget.solo })}>
          S
        </Chip>
        <IconButton label={`Remove ${name}`} onClick={() => actions.remove(id)}>
          ✕
        </IconButton>
      </div>

      <CardSection dimmed={widget.muted} className="flex flex-col gap-3">
        <Panel
          widget={widget}
          engine={type === 'pluck' ? pluckEngine : undefined}
          onParam={(paramName, value) => actions.param(id, paramName, value)}
          onHarmonic={(index, value) => actions.harmonic(id, index, value)}
          onSample={type === 'granular' ? (file) => actions.loadSample(id, file) : undefined}
        />
      </CardSection>

      <div className="flex flex-col gap-3 border-t border-border pt-3">
        <Select
          id={partId}
          label="Part"
          labelClassName="w-24"
          value={widget.part}
          onChange={(value) => {
            const opt = partOptions.find((o) => o.value === value);
            actions.update(id, { part: value, requestedPart: null, partLabel: value === 'all' ? null : opt?.label ?? null });
          }}
          options={partOptions}
          disabled={!song}
          title={selected ? selected.label : undefined}
        />
        <VolumeSlider
          value={widget.volumeDb}
          defaultDb={VOLUME.widgetDefault}
          onChange={(volumeDb) => actions.update(id, { volumeDb })}
          editable
        />
      </div>
    </Card>
  );
}
