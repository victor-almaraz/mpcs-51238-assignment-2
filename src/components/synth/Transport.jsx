'use client';

import { useEffect, useRef } from 'react';
import { Button, TextOutput } from '@/design-systems/meta';
import { RECORD_MAX_SECONDS } from '@/audio/recording/recorder';
import MasterSection from './MasterSection';
import RecordControls from './RecordControls';
import FilesGroup from './FilesGroup';
import { formatClock, formatClock2 } from './format';

const PEAK_HOLD_S = 1;

/**
 * Playback, Master and Files groups in one component (layout-and-responsive.md "Transport
 * placement"). Mobile: Playback + Master form a fixed two-row bottom bar and Files stays in
 * flow. Desktop (lg): all three groups sit in one sticky bar under the header.
 * Position, meter, Limit badge and recording time are written to the DOM once per animation
 * frame; audio is never driven from rAF.
 */
export default function Transport({ session, ui, song, songName, readingMidi, hasWidgets, format, onFormat, actions }) {
  const posRef = useRef(null);
  const meterRef = useRef(null);
  const limitRef = useRef(null);
  const elapsedRef = useRef(null);
  const duration = song ? song.durationSeconds : 0;
  const running = ui.audioState === 'running';

  useEffect(() => {
    if (!session) return undefined;
    let frame = 0;
    let hold = -Infinity;
    let holdAt = 0;
    const loop = (now) => {
      if (posRef.current) posRef.current.textContent = `${formatClock(session.position())} / ${formatClock(duration)}`;
      const m = session.readMeters();
      if (m) {
        if (m.peakDb >= hold || now - holdAt > PEAK_HOLD_S * 1000) { hold = m.peakDb; holdAt = now; }
        meterRef.current?.update({ peakDb: m.peakDb, rmsDb: m.rmsDb, holdDb: hold });
        if (limitRef.current) limitRef.current.hidden = !m.limiting;
      }
      if (elapsedRef.current) {
        elapsedRef.current.textContent = `${formatClock2(Math.min(session.recordElapsed(), RECORD_MAX_SECONDS))} / ${formatClock2(RECORD_MAX_SECONDS)}`;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [session, duration]);

  // Space on the transport (outside a control that handles it) toggles play.
  const onKeyDown = (e) => {
    if (e.key !== ' ' || e.target.closest('button, input, select, textarea, label, [role="slider"]')) return;
    e.preventDefault();
    actions.playToggle();
  };

  return (
    <section
      aria-label="Transport"
      aria-busy={readingMidi || undefined}
      onKeyDown={onKeyDown}
      className="border-border bg-surface px-4 lg:sticky lg:top-0 lg:z-30 lg:border-b lg:px-8 lg:py-2"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-6">
        <div className="fixed inset-x-0 bottom-0 z-30 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border bg-surface px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:static lg:z-auto lg:flex-nowrap lg:gap-6 lg:border-0 lg:p-0">
          <div className="order-1 flex min-w-0 flex-1 flex-wrap items-center gap-2 lg:order-none lg:flex-none">
            <Button
              size="lg"
              onClick={actions.playToggle}
              disabled={!song}
              title={song ? undefined : 'Load a MIDI file to play'}
            >
              {ui.playing ? (
                <>
                  <span aria-hidden="true">■</span> Stop
                </>
              ) : (
                <>
                  <span aria-hidden="true">▶</span> Play
                </>
              )}
            </Button>
            <TextOutput ref={posRef} aria-live="off" aria-label="Position">
              {`0:00 / ${formatClock(duration)}`}
            </TextOutput>
            <RecordControls
              ui={ui}
              available={running && ui.caps.recorder === true}
              onToggle={actions.recordToggle}
              elapsedRef={elapsedRef}
            />
          </div>
          <MasterSection ui={ui} onMaster={actions.master} onPanic={actions.panic} meterRef={meterRef} limitRef={limitRef} />
        </div>
        <div className="py-2 lg:py-0">
          <FilesGroup
            ui={ui}
            songName={songName}
            hasSong={!!song}
            readingMidi={readingMidi}
            hasWidgets={hasWidgets}
            format={format}
            onFormat={onFormat}
            actions={actions}
          />
        </div>
      </div>
    </section>
  );
}
