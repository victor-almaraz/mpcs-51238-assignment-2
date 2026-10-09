import MoodBoard from '@/components/mood-board/MoodBoard';
import { label, title, intro, groups } from './artifacts';

export const metadata = {
  title: 'Mood Board 2: Contrast/Form',
};

export default function ContrastFormPage() {
  return <MoodBoard label={label} title={title} intro={intro} groups={groups} />;
}
