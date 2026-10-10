'use client';

import { useEffect, useRef } from 'react';
import { RECORD_MAX_SECONDS } from '@/audio/recording/recorder';
import MasterSection from './MasterSection';
import RecordControls from './RecordControls';
import SongControls from './SongControls';
import LiveInputControls from './LiveInputControls';
import { formatClock, formatClock2 } from './format';
import { rowInner, rowPad } from './layout';

const PEAK_HOLD_S = 1;

/**
 * All meta controls in one bordered band (layout-and-responsive.md "Transport placement"):
 * the Master group (Record, master volume, meter, Limit badge, Panic), the Song group once
 * a MIDI file is loaded, `fileMenu`, and the live-input row last.
 * Mobile: Master is a fixed two-row bottom bar; Song, the menu and live input stay in flow
 * under the header. Desktop (lg): one sticky bar, Master first so it does not move when a
 * song appears, the menu at the right end of the first row, live input on its own row.
 * Position, meter, Limit badge and recording time are written to the DOM once per animation
 * frame; audio is never driven from rAF.
 */
export default function Transport({ session, ui, song, songName, readingMidi, fileMenu, actions }) {
  const posRef = useRef(null);
  const meterRef = useRef(null);
  const limitRef = useRef(null);
  const elapsedRef = useRef(null);
  const barRef = useRef(null);
  const duration = song ? song.durationSeconds : 0;
  const running = ui.audioState === 'running';

  // Publishes the mobile bottom bar's height as --bottom-bar-h so toasts sit above it.
  useEffect(() => {
    const el = barRef.current;
    const root = document.documentElement;
    const publish = () => {
      const fixed = getComputedStyle(el).position === 'fixed';
      root.style.setProperty('--bottom-bar-h', `${fixed ? el.offsetHeight : 0}px`);
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--bottom-bar-h');
    };
  }, []);

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
      className={`border-b border-border bg-surface ${rowPad} pt-1 pb-4 lg:sticky lg:top-0 lg:z-30 lg:py-4`}
    >
      <div className={`${rowInner} flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-6 lg:gap-y-3`}>
        <div ref={barRef} className={`fixed inset-x-0 bottom-0 z-30 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border bg-surface ${rowPad} pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:order-1 lg:static lg:z-auto lg:flex-nowrap lg:gap-6 lg:border-0 lg:p-0`}>
          <div className="order-1 flex min-w-0 flex-1 flex-wrap items-center gap-2 lg:order-none lg:flex-none">
            <RecordControls
              ui={ui}
              available={running && ui.caps.recorder === true}
              onToggle={actions.recordToggle}
              elapsedRef={elapsedRef}
            />
          </div>
          <MasterSection ui={ui} onMaster={actions.master} onPanic={actions.panic} onUnmute={actions.unmute} meterRef={meterRef} limitRef={limitRef} />
        </div>
        {/* Mobile: Song and the menu share the in-flow row under the header. lg: `contents`
            makes both direct items of the bar: the menu is pushed to the right end of the first
            row (after Master), and Song takes its own full-width row below, flush with the rows
            around it. Master, Song and the menu need about 1,360 px in one row, wider than the
            bar's 1,216 px content, so Song never shares the first row. */}
        <div className="flex items-start gap-2 pt-3 lg:contents">
          {(song || readingMidi) && (
            <div className="min-w-0 flex-1 lg:order-3 lg:basis-full">
              <SongControls ui={ui} song={song} songName={songName} readingMidi={readingMidi} posRef={posRef} actions={actions} />
            </div>
          )}
          <div className="ml-auto shrink-0 lg:order-2">{fileMenu}</div>
        </div>
        <div className="empty:hidden lg:order-4 lg:basis-full">
          <LiveInputControls ui={ui} actions={actions} />
        </div>
      </div>
    </section>
  );
}
