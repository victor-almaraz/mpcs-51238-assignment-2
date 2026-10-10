'use client';

import { useEffect, useRef, useState } from 'react';
import { Entry, Panel, State, States } from './parts';

const noop = () => {};

/** A meter held at fixed levels. */
function StillMeter({ ds, peakDb, rmsDb, holdDb }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.update({ peakDb, rmsDb, holdDb });
  }, [peakDb, rmsDb, holdDb]);
  return <ds.Meter ref={ref} className="w-56" />;
}

function DialogDemo({ ds }) {
  const [open, setOpen] = useState(false);
  const startRef = useRef(null);
  return (
    <>
      <ds.Button onClick={() => setOpen(true)}>Open the start notice</ds.Button>
      <ds.Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Before you start"
        initialFocusRef={startRef}
        actions={
          <>
            <ds.Button onClick={() => setOpen(false)}>Cancel</ds.Button>
            <ds.Button ref={startRef} onClick={() => setOpen(false)}>
              Start Audio
            </ds.Button>
          </>
        }
      >
        <p>Lower your device volume before starting. Headphones can reach harmful levels.</p>
        <p>On this device the silent switch mutes web audio. Turn it off to hear sound.</p>
      </ds.Dialog>
    </>
  );
}

/** Readouts, status and messages. */
export default function Feedback({ ds, style }) {
  const { Alert, Badge, Button, Disclosure, EmptyState, MenuButton, ProgressBar, TextOutput, Toast, fontClassName } = ds;
  const panel = { style, fontClassName };

  return (
    <>
      <Entry id="text-output" title="TextOutput" note="Position and keyboard octave.">
        <Panel {...panel}>
          <States>
            <State label="Position">
              <TextOutput aria-live="off">0:42 / 3:10</TextOutput>
            </State>
            <State label="Octave">
              <TextOutput>C4</TextOutput>
            </State>
          </States>
        </Panel>
      </Entry>

      <Entry id="meter" title="Meter" note="Master level, −60 to 0 dBFS: RMS fill, peak tick, 1 s peak-hold tick and the held peak in numbers.">
        <Panel {...panel}>
          <States>
            <State label="Silent">
              <StillMeter ds={ds} peakDb={-Infinity} rmsDb={-Infinity} />
            </State>
            <State label="Moderate">
              <StillMeter ds={ds} peakDb={-14} rmsDb={-22} holdDb={-10} />
            </State>
            <State label="Near full scale">
              <StillMeter ds={ds} peakDb={-1.5} rmsDb={-6} holdDb={-0.4} />
            </State>
          </States>
        </Panel>
      </Entry>

      <Entry id="badge" title="Badge" note="Limit (master) and Clip (recording), shown or hidden.">
        <Panel {...panel}>
          <States>
            <State label="Strong">
              <Badge tone="strong">
                <span aria-hidden="true">▲ </span>Limit
              </Badge>
            </State>
            <State label="Strong">
              <Badge tone="strong">Clip</Badge>
            </State>
            <State label="Neutral (not reached by the app)">
              <Badge>Neutral</Badge>
            </State>
          </States>
        </Panel>
      </Entry>

      <Entry id="progress" title="ProgressBar" note="Render progress: determinate, or indeterminate without suspend() support.">
        <Panel {...panel}>
          <States>
            <State label="0 %" wide>
              <ProgressBar value={0} label="Render progress" />
            </State>
            <State label="62 %" wide>
              <ProgressBar value={62} label="Render progress" />
            </State>
            <State label="100 %" wide>
              <ProgressBar value={100} label="Render progress" />
            </State>
            <State label="Indeterminate" wide>
              <ProgressBar label="Render progress" />
            </State>
          </States>
        </Panel>
      </Entry>

      <Entry id="alert" title="Alert" note="Errors and audio banners. Meaning is carried by a word and a glyph as well as colour.">
        <Panel {...panel}>
          <div className="flex max-w-2xl flex-col gap-3">
            <Alert tone="warning" live={false} action={<Button>Resume Audio</Button>}>
              Audio is paused by the browser.
            </Alert>
            <Alert tone="warning" live={false} action={<Button>Restore Level</Button>}>
              Level reduced — sustained loud output.
            </Alert>
            <Alert tone="error" live={false} onDismiss={noop}>
              Couldn’t read nocturne.mid: not a Standard MIDI File.
            </Alert>
            <Alert tone="error" live={false} title="Safety stage stopped">
              Output is muted. Restart Audio to continue.
            </Alert>
            <Alert tone="info" live={false}>
              Info tone (not reached by the app).
            </Alert>
            <Alert tone="success" live={false}>
              Success tone (not reached by the app).
            </Alert>
          </div>
        </Panel>
      </Entry>

      <Entry id="toast" title="Toast" note="Status messages at the bottom of the window. Assertive messages are bold.">
        <Panel {...panel}>
          <div className="flex max-w-xl flex-col gap-3">
            <Toast onDismiss={noop}>Patch loaded</Toast>
            <Toast onDismiss={noop}>
              <span className="font-bold">Panic: sound stopped. Click Reset or move the master volume to restore it.</span>
            </Toast>
            <Toast action={<Button>Undo</Button>} onDismiss={noop}>
              Removed Subtractive 1
            </Toast>
            <Toast
              onDismiss={noop}
              details={
                <Disclosure summary="Details">
                  <ul className="list-disc pl-5">
                    <li>Octave adjusted to 3</li>
                    <li>file &apos;rain.wav&apos; is not stored in patches; load it again</li>
                  </ul>
                </Disclosure>
              }
            >
              Patch loaded with 2 warnings
            </Toast>
          </div>
        </Panel>
      </Entry>

      <Entry id="disclosure" title="Disclosure" note="Details of warnings in a toast: closed, hover, focus-visible and open.">
        <Panel {...panel}>
          <States>
            <State label="Closed">
              <Disclosure summary="Details">Warning text</Disclosure>
            </State>
            <State label="Hover">
              <Disclosure summary="Details" data-force="hover">
                Warning text
              </Disclosure>
            </State>
            <State label="Focus-visible">
              <Disclosure summary="Details" data-force="focus">
                Warning text
              </Disclosure>
            </State>
            <State label="Open">
              <Disclosure summary="Details" open>
                <ul className="list-disc pl-5">
                  <li>Octave adjusted to 3</li>
                </ul>
              </Disclosure>
            </State>
          </States>
        </Panel>
      </Entry>

      <Entry id="dialog" title="Dialog" note="The start notice: modal, initial focus on Start Audio, Escape cancels; shown with the silent-switch note of older iOS.">
        <Panel {...panel}>
          <DialogDemo ds={ds} />
        </Panel>
      </Entry>

      <Entry id="empty-state" title="EmptyState" note="The empty rack, with the Add Synth menu inside.">
        <Panel {...panel}>
          <EmptyState title="No synths yet. Add a synth to start.">
            <MenuButton label="Add Synth" items={[{ value: 'subtractive', label: 'Subtractive' }]} onSelect={noop} />
          </EmptyState>
        </Panel>
      </Entry>
    </>
  );
}
