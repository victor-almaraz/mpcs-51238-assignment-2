'use client';

import { useReducer } from 'react';
import { defaultParams } from '@/audio/synths/param-defs';
import { createWidget, rackReducer } from '@/state/rack';
import { DesignSystemProvider } from '@/components/synth/design-system-context';
import WidgetCard from '@/components/synth/widgets/WidgetCard';
import { Entry, Panel, State, States } from './parts';

/** A stand-in for a loaded MIDI file: enough for the Part select. */
const SONG = {
  parts: [
    { key: 't1', label: 'Track 1 · Piano' },
    { key: 't2', label: 'Track 2 · Strings' },
  ],
};

/**
 * The widgets shown: every synth type expanded, then the widget states the app reaches.
 * `song` false leaves the Part select disabled at "All parts"; `engine` is the pluck engine state.
 */
const SPECIMENS = [
  { label: 'Subtractive, armed for live input, part chosen', type: 'subtractive', extra: { armed: true, part: 't1', partLabel: 'Track 1 · Piano' } },
  { label: 'FM', type: 'fm' },
  { label: 'Additive (harmonic bars)', type: 'additive' },
  { label: 'Pluck', type: 'pluck', engine: 'ready' },
  { label: 'Granular, File source with a file loaded', type: 'granular', extra: { sample: { name: 'rain-on-tin-roof.wav' }, source: 'sample' } },
  { label: 'Granular, File source without a file', type: 'granular', extra: { source: 'sample' }, song: false },
  { label: 'Muted (params dimmed), soloed', type: 'fm', extra: { muted: true, solo: true } },
  { label: 'Locked, tuned down an octave and up 25 cents', type: 'subtractive', extra: { locked: true, octave: -1, cents: 25 } },
  { label: 'Pluck while its engine loads', type: 'pluck', engine: 'loading' },
  { label: 'Pluck where AudioWorklet is unavailable', type: 'pluck', engine: 'unavailable' },
  { label: 'Collapsed', type: 'additive', extra: { collapsed: true } },
];

function initialRack() {
  const widgets = [];
  for (const { type, extra = {} } of SPECIMENS) {
    const { source, ...fields } = extra;
    const w = { ...createWidget(type, widgets), ...fields };
    if (source) w.params = { ...defaultParams(type), source };
    widgets.push(w);
  }
  return { widgets };
}

/** The rack's own WidgetCard, rendered with `ds` and driven by the rack reducer. */
function Widgets({ ds }) {
  const [rack, dispatch] = useReducer(rackReducer, null, initialRack);
  const actions = {
    update: (id, fields) => dispatch({ type: 'update', id, fields }),
    arm: (id, armed) => dispatch({ type: 'update', id, fields: { armed } }),
    remove: () => {},
    param: (id, name, value) => dispatch({ type: 'param', id, name, value }),
    harmonic: (id, index, value) => dispatch({ type: 'harmonic', id, index, value }),
    tune: (id, name, value) => dispatch({ type: 'tune', id, name, value }),
    loadSample: (id, file) => dispatch({ type: 'sample', id, sample: { name: file.name } }),
  };
  return (
    <DesignSystemProvider value={ds}>
      <ul className="grid grid-cols-1 gap-x-4 gap-y-6 lg:grid-cols-2 xl:grid-cols-3">
        {rack.widgets.map((widget, i) => {
          const spec = SPECIMENS[i];
          return (
            <li key={widget.id} className="flex min-w-0 flex-col gap-2">
              <WidgetCard widget={widget} song={spec.song === false ? null : SONG} pluckEngine={spec.engine} actions={actions} />
              <span className="text-xs text-muted">{spec.label}</span>
            </li>
          );
        })}
      </ul>
    </DesignSystemProvider>
  );
}

/** Card, CardSection and Heading, shown through the rack's real widgets. */
export default function Structure({ ds, style }) {
  const { Heading, fontClassName } = ds;
  const panel = { style, fontClassName };

  return (
    <>
      <Entry
        id="card"
        title="Card and CardSection: synth widgets"
        note="The rack's own widget component in this style, with every control: header (title disclosure, Live, M, S, Lock, Remove), params, and footer (Part, Volume, Octave, Cents). The controls work; Remove is inert here."
      >
        <Panel {...panel}>
          <Widgets ds={ds} />
        </Panel>
      </Entry>

      <Entry id="heading" title="Heading" note="Level 1 (page title, hero size) and level 2 (widget and dialog titles); focus-visible when focused by the app.">
        <Panel {...panel}>
          <States>
            <State label="Level 1">
              <Heading level={1}>Synthesizer Rack</Heading>
            </State>
          </States>
          <States>
            <State label="Level 2">
              <Heading level={2}>Before you start</Heading>
            </State>
            <State label="Level 2, focus-visible">
              <Heading level={2} tabIndex={-1} data-force="focus">
                Pluck 5
              </Heading>
            </State>
          </States>
        </Panel>
      </Entry>
    </>
  );
}
