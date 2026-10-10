'use client';

import { useId, useState } from 'react';
import { SYNTH_INFO } from '@/audio/synths/param-defs';
import { Entry, InteractionStates, Panel, State, States } from './parts';

const noop = () => {};

const ADD_ITEMS = Object.entries(SYNTH_INFO).map(([value, info]) => ({
  value,
  label: info.label,
  description: info.description,
  ...(value === 'pluck' ? { disabled: true, disabledReason: 'AudioWorklet is not supported' } : {}),
}));

const FILE_ITEMS = [
  { value: 'midi', label: 'Load MIDI File…' },
  { value: 'save', label: 'Save Patch', disabled: true, disabledReason: 'the rack is empty' },
  { value: 'load', label: 'Load Patch…' },
  { type: 'separator', value: 'sep' },
  { type: 'radio', value: 'wav16', label: 'WAV 16-bit', checked: true },
  { type: 'radio', value: 'wav24', label: 'WAV 24-bit', checked: false },
];

const WAVES = [
  { value: 'sine', label: 'Sine' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'sawtooth', label: 'Saw' },
  { value: 'square', label: 'Square' },
];

const PARTS = [
  { value: 'all', label: 'All parts' },
  { value: 't1', label: 'Track 1 · Piano' },
  { value: 't2', label: 'Track 2 · Strings, a long label that truncates' },
];

function formatHz(v) {
  return v >= 1000 ? `${(v / 1000).toFixed(1)} kHz` : `${Math.round(v)} Hz`;
}

/** A working slider with its own value; `force` sets data-force on the input. */
function DemoSlider({ ds, label, initial, min, max, step, format, editable = true, ...rest }) {
  const id = useId();
  const [value, setValue] = useState(initial);
  const text = format(value);
  return (
    <ds.Slider
      id={id}
      label={label}
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={setValue}
      onEditValue={editable ? noop : undefined}
      valueText={text}
      display={text}
      onReset={() => setValue(initial)}
      className="w-full max-w-md"
      {...rest}
    />
  );
}

function DemoSegmented({ ds, force, disabled }) {
  const [value, setValue] = useState('sawtooth');
  const options = WAVES.map((o) => (o.value === force?.value ? { ...o, force: force.state } : o));
  return (
    <ds.SegmentedControl
      legend="Waveform"
      options={options}
      value={value}
      onChange={setValue}
      disabled={disabled}
      className="w-full max-w-md"
    />
  );
}

function DemoSelect({ ds, initial = 't1', ...rest }) {
  const id = useId();
  const [value, setValue] = useState(initial);
  return (
    <ds.Select
      id={id}
      label="Part"
      value={value}
      onChange={setValue}
      options={PARTS}
      title={PARTS.find((p) => p.value === value)?.label}
      className="w-full max-w-md"
      {...rest}
    />
  );
}

function DemoBars({ ds, initial, disabled, label }) {
  const [values, setValues] = useState(initial);
  return (
    <div className="flex w-full max-w-md flex-col gap-1">
      <ds.SliderGroup
        label={label}
        values={values}
        disabled={disabled}
        onChange={(i, v) => setValues((vs) => vs.map((x, j) => (j === i ? v : x)))}
        onEditValue={noop}
      />
    </div>
  );
}

/** Buttons, toggles, menus and value controls. */
export default function Controls({ ds, style }) {
  const { Button, Chip, DisclosureButton, FileButton, IconButton, MenuButton, ToggleButton, ValueField, fontClassName } =
    ds;
  const panel = { style, fontClassName };

  return (
    <>
      <Entry id="button" title="Button" note="Secondary (default), primary (Add Synth), danger (Panic) and ghost; lg 44 px, md 32 px. Panic becomes a secondary Reset while muted.">
        <Panel {...panel}>
          <InteractionStates render={(p) => <Button size="lg" {...p}>Render to WAV</Button>} disabled />
          <InteractionStates render={(p) => <Button variant="primary" size="lg" {...p}>Add Synth</Button>} />
          <InteractionStates render={(p) => <Button variant="danger" size="lg" aria-keyshortcuts="Escape" {...p}>Panic</Button>} />
          <States>
            <State label="lg, glyph and text">
              <Button size="lg">
                <span aria-hidden="true">▶</span> Play
              </Button>
            </State>
            <State label="lg, Reset (secondary, while muted)">
              <Button size="lg" title="Click to restore sound, or move the master volume">
                Reset
              </Button>
            </State>
            <State label="md">
              <Button>Undo</Button>
            </State>
            <State label="ghost">
              <Button variant="ghost">Cancel</Button>
            </State>
            <State label="sm (not reached by the app)">
              <Button size="sm">Small</Button>
            </State>
          </States>
        </Panel>
      </Entry>

      <Entry id="toggle" title="ToggleButton" note="Record and Play with Keyboard. Pressed is lit.">
        <Panel {...panel}>
          <InteractionStates render={(p) => <ToggleButton size="lg" {...p}>Record</ToggleButton>} disabled />
          <InteractionStates render={(p) => <ToggleButton size="lg" pressed {...p}>Record</ToggleButton>} />
        </Panel>
      </Entry>

      <Entry id="chip" title="Chip" note="Live, M, S and Lock on each widget; unpressed and pressed independently.">
        <Panel {...panel}>
          <InteractionStates render={(p) => <Chip {...p}>Live</Chip>} />
          <InteractionStates render={(p) => <Chip pressed {...p}>Live</Chip>} />
          <States>
            <State label="M, S, Lock (Lock pressed)">
              <div className="flex gap-2">
                <Chip>M</Chip>
                <Chip pressed>S</Chip>
                <Chip pressed title="Locked: unlock to edit">
                  Lock
                </Chip>
              </div>
            </State>
          </States>
        </Panel>
      </Entry>

      <Entry id="icon-button" title="IconButton" note="Ghost ✕ for Remove and dismiss. Remove is disabled while the widget is locked.">
        <Panel {...panel}>
          <InteractionStates
            render={(p) => (
              <IconButton label="Remove" title={p.disabled ? 'Unlock to remove' : undefined} {...p}>
                ✕
              </IconButton>
            )}
            disabled
          />
        </Panel>
      </Entry>

      <Entry id="disclosure-button" title="DisclosureButton" note="Widget title: expanded ▾ and collapsed ▸; long labels truncate.">
        <Panel {...panel}>
          <InteractionStates
            render={(p) => (
              <ds.Heading level={2} className="flex w-56">
                <DisclosureButton expanded {...p}>
                  Subtractive 1
                </DisclosureButton>
              </ds.Heading>
            )}
            extra={[['Collapsed', { expanded: false }]]}
          />
          <States>
            <State label="Truncated">
              <ds.Heading level={2} className="flex w-44">
                <DisclosureButton expanded>Granular with a long name</DisclosureButton>
              </ds.Heading>
            </State>
          </States>
        </Panel>
      </Entry>

      <Entry
        id="menu-button"
        title="MenuButton"
        note="Add Synth (primary, flow) and File (secondary, end-aligned, radio items). Open menus close on a click elsewhere; reload to see them again."
      >
        <Panel {...panel}>
          <InteractionStates render={(p) => <MenuButton label="Add Synth" items={ADD_ITEMS} onSelect={noop} {...p} />} />
          <InteractionStates
            render={(p) => <MenuButton label="File" variant="secondary" size="lg" align="end" items={FILE_ITEMS} onSelect={noop} {...p} />}
          />
          <div className="grid gap-6 md:grid-cols-2">
            <State label="Open: descriptions, a disabled item with its reason, a hovered item" wide>
              <MenuButton
                label="Add Synth"
                defaultOpen
                items={ADD_ITEMS.map((it) => (it.value === 'fm' ? { ...it, force: 'hover' } : it))}
                onSelect={noop}
                menuClassName="md:static!"
                className="w-full pb-2"
              />
            </State>
            <State label="Open: separator, radio checked and unchecked, a focused item" wide>
              <MenuButton
                label="File"
                variant="secondary"
                size="lg"
                align="end"
                defaultOpen
                items={FILE_ITEMS.map((it) => (it.value === 'load' ? { ...it, force: 'focus' } : it))}
                onSelect={noop}
                menuClassName="static!"
                className="w-full pb-2"
              />
            </State>
          </div>
        </Panel>
      </Entry>

      <Entry id="file-button" title="FileButton" note="Load File… on a granular widget (md). Disabled while locked.">
        <Panel {...panel}>
          <InteractionStates
            render={(p) => (
              <FileButton size="md" accept="audio/*" onFile={noop} {...p}>
                Load File…
              </FileButton>
            )}
            disabled
            extra={[['Busy (not reached by the app)', { busy: true }]]}
          />
        </Panel>
      </Entry>

      <Entry
        id="slider"
        title="Slider"
        note="Number params, widget volume, tuning (with a ValueField readout) and master volume (plain readout). Delete or double-click resets."
      >
        <Panel {...panel}>
          <div className="grid gap-x-8 gap-y-4 lg:grid-cols-2">
            {[
              ['Default', undefined],
              ['Hover', 'hover'],
              ['Active', 'active'],
              ['Focus-visible', 'focus'],
            ].map(([label, force]) => (
              <State key={label} label={label} wide>
                <DemoSlider ds={ds} label="Cutoff" initial={2000} min={20} max={18000} step={1} format={formatHz} data-force={force} />
              </State>
            ))}
            <State label="At minimum" wide>
              <DemoSlider ds={ds} label="Cutoff" initial={20} min={20} max={18000} step={1} format={formatHz} />
            </State>
            <State label="At maximum" wide>
              <DemoSlider ds={ds} label="Cutoff" initial={18000} min={20} max={18000} step={1} format={formatHz} />
            </State>
            <State label="Volume at the bottom (Off)" wide>
              <DemoSlider ds={ds} label="Volume" initial={-60.5} min={-60.5} max={0} step={0.5} format={(v) => (v <= -60.5 ? 'Off' : `${v.toFixed(1)} dB`)} />
            </State>
            <State label="Signed tuning" wide>
              <DemoSlider ds={ds} label="Cents" initial={-25} min={-100} max={100} step={1} format={(v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)} cents`} />
            </State>
            <State label="Master: plain readout" wide>
              <DemoSlider ds={ds} label="Master" initial={-12} min={-60.5} max={0} step={0.5} editable={false} format={(v) => `${v.toFixed(1).replace('-', '−')} dB`} />
            </State>
            <State label="Disabled (locked widget)" wide>
              <DemoSlider ds={ds} label="Resonance" initial={4} min={0.1} max={20} step={0.1} disabled format={(v) => v.toFixed(1)} />
            </State>
          </div>
        </Panel>
      </Entry>

      <Entry id="value-field" title="ValueField" note="Typed values. Showing, hover, focused (editing) and disabled.">
        <Panel {...panel}>
          <States>
            {[
              ['Showing', undefined],
              ['Hover', 'hover'],
              ['Focused / editing', 'focus'],
            ].map(([label, force]) => (
              <State key={label} label={label}>
                <ValueField label={`${label} example`} display="2.0 kHz" onCommit={noop} data-force={force} className="w-20 px-1 text-right" />
              </State>
            ))}
            <State label="Disabled">
              <ValueField label="Disabled example" display="2.0 kHz" onCommit={noop} disabled className="w-20 px-1 text-right" />
            </State>
          </States>
        </Panel>
      </Entry>

      <Entry id="slider-group" title="SliderGroup" note="Harmonic bars with a ValueField row. Drag, or use the arrow keys on a focused bar.">
        <Panel {...panel}>
          <div className="grid gap-6 md:grid-cols-2">
            <State label="Values 0–100 %" wide>
              <DemoBars ds={ds} label="Harmonics" initial={[1, 0.5, 0.33, 0.25, 0.2, 0.17, 0.14, 0.12]} />
            </State>
            <State label="All at 0 (the app adds “All harmonics at 0”)" wide>
              <DemoBars ds={ds} label="Silent harmonics" initial={[0, 0, 0, 0, 0, 0, 0, 0]} />
            </State>
            <State label="Disabled (locked widget)" wide>
              <DemoBars ds={ds} label="Locked harmonics" initial={[1, 0, 0.6, 0, 0.3, 0, 0.1, 0]} disabled />
            </State>
          </div>
        </Panel>
      </Entry>

      <Entry id="segmented" title="SegmentedControl" note="Waveform and Source. One option checked; arrow keys move the selection.">
        <Panel {...panel}>
          <div className="grid gap-x-8 gap-y-4 lg:grid-cols-2">
            <State label="Default (Saw checked)" wide>
              <DemoSegmented ds={ds} />
            </State>
            <State label="Unchecked option hover (Sine)" wide>
              <DemoSegmented ds={ds} force={{ value: 'sine', state: 'hover' }} />
            </State>
            <State label="Unchecked option active (Square)" wide>
              <DemoSegmented ds={ds} force={{ value: 'square', state: 'active' }} />
            </State>
            <State label="Focus-visible on the checked option" wide>
              <DemoSegmented ds={ds} force={{ value: 'sawtooth', state: 'focus' }} />
            </State>
            <State label="Disabled (locked widget)" wide>
              <DemoSegmented ds={ds} disabled />
            </State>
          </div>
        </Panel>
      </Entry>

      <Entry id="select" title="Select" note="Part per widget. Disabled at “All parts” with no MIDI file, or while locked.">
        <Panel {...panel}>
          <div className="grid gap-x-8 gap-y-4 lg:grid-cols-2">
            {[
              ['Default', undefined],
              ['Hover', 'hover'],
              ['Focus-visible', 'focus'],
            ].map(([label, force]) => (
              <State key={label} label={label} wide>
                <DemoSelect ds={ds} data-force={force} />
              </State>
            ))}
            <State label="Disabled (no MIDI file)" wide>
              <DemoSelect ds={ds} initial="all" disabled />
            </State>
          </div>
        </Panel>
      </Entry>
    </>
  );
}
