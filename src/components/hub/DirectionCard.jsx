import Image from 'next/image';
import Link from 'next/link';

const linkClass =
  'inline-flex min-h-6 items-center text-sm underline underline-offset-4 rounded-ds hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

/**
 * One style direction: its picture, a strip of its own colours (the style's tokens, scoped by
 * data-ds), the first line of its brief, and links to its mood board and design system.
 */
export default function DirectionCard({ direction, inRack }) {
  const { number, style, title, lead, image, alt, moodBoard, designSystem } = direction;
  const headingId = `direction-${style}`;
  return (
    <article aria-labelledby={headingId} className="flex flex-col overflow-hidden rounded-ds border border-border-strong bg-surface">
      <Image src={image} alt={alt} sizes="(min-width: 1024px) 33vw, 100vw" className="aspect-[16/10] h-auto w-full object-cover" />
      <div data-ds={style} aria-hidden="true" className="flex h-3">
        <span className="flex-1 bg-bg" />
        <span className="flex-1 bg-surface-2" />
        <span className="flex-1 bg-fg" />
        <span className="flex-1 bg-accent" />
        <span className="flex-1 bg-focus" />
        <span className="flex-1 bg-level-low" />
        <span className="flex-1 bg-level-high" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 id={headingId} className="text-base font-semibold">
            <span className="text-muted tabular-nums">{String(number).padStart(2, '0')}</span> {title}
          </h3>
          {inRack ? <span className="text-sm text-muted">Used by the rack</span> : null}
        </div>
        <p className="text-sm">{lead}</p>
        <ul className="mt-auto flex flex-wrap gap-x-6 gap-y-2">
          <li>
            <Link href={moodBoard} className={linkClass}>
              Mood board<span className="sr-only">: {title}</span>
            </Link>
          </li>
          <li>
            <Link href={designSystem} className={linkClass}>
              Design system<span className="sr-only">: {title}</span>
            </Link>
          </li>
        </ul>
      </div>
    </article>
  );
}
