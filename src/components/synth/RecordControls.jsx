'use client';

import { Badge, ToggleButton } from '@/design-systems/meta';
import { formatDb } from './format';

/**
 * Record toggle and the recording indicator (recording.md "UI"). The elapsed text node is
 * written once per animation frame by Transport through `elapsedRef`.
 */
export default function RecordControls({ ui, available, onToggle, elapsedRef }) {
  const recording = ui.recState === 'recording';
  const busy = ui.recState === 'saving' || ui.renderState !== 'idle';
  const reason = !available
    ? ui.caps.recorder === false ? 'Recording is not supported in this browser' : 'Start audio to record'
    : busy ? 'Wait for the current file to finish' : undefined;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ToggleButton
        size="lg"
        pressed={recording}
        onClick={onToggle}
        disabled={!available || (busy && !recording)}
        title={reason}
      >
        <span aria-hidden="true">●</span> Record
      </ToggleButton>
      {recording && (
        <span className="flex items-center gap-2 text-sm tabular-nums">
          <span className="font-semibold">
            <span aria-hidden="true">● </span>REC
          </span>
          <span ref={elapsedRef}>00:00 / 10:00</span>
          <span>Peak {formatDb(ui.recPeakDb)}</span>
          {ui.recClipped && <Badge tone="strong">Clip</Badge>}
        </span>
      )}
      {ui.recState === 'saving' && <span className="text-sm">Saving WAV…</span>}
    </div>
  );
}
