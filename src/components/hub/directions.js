/*
 * The three style directions, each pairing a mood board with its design system. Names,
 * statements and alt text come from the mood boards themselves; the hub adds only the
 * representative artifact and the routes.
 */
import * as industrial from '@/app/mood-boards/industrial/artifacts';
import * as contrastForm from '@/app/mood-boards/contrast-form/artifacts';
import * as lightGrainColor from '@/app/mood-boards/light-grain-color/artifacts';

/** The board's first statement sentence and one artifact (by number) as its picture. */
function direction(number, style, board, artifactNumber) {
  const artifact = board.groups.flatMap((g) => g.artifacts).find((a) => a.number === artifactNumber);
  const lead = board.intro[0].match(/^.*?\.(?=\s|$)/)?.[0] ?? board.intro[0];
  return {
    number,
    style,
    title: board.title,
    lead,
    image: artifact.image,
    alt: artifact.alt,
    moodBoard: `/mood-boards/${style}/`,
    designSystem: `/design-systems/${style}/`,
  };
}

export const DIRECTIONS = [
  direction(1, 'industrial', industrial, '04'),
  direction(2, 'contrast-form', contrastForm, '22'),
  direction(3, 'light-grain-color', lightGrainColor, '23'),
];
