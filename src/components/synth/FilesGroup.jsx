'use client';

import { useId } from 'react';
import { Button, FileButton, ProgressBar, Select } from '@/design-systems/meta';

const FORMATS = [
  { value: 'pcm16', label: 'WAV 16-bit' },
  { value: 'float32', label: 'WAV 32-bit float' },
];

/** Load MIDI, Render to WAV, Format, Save patch, Load patch (layout-and-responsive.md). */
export default function FilesGroup({ ui, songName, hasSong, readingMidi, hasWidgets, format, onFormat, actions }) {
  const midiId = useId();
  const patchId = useId();
  const formatId = useId();
  const rendering = ui.renderState !== 'idle';
  const recording = ui.recState !== 'idle';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FileButton id={midiId} accept=".mid,.midi,.rmi,audio/midi,audio/x-midi" onFile={actions.loadMidi} busy={readingMidi}>
        {readingMidi ? 'Reading…' : 'Load MIDI'}
      </FileButton>
      <span className="max-w-48 truncate text-sm" title={songName ?? undefined}>
        {songName ?? 'No MIDI file loaded'}
      </span>
      <Button
        size="lg"
        onClick={actions.render}
        disabled={!hasSong || rendering || recording || ui.masterMuted}
        title={
          !hasSong ? 'Load a MIDI file to render'
            : recording ? 'Stop recording to render'
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
      <Select
        id={formatId}
        label="Format"
        labelClassName="w-auto"
        className="w-56"
        value={format}
        onChange={onFormat}
        options={FORMATS}
        disabled={recording || rendering}
      />
      <Button size="lg" onClick={actions.savePatch} disabled={!hasWidgets} title={hasWidgets ? undefined : 'Add a synth to save a patch'}>
        Save patch
      </Button>
      <FileButton id={patchId} accept=".json,application/json" onFile={actions.loadPatch}>
        Load patch
      </FileButton>
    </div>
  );
}
