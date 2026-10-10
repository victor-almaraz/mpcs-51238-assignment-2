'use client';

import Link from 'next/link';
import { Heading } from '@/design-systems/meta';
import Controls from './Controls';
import Feedback from './Feedback';
import Foundations from './Foundations';
import Structure from './Structure';

const GROUPS = [
  { id: 'foundations', title: 'Foundations', Body: Foundations },
  { id: 'controls', title: 'Controls', Body: Controls },
  { id: 'feedback', title: 'Feedback', Body: Feedback },
  { id: 'structure', title: 'Structure', Body: Structure },
];

const linkClass =
  'underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

/**
 * Design-system page: every component the synth rack uses, in every state the app reaches
 * (controls-and-accessibility.md "Component inventory and states"). The chrome is the meta
 * style; specimens render with `ds` (the style's public exports) inside panels that set
 * data-ds={style}. Hover, active and focus states are shown through data-force.
 */
export default function Showcase({ ds, style, about }) {
  return (
    <div data-ds="meta" className="min-h-dvh bg-bg text-fg">
      <header className="border-b border-border px-4 py-6 md:px-8 md:py-10">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted">{about.label}</p>
            <Heading level={1}>{about.title}</Heading>
          </div>
          <nav aria-label="Related pages" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link href={about.moodBoard.href} className={linkClass}>
              {about.moodBoard.label}
            </Link>
            <Link href="/" className={linkClass}>
              Back to Hub
            </Link>
          </nav>
        </div>
      </header>

      <main className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-12">
          <section aria-label="Principles" className="flex max-w-prose flex-col gap-4">
            <dl className="flex flex-col gap-3">
              {about.principles.map(([term, text]) => (
                <div key={term}>
                  <dt className="font-semibold">{term}</dt>
                  <dd>{text}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-col gap-1 text-sm text-muted">
              {about.fonts.map(([name, author, licence]) => (
                <p key={name}>
                  {name}: {author}. {licence}.
                </p>
              ))}
            </div>
            <nav aria-label="Contents">
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {GROUPS.map((g) => (
                  <li key={g.id}>
                    <a href={`#${g.id}`} className={linkClass}>
                      {g.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </section>

          {GROUPS.map(({ id, title, Body }) => (
            <section key={id} aria-labelledby={id} className="flex flex-col gap-8">
              <Heading level={2} id={id} className="border-b border-border pb-2">
                {title}
              </Heading>
              <Body ds={ds} style={style} />
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
