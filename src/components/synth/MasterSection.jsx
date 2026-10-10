'use client';

import { useId } from 'react';
import { useDesignSystem } from './design-system-context';
import { VOLUME } from '@/audio/synths/param-defs';
import VolumeSlider from './widgets/VolumeSlider';

/**
 * Master volume, meter, Limit badge and Panic / Reset (audio-safety.md "Safety UI"). The meter and
 * the Limit badge are driven per animation frame by Transport through refs.
 *
 * One button reads "Panic" while sound plays and "Reset" while muted. Panic (click, Enter,
 * Space, or Escape anywhere) mutes. Reset takes a pointer click: a click synthesised from the
 * keyboard (`detail === 0`) and the later clicks of a double-click (`detail > 1`) are ignored,
 * and the session ignores Reset for 1 s after a Panic, so neither a key nor fast repeated
 * clicks bring sound back. Moving the master volume also unmutes, which keeps a keyboard
 * path. The label carries the state, so the button has no aria-pressed. Panic uses the danger
 * variant so it is the most visible control on the page; Reset is a plain secondary button.
 *
 * On mobile the wrapper is `display: contents` so the button can join the first row of the
 * bottom bar (order-2) while the volume and meter form the second row (order-3).
 */
export default function MasterSection({ ui, onMaster, onPanic, onUnmute, meterRef, limitRef }) {
  const { Badge, Button, Meter } = useDesignSystem();
  const hintId = useId();
  const onClick = (e) => {
    if (!ui.masterMuted) onPanic();
    else if (e.detail === 1) onUnmute();   // a single pointer click; never a key (0) or the 2nd click of a double-click
  };
  return (
    <div className="contents lg:flex lg:flex-wrap lg:items-center lg:gap-3">
      <div className="order-3 flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-1 lg:order-none lg:w-auto lg:flex-nowrap">
        <div className="min-w-0 basis-full sm:basis-0 sm:flex-1 lg:w-80 lg:flex-none lg:basis-auto">
          <VolumeSlider
            label="Master"
            value={ui.masterDb}
            maxDb={ui.maxMasterDb}
            defaultDb={VOLUME.masterDefault}
            onChange={onMaster}
          />
        </div>
        <Meter ref={meterRef} className="w-28 shrink-0 sm:w-44" />
        <span ref={limitRef} hidden>
          <Badge tone="strong">
            <span aria-hidden="true">▲ </span>Limit
          </Badge>
        </span>
        {ui.masterMuted && <span className="text-sm font-semibold">Muted</span>}
        {ui.reducedSafety && <span className="text-sm">Reduced safety mode</span>}
      </div>
      <Button
        variant={ui.masterMuted ? 'secondary' : 'danger'}
        size="lg"
        onClick={onClick}
        aria-keyshortcuts={ui.masterMuted ? undefined : 'Escape'}
        aria-describedby={ui.masterMuted ? hintId : undefined}
        title={ui.masterMuted ? 'Click to restore sound, or move the master volume' : undefined}
        className="order-2 lg:order-none"
      >
        {ui.masterMuted ? 'Reset' : 'Panic'}
      </Button>
      {ui.masterMuted && (
        <span id={hintId} className="sr-only">
          Muted. Click to restore sound, or move the master volume.
        </span>
      )}
    </div>
  );
}
