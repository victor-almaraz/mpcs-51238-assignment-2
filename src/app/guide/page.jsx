import Link from 'next/link';
import { Heading } from '@/design-systems/meta';
import SynthTypeTable from '@/components/guide/SynthTypeTable';

export const metadata = {
  title: 'Guide',
};

const linkClass =
  'inline-flex min-h-6 items-center text-sm underline underline-offset-4 rounded-ds hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

const kbd = 'rounded-ds border border-border-strong bg-surface px-1.5 py-0.5 font-mono text-xs';
const cell = 'border-b border-border py-2 pr-4 text-left align-top';

const TOPICS = [
  ['start', 'Getting started'],
  ['widgets', 'Synth widgets'],
  ['midi', 'Playing a MIDI file'],
  ['live', 'Playing live'],
  ['recording', 'Recording and rendering'],
  ['patches', 'Patches'],
  ['volume', 'Volume and stopping sound'],
  ['messages', 'Messages'],
];

const KEYS = [
  ['A', 'C'], ['W', 'C♯'], ['S', 'D'], ['E', 'D♯'], ['D', 'E'], ['F', 'F'], ['T', 'F♯'],
  ['G', 'G'], ['Y', 'G♯'], ['H', 'A'], ['U', 'A♯'], ['J', 'B'], ['K', 'C, one octave up'],
  ['Z', 'Octave down'], ['X', 'Octave up'],
];

/** How to operate the rack, including its volume and stop controls. Meta style, like the hub. */
export default function GuidePage() {
  return (
    <div data-ds="meta" className="min-h-dvh bg-bg text-fg">
      <header className="border-b border-border px-4 py-6 md:px-8 md:py-10">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted">Synthesizer Rack</p>
            <Heading level={1}>Guide</Heading>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/synth/" className={linkClass}>
              Open the rack
            </Link>
            <Link href="/" className={linkClass}>
              Back to Hub
            </Link>
          </div>
        </div>
      </header>

      <main className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 lg:flex-row lg:items-start lg:gap-16">
          <nav aria-labelledby="topics" className="flex flex-col gap-2 lg:sticky lg:top-8 lg:w-56 lg:shrink-0">
            <h2 id="topics" className="text-sm font-semibold text-muted">
              Topics
            </h2>
            <ul className="flex flex-col gap-1">
              {TOPICS.map(([id, title]) => (
                <li key={id}>
                  <a href={`#${id}`} className={linkClass}>
                    {title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex max-w-prose flex-col gap-10 [&_li]:ml-5 [&_ol]:list-decimal [&_p]:leading-relaxed [&_section]:flex [&_section]:scroll-mt-8 [&_section]:flex-col [&_section]:gap-3 [&_ul]:list-disc">
            <section aria-labelledby="start">
              <Heading level={2} id="start">
                Getting started
              </Heading>
              <ol className="flex flex-col gap-1">
                <li>Lower your device volume, especially with headphones.</li>
                <li>Open the rack and choose Add Synth, then a synth type.</li>
                <li>
                  The first sound of a visit asks for confirmation. Choose Start Audio. The rack makes no sound until
                  then.
                </li>
                <li>Load a MIDI file from the File menu, or play live from the computer keyboard or a MIDI device.</li>
              </ol>
            </section>

            <section aria-labelledby="widgets">
              <Heading level={2} id="widgets">
                Synth widgets
              </Heading>
              <p>Each synth in the rack is a widget. Add as many as you need; they play together.</p>
              <SynthTypeTable cellClass={cell} />
              <p>In the widget header:</p>
              <ul className="flex flex-col gap-1">
                <li>The name collapses or expands the widget.</li>
                <li>Live sends live notes (keyboard or MIDI device) to the widget.</li>
                <li>M mutes the widget. S solos it: while any widget is soloed, only soloed widgets sound.</li>
                <li>Lock freezes the widget’s sound and routing settings. Live, M and S still work.</li>
                <li>✕ removes the widget. The message that follows offers Undo.</li>
              </ul>
              <p>
                The controls below the header shape the sound. A slider’s value can also be typed: select the number
                beside it, type a value and press Enter. The footer sets which part of the MIDI file the widget plays, its volume, and its
                tuning in octaves and cents.
              </p>
              <p>
                Granular widgets can use your own audio file: choose File as the source, then Load File…. The file
                stays on your device.
              </p>
            </section>

            <section aria-labelledby="midi">
              <Heading level={2} id="midi">
                Playing a MIDI file
              </Heading>
              <ol className="flex flex-col gap-1">
                <li>Choose File, then Load MIDI File…, and pick a .mid, .midi or .rmi file.</li>
                <li>
                  In each widget, choose a part. A part is one instrument of the file; All parts plays the whole file
                  on that widget.
                </li>
                <li>Choose Play. The position shows elapsed and total time. Stop returns to the start.</li>
              </ol>
              <p>The ✕ after the file name unloads it. The message that follows offers Undo.</p>
            </section>

            <section aria-labelledby="live">
              <Heading level={2} id="live">
                Playing live
              </Heading>
              <p>
                Live notes play on every widget whose Live toggle is on. A new widget has it on when no other widget
                does.
              </p>
              <p>
                <strong className="font-semibold">Computer keyboard.</strong> Turn on Play with Keyboard (not shown on
                touch-only devices). The keys follow the layout of a piano keyboard, by key position, on any keyboard
                layout. The − and + buttons beside it also change the octave. Keys never play notes while you type in a
                field.
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th scope="col" className={`${cell} font-semibold`}>Key</th>
                    <th scope="col" className={`${cell} font-semibold`}>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {KEYS.map(([key, note]) => (
                    <tr key={key}>
                      <th scope="row" className={`${cell} font-normal`}>
                        <kbd className={kbd}>{key}</kbd>
                      </th>
                      <td className={cell}>{note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>
                <strong className="font-semibold">MIDI device.</strong> Connect the device, then choose Connect MIDI
                Device and allow access when the browser asks. The button is absent in browsers without Web MIDI.
              </p>
            </section>

            <section aria-labelledby="recording">
              <Heading level={2} id="recording">
                Recording and rendering
              </Heading>
              <ul className="flex flex-col gap-1">
                <li>
                  Record captures everything the rack plays, live notes included, up to 10 minutes. Choose it again to
                  stop; the WAV file downloads.
                </li>
                <li>
                  Render to WAV plays the loaded MIDI file through the rack faster than real time and downloads the
                  result. Songs up to 10 minutes long can be rendered. Cancel stops a render.
                </li>
                <li>The File menu sets the format for both: WAV 16-Bit or WAV 32-Bit Float.</li>
              </ul>
            </section>

            <section aria-labelledby="patches">
              <Heading level={2} id="patches">
                Patches
              </Heading>
              <p>
                Save Patch, in the File menu, downloads the rack as a small text file: each widget’s type, settings,
                part, volume, tuning, mute, solo and lock. Load Patch… replaces the rack with a saved one; the message
                that follows offers Undo.
              </p>
              <p>
                Patches do not store audio files. After loading a patch, load a granular widget’s file again. Live
                toggles and collapsed widgets are not stored either.
              </p>
            </section>

            <section aria-labelledby="volume">
              <Heading level={2} id="volume">
                Volume and stopping sound
              </Heading>
              <ul className="flex flex-col gap-1">
                <li>
                  The master volume starts at −12 dB. The meter beside it shows the output level. Limit lights when
                  the rack is turning down peaks that would otherwise be too loud; lower the volume of the widgets or
                  the master.
                </li>
                <li>
                  Panic stops all sound at once: it stops playback, releases every note and mutes the output. Press{' '}
                  <kbd className={kbd}>Esc</kbd> to panic from anywhere on the page (when a menu or dialog is open,
                  Esc closes it first).
                </li>
                <li>
                  After Panic, the button reads Reset. Click Reset or move the master volume to bring the sound back.
                  Keys do not unmute, so a stray keypress can’t undo a Panic.
                </li>
              </ul>
            </section>

            <section aria-labelledby="messages">
              <Heading level={2} id="messages">
                Messages
              </Heading>
              <p>
                Short messages appear at the bottom of the window and hide after a few seconds; some offer Undo while
                they are visible. These need attention:
              </p>
              <dl className="flex flex-col gap-3 text-sm [&_dd]:text-muted [&_dt]:font-semibold">
                <div>
                  <dt>Audio is paused by the browser</dt>
                  <dd>The browser suspended sound, for example after the tab was in the background. Choose Resume Audio.</dd>
                </div>
                <div>
                  <dt>Level reduced</dt>
                  <dd>
                    The output stayed loud for several seconds, so the rack lowered it by 6 dB. Lower the volume, then
                    choose Restore Level.
                  </dd>
                </div>
                <div>
                  <dt>Reduced safety mode</dt>
                  <dd>
                    The browser can’t run the rack’s output stage, so a simpler one is used and the master volume is
                    capped at −6.5 dB.
                  </dd>
                </div>
                <div>
                  <dt>Audio fault</dt>
                  <dd>
                    An audio error occurred. The rack stopped playback, silenced the output briefly and reset it. Choose
                    Play to continue.
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
