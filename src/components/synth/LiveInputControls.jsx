'use client';

import { useEffect, useState } from 'react';
import { useDesignSystem } from './design-system-context';
import { isTouchOnly } from '@/live/keyboard';
import { isMidiSupported } from '@/live/web-midi';

/**
 * The live-input group, the last row of the transport band. Play with Keyboard is
 * hidden on touch-only devices; Connect MIDI Device is absent without Web MIDI
 * (live-input.md). Both checks run after hydration. Renders nothing when neither applies.
 */
export default function LiveInputControls({ ui, actions }) {
  const { Button, TextOutput, ToggleButton } = useDesignSystem();
  const [env, setEnv] = useState({ touchOnly: true, midi: false });
  useEffect(() => {
    setEnv({ touchOnly: isTouchOnly(), midi: isMidiSupported() });
  }, []);

  if (env.touchOnly && !env.midi && !ui.midiStatus) return null;

  return (
    <div role="group" aria-label="Live input" className="flex flex-wrap items-center gap-2">
      {!env.touchOnly && (
        <>
          <ToggleButton pressed={ui.keyboardOn} onClick={actions.keyboardToggle}>
            Play with Keyboard
          </ToggleButton>
          <Button onClick={() => actions.octave('down')} disabled={!ui.canOctaveDown} aria-label="Octave Down">
            <span aria-hidden="true">−</span>
          </Button>
          <TextOutput aria-live="off" aria-label="Keyboard octave">{ui.octave}</TextOutput>
          <Button onClick={() => actions.octave('up')} disabled={!ui.canOctaveUp} aria-label="Octave Up">
            <span aria-hidden="true">+</span>
          </Button>
        </>
      )}
      {env.midi && !ui.midiStatus && <Button onClick={actions.connectMidi}>Connect MIDI Device</Button>}
      {ui.midiStatus && (
        <span className="text-sm" title={ui.midiStatus.title || undefined}>
          {ui.midiStatus.text}
        </span>
      )}
    </div>
  );
}
