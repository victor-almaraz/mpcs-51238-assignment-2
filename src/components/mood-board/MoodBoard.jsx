import Link from 'next/link';
import { Heading } from '@/design-systems/meta';
import ArtifactFigure from './ArtifactFigure';

/** Number of leading artifacts loaded eagerly: the ones above the fold on a wide screen. */
const EAGER = 3;

/**
 * Mood board page in the meta style: hero with the board's label, title and statement, then
 * one section per group with its artifacts in a column layout. Artifacts keep board order in
 * the DOM; the columns fill top to bottom.
 */
export default function MoodBoard({ label, title, intro, groups }) {
  const count = groups.reduce((n, g) => n + g.artifacts.length, 0);
  let index = 0;
  return (
    <div data-ds="meta" className="min-h-dvh bg-bg text-fg">
      <header className="border-b border-border px-4 py-6 md:px-8 md:py-10">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted">{label}</p>
            <Heading level={1}>{title}</Heading>
          </div>
          <Link
            href="/"
            className="text-sm underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Back to Hub
          </Link>
        </div>
      </header>

      <main className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-12">
          <section aria-label="Statement" className="flex max-w-prose flex-col gap-3">
            {intro.map((p) => (
              <p key={p}>{p}</p>
            ))}
            <p className="text-sm text-muted">{count} artifacts</p>
          </section>

          {groups.map((g) => (
            <section key={g.title} aria-labelledby={`group-${slug(g.title)}`} className="flex flex-col gap-4">
              <Heading level={2} id={`group-${slug(g.title)}`} className="border-b border-border pb-2">
                {g.title}
              </Heading>
              <div className="columns-1 gap-8 sm:columns-2 lg:columns-3">
                {g.artifacts.map((a) => (
                  <ArtifactFigure key={a.number} {...a} eager={index++ < EAGER} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}

function slug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}
