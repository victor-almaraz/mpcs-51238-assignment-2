'use client';

import { Badge, Button, Meter } from '@/design-systems/meta';
import { VOLUME } from '@/audio/synths/param-defs';
import VolumeSlider from './widgets/VolumeSlider';

/**
 * Master volume, meter, Limit badge and Panic (audio-safety.md "Safety UI"). The meter and
 * the Limit badge are driven per animation frame by Transport through refs.
 *
 * On mobile the wrapper is `display: contents` so Panic can join the first row of the
 * bottom bar (order-2) while the volume and meter form the second row (order-3).
 */
export default function MasterSection({ ui, onMaster, onPanic, meterRef, limitRef }) {
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
      <Button size="lg" onClick={onPanic} aria-keyshortcuts="Escape" className="order-2 lg:order-none">
        Panic
      </Button>
    </div>
  );
}
