import Image from 'next/image';
import { VisuallyHidden } from '@/design-systems/meta';

/**
 * One mood board artifact: the image at its own aspect ratio, linked to the full-size file,
 * and a caption with the board number and the citation.
 */
export default function ArtifactFigure({ number, image, alt, citation, eager = false }) {
  return (
    <figure className="mb-8 break-inside-avoid">
      <a
        href={image.src}
        className="block rounded-ds focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <Image
          src={image}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          className="block h-auto w-full border border-border"
        />
        <VisuallyHidden> (full size)</VisuallyHidden>
      </a>
      <figcaption className="mt-2 flex gap-3 text-sm">
        <span className="shrink-0 font-mono text-muted tabular-nums">{number}</span>
        <span>{citation}</span>
      </figcaption>
    </figure>
  );
}
