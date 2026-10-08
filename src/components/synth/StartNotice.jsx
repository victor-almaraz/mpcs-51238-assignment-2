'use client';

import { useRef } from 'react';
import { Button, Dialog } from '@/design-systems/meta';

/** Shown before the first audio start in a session (audio-safety.md "Start notice"). */
export default function StartNotice({ open, onStart, onCancel, silentSwitchNote }) {
  const startRef = useRef(null);
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title="Before you start"
      initialFocusRef={startRef}
      actions={
        <>
          <Button onClick={onCancel}>Cancel</Button>
          <Button ref={startRef} variant="secondary" onClick={onStart}>
            Start audio
          </Button>
        </>
      }
    >
      <p className="text-sm">Lower your device volume before starting. Headphones can reach harmful levels.</p>
      {silentSwitchNote && (
        <p className="text-sm">On this device the silent switch mutes web audio. Turn it off to hear sound.</p>
      )}
    </Dialog>
  );
}
