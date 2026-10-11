import Link from 'next/link';
import { Heading } from '@/design-systems/meta';
import DirectionCard from '@/components/hub/DirectionCard';
import { DIRECTIONS } from '@/components/hub/directions';
import { STYLE } from '@/components/synth/style';

export const metadata = {
  title: { absolute: 'Synthesizer Rack · MPCS 51238 Assignment 2' },
};

const linkClass =
  'inline-flex min-h-6 items-center text-sm underline underline-offset-4 rounded-ds hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

/** The test pages are routes under `next dev` only (next.config.mjs). */
const SHOW_TESTS = process.env.NODE_ENV === 'development';

/** The hub: the rack and its guide, then the three style directions, then (in development) the test pages. */
export default function HomePage() {
  const rackStyle = DIRECTIONS.find((d) => d.style === STYLE);
  return (
    <div data-ds="meta" className="min-h-dvh bg-bg text-fg">
      <header className="border-b border-border px-4 py-6 md:px-8 md:py-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2">
          <p className="text-sm text-muted">MPCS 51238 · Assignment 2</p>
          <Heading level={1}>Synthesizer Rack</Heading>
        </div>
      </header>

      <main className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-12">
          <section aria-labelledby="rack" className="flex max-w-prose flex-col gap-4">
            <h2 id="rack" className="sr-only">
              The rack
            </h2>
            <p>
              A synthesizer rack that runs entirely in the browser: subtractive, FM, additive, pluck and granular
              synths, played from a MIDI file, a MIDI device or the computer keyboard.
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link
                href="/synth/"
                className="inline-flex min-h-11 items-center gap-2 rounded-ds border border-accent bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                Open the rack <span aria-hidden="true">→</span>
              </Link>
              {rackStyle ? <span className="text-sm text-muted">In the {rackStyle.title} design system</span> : null}
              <Link href="/guide/" className={linkClass}>
                How to use the rack
              </Link>
            </div>
          </section>

          <section aria-labelledby="directions" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1 border-b border-border pb-2">
              <Heading level={2} id="directions">
                Style directions
              </Heading>
              <p className="max-w-prose text-sm text-muted">
                Three directions, each a mood board of 25–30 artifacts and a design system built from it. Every
                design-system page shows the rack’s components in every state they reach.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {DIRECTIONS.map((d) => (
                <DirectionCard key={d.style} direction={d} inRack={d.style === STYLE} />
              ))}
            </div>
          </section>

          {SHOW_TESTS && (
            <section aria-labelledby="tests" className="flex flex-col gap-3">
              <Heading level={2} id="tests" className="border-b border-border pb-2">
                Test pages
              </Heading>
              <ul className="flex flex-col gap-2">
                <li>
                  <Link href="/dev/safety/" className={linkClass}>
                    Audio safety acceptance tests
                  </Link>{' '}
                  <span className="text-sm text-muted">— offline renders through the output chain at worst-case levels</span>
                </li>
                <li>
                  <Link href="/dev/core/" className={linkClass}>
                    Audio-core functional tests
                  </Link>{' '}
                  <span className="text-sm text-muted">— every synth, envelope, voice cap and the song render</span>
                </li>
              </ul>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
