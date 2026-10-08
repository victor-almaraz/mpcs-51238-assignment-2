'use client';

import { useEffect, useState } from 'react';
import { Button, TextOutput, ToggleButton } from '@/design-systems/meta';
import { isTouchOnly } from '@/live/keyboard';
import { isMidiSupported } from '@/live/web-midi';
import AddSynthMenu from './AddSynthMenu';

/**
 * Add synth (left) and the live-input group (right) on desktop; stacked rows on mobile.
 * Play with keyboard is hidden on touch-only devices; Connect MIDI device is absent
 * without Web MIDI (live-input.md). Both checks run after hydration.
 */
export default function RackToolbar({ ui, showAdd, onAdd, actions }) {
  const [env, setEnv] = useState({ touchOnly: true, midi: false });
  useEffect(() => {
    setEnv({ touchOnly: isTouchOnly(), midi: isMidiSupported() });
  }, []);

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      {showAdd ? <AddSynthMenu onAdd={onAdd} pluckAvailable={ui.caps.ks} className="w-full md:w-auto" /> : <span className="hidden md:block" />}
      <div role="group" aria-label="Live input" className="flex flex-wrap items-center gap-2">
        {!env.touchOnly && (
          <>
            <ToggleButton pressed={ui.keyboardOn} onClick={actions.keyboardToggle}>
              Play with keyboard
            </ToggleButton>
            <Button onClick={() => actions.octave('down')} disabled={!ui.canOctaveDown} aria-label="Octave down">
              <span aria-hidden="true">−</span>
            </Button>
            <TextOutput aria-live="off" aria-label="Keyboard octave">{ui.octave}</TextOutput>
            <Button onClick={() => actions.octave('up')} disabled={!ui.canOctaveUp} aria-label="Octave up">
              <span aria-hidden="true">+</span>
            </Button>
          </>
        )}
        {env.midi && !ui.midiStatus && <Button onClick={actions.connectMidi}>Connect MIDI device</Button>}
        {ui.midiStatus && (
          <span className="text-sm" title={ui.midiStatus.title || undefined}>
            {ui.midiStatus.text}
          </span>
        )}
      </div>
    </div>
  );
}
