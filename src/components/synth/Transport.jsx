'use client';

import { useEffect, useRef } from 'react';
import { RECORD_MAX_SECONDS } from '@/audio/recording/recorder';
import MasterSection from './MasterSection';
import RecordControls from './RecordControls';
import SongControls from './SongControls';
import { formatClock, formatClock2 } from './format';
import { rowInner, rowPad } from './layout';

const PEAK_HOLD_S = 1;

/**
 * Master group (Record, master volume, meter, Limit badge, Panic) and, once a MIDI file is
 * loaded, the Song group, in one component (layout-and-responsive.md "Transport placement").
 * Mobile: Master is a fixed two-row bottom bar and Song stays in flow under the header.
 * Desktop (lg): both groups sit in one sticky bar under the header, Master first so it
 * does not move when a song appears. `fileMenu` is always the last item.
 * Position, meter, Limit badge and recording time are written to the DOM once per animation
 * frame; audio is never driven from rAF.
 */
export default function Transport({ session, ui, song, songName, readingMidi, fileMenu, actions }) {
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
      className={`border-border bg-surface ${rowPad} lg:sticky lg:top-0 lg:z-30 lg:border-b lg:py-2`}
    >
      <div className={`${rowInner} flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-6`}>
        <div className={`fixed inset-x-0 bottom-0 z-30 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border bg-surface ${rowPad} pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:static lg:z-auto lg:flex-nowrap lg:gap-6 lg:border-0 lg:p-0`}>
          <div className="order-1 flex min-w-0 flex-1 flex-wrap items-center gap-2 lg:order-none lg:flex-none">
            <RecordControls
              ui={ui}
              available={running && ui.caps.recorder === true}
              onToggle={actions.recordToggle}
              elapsedRef={elapsedRef}
            />
          </div>
          <MasterSection ui={ui} onMaster={actions.master} onPanic={actions.panic} meterRef={meterRef} limitRef={limitRef} />
        </div>
        {/* Mobile: Song and the menu share the in-flow row under the header. lg: `contents`
            makes both direct items of the bar, and the menu is pushed to its right end. */}
        <div className="flex items-start gap-2 py-2 lg:contents">
          {(song || readingMidi) && (
            <div className="min-w-0 flex-1 lg:flex-none xl:border-l xl:border-border xl:pl-6">
              <SongControls ui={ui} song={song} songName={songName} readingMidi={readingMidi} posRef={posRef} actions={actions} />
            </div>
          )}
          <div className="ml-auto shrink-0">{fileMenu}</div>
        </div>
      </div>
    </section>
  );
}
