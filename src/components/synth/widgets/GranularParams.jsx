'use client';

import { useDesignSystem } from '../design-system-context';
import { PARAM_DEFS } from '@/audio/synths/param-defs';
import ParamControl from './ParamControl';

const SAMPLE_ACCEPT = 'audio/*,.wav,.mp3,.ogg,.oga,.flac,.m4a,.aac';

/**
 * Granular params. With the File source selected, a row under Source holds Load File… and
 * the loaded file's name; without a loaded file the widget is silent and the row says so.
 * A loaded sample is kept when another source is chosen, so switching back needs no reload.
 */
export default function GranularParams({ onSample, ...props }) {
  const { FileButton } = useDesignSystem();
  const { widget, disabled } = props;
  const [sourceDef, ...rest] = PARAM_DEFS.granular;
  const sample = widget.sample;
  return (
    <>
      <ParamControl def={sourceDef} {...props} />
      {widget.params.source === 'sample' && (
        <div className="flex min-w-0 items-center gap-2">
          <span className="hidden w-24 shrink-0 sm:block" aria-hidden="true" />
          <FileButton accept={SAMPLE_ACCEPT} onFile={onSample} size="md" disabled={disabled} aria-label={`Load file for ${widget.name}`}>
            Load File…
          </FileButton>
          <span className="min-w-0 flex-1 truncate text-sm" title={sample ? sample.name : undefined}>
            {sample ? sample.name : 'No file loaded: silent'}
          </span>
        </div>
      )}
      {rest.map((def) => (
        <ParamControl key={def.name} def={def} {...props} />
      ))}
    </>
  );
}
