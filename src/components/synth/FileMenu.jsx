'use client';

import { useRef } from 'react';
import { useDesignSystem } from './design-system-context';

const FORMATS = [
  { value: 'pcm16', label: 'WAV 16-Bit' },
  { value: 'float32', label: 'WAV 32-Bit Float' },
];

/**
 * File menu, the last item of the transport bar: Load MIDI, Save Patch, Load Patch, and the WAV format shared
 * by Record and Render (recording.md "UI"). The file inputs are visually hidden and
 * opened from the menu items; focus returns to the menu button.
 */
export default function FileMenu({ ui, hasWidgets, readingMidi, format, onFormat, actions, buttonRef: outerRef }) {
  const { MenuButton } = useDesignSystem();
  const ownRef = useRef(null);
  const buttonRef = outerRef ?? ownRef;   // SynthApp passes one to return focus here after unloading a song
  const midiRef = useRef(null);
  const patchRef = useRef(null);
  const capturing = ui.recState !== 'idle' || ui.renderState !== 'idle';

  const items = [
    { value: 'midi', label: readingMidi ? 'Reading MIDI File…' : 'Load MIDI File…', disabled: readingMidi },
    { value: 'save', label: 'Save Patch', disabled: !hasWidgets, disabledReason: 'add a synth first' },
    { value: 'patch', label: 'Load Patch…' },
    { type: 'separator', value: 'formats' },
    ...FORMATS.map((f) => ({
      type: 'radio',
      value: f.value,
      label: f.label,
      checked: format === f.value,
      disabled: capturing,
      disabledReason: 'recording or rendering',
    })),
  ];

  const handlers = {
    midi: () => midiRef.current?.click(),
    patch: () => patchRef.current?.click(),
    save: actions.savePatch,
  };

  const onSelect = (value) => {
    buttonRef.current?.focus();
    if (handlers[value]) handlers[value]();
    else onFormat(value);
  };

  return (
    <>
      <MenuButton ref={buttonRef} label="File" items={items} onSelect={onSelect} variant="secondary" align="end" />
      <HiddenFileInput inputRef={midiRef} accept=".mid,.midi,.rmi,audio/midi,audio/x-midi" onFile={actions.loadMidi} />
      <HiddenFileInput inputRef={patchRef} accept=".json,application/json" onFile={actions.loadPatch} />
    </>
  );
}

/** Out of the tab order and the accessibility tree; reached only through the menu. */
function HiddenFileInput({ inputRef, accept, onFile }) {
  const onChange = (e) => {
    const input = e.target;
    const file = input.files && input.files[0];
    input.value = '';
    if (file) onFile(file);
  };
  return <input ref={inputRef} type="file" accept={accept} onChange={onChange} tabIndex={-1} aria-hidden="true" className="sr-only" />;
}
