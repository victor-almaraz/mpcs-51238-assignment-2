import Link from 'next/link';

export const metadata = {
  title: { absolute: 'MPCS 51238 — Assignment 2' },
};

/* Placeholder hub (step 1). The full hub page arrives in step 5. */
export default function HomePage() {
  return (
    <main data-ds="meta" className="min-h-screen bg-bg text-fg">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8 md:px-8">
        <h1 className="text-xl font-semibold">MPCS 51238 — Assignment 2</h1>
        <p className="text-sm">
          A browser synthesizer rack. Mood boards and design systems will be linked here as they are added.
        </p>
        <nav aria-label="Project pages">
          <ul className="flex flex-col gap-2 text-sm">
            <li>
              <Link
                href="/synth/"
                className="inline-flex min-h-6 items-center underline underline-offset-4 rounded-ds hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                Synth rack
              </Link>
            </li>
            <li>
              <Link
                href="/mood-boards/contrast-form/"
                className="inline-flex min-h-6 items-center underline underline-offset-4 rounded-ds hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                Mood board 2: Contrast/Form
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </main>
  );
}
