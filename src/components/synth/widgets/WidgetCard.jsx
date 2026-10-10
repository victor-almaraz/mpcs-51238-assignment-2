'use client';

import { useId } from 'react';
import { useDesignSystem } from '../design-system-context';
import { TUNING_DEFS, VOLUME } from '@/audio/synths/param-defs';
import VolumeSlider from './VolumeSlider';
import ParamSlider from './ParamSlider';
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
 * One rack widget: header (identity and actions), params, footer (routing, level, tuning)
 * in a fixed vertical order (layout-and-responsive.md "Widget anatomy").
 *
 * The header is one row: the title (a disclosure button, truncating when space runs out) and
 * the Live / M / S / Lock / Remove controls. Collapsing hides the params and footer. Lock disables
 * every control that changes the sound or routing (params, part, volume, tuning, Remove);
 * Live, M and S stay available, so a locked widget can always be muted.
 */
export default function WidgetCard({ widget, song, pluckEngine, headingRef, actions }) {
  const { Card, CardSection, Chip, DisclosureButton, Heading, IconButton, Select } = useDesignSystem();
  const partId = useId();
  const bodyId = useId();
  const { id, name, type, locked, collapsed } = widget;
  const Panel = PANELS[type];
  const partOptions = [{ value: 'all', label: 'All parts' }];
  if (song) for (const p of song.parts) partOptions.push({ value: p.key, label: p.label, title: p.label });
  const selected = partOptions.find((o) => o.value === widget.part);

  return (
    <Card aria-labelledby={`${partId}-title`}>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Heading level={2} id={`${partId}-title`} ref={headingRef} tabIndex={-1} className="flex min-w-0 flex-1">
          <DisclosureButton expanded={!collapsed} controls={bodyId} title={name} onClick={() => actions.update(id, { collapsed: !collapsed })}>
            {name}
          </DisclosureButton>
        </Heading>
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
          <Chip pressed={widget.armed} aria-label={`Live input to ${name}`} onClick={() => actions.arm(id, !widget.armed)}>
            Live
          </Chip>
          <Chip pressed={widget.muted} aria-label={`Mute ${name}`} onClick={() => actions.update(id, { muted: !widget.muted })}>
            M
          </Chip>
          <Chip pressed={widget.solo} aria-label={`Solo ${name}`} onClick={() => actions.update(id, { solo: !widget.solo })}>
            S
          </Chip>
          <Chip
            pressed={locked}
            aria-label={`Lock ${name}`}
            title={locked ? 'Locked: unlock to edit' : 'Lock to prevent changes'}
            onClick={() => actions.update(id, { locked: !locked })}
          >
            Lock
          </Chip>
          <IconButton label={`Remove ${name}`} onClick={() => actions.remove(id)} disabled={locked} title={locked ? 'Unlock to remove' : undefined}>
            ✕
          </IconButton>
        </div>
      </div>

      <div id={bodyId} hidden={collapsed} className="flex flex-col gap-4">
        <CardSection dimmed={widget.muted} className="flex flex-col gap-3">
          <Panel
            widget={widget}
            disabled={locked}
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
            disabled={!song || locked}
            title={selected ? selected.label : undefined}
          />
          <VolumeSlider
            value={widget.volumeDb}
            defaultDb={VOLUME.widgetDefault}
            onChange={(volumeDb) => actions.update(id, { volumeDb })}
            disabled={locked}
            editable
          />
          {TUNING_DEFS.map((def) => (
            <ParamSlider key={def.name} def={def} value={widget[def.name]} onChange={(v) => actions.tune(id, def.name, v)} disabled={locked} />
          ))}
        </div>
      </div>
    </Card>
  );
}
