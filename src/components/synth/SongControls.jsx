'use client';

import { Button, ProgressBar, TextOutput } from '@/design-systems/meta';
import { formatClock } from './format';

/**
 * Song name, Play/Stop, position, Render to WAV and render progress. Shown only once a
 * MIDI file is loaded or being read. The position text is written per animation frame
 * by Transport through `posRef`.
 */
export default function SongControls({ ui, song, songName, readingMidi, posRef, actions }) {
  const rendering = ui.renderState !== 'idle';
  const recording = ui.recState !== 'idle';
  return (
    <div role="group" aria-label="MIDI song" className="flex min-w-0 flex-wrap items-center gap-2">
      <span className="max-w-48 truncate text-sm font-semibold" title={songName ?? undefined}>
        {readingMidi ? 'Reading MIDI file…' : songName}
      </span>
      <Button size="lg" onClick={actions.playToggle} disabled={!song}>
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
      {song && (
        <TextOutput ref={posRef} aria-live="off" aria-label="Position">
          {`0:00 / ${formatClock(song.durationSeconds)}`}
        </TextOutput>
      )}
      <Button
        size="lg"
        onClick={actions.render}
        disabled={!song || rendering || recording || ui.masterMuted}
        title={
          recording ? 'Stop recording to render'
            : ui.masterMuted ? 'Muted after Panic: move the master volume to render' : undefined
        }
      >
        Render to WAV
      </Button>
      {rendering && (
        <span className="flex items-center gap-2 text-sm">
          <ProgressBar value={ui.renderProgress} label="Render progress" className="w-24" />
          <span className="tabular-nums">
            {ui.renderState === 'saving'
              ? 'Saving WAV…'
              : ui.renderProgress === null ? 'Rendering…' : `Rendering ${ui.renderProgress} %`}
          </span>
          <Button onClick={actions.cancelRender}>Cancel</Button>
        </span>
      )}
    </div>
  );
}
