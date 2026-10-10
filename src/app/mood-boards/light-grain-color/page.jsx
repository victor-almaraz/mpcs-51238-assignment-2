import MoodBoard from '@/components/mood-board/MoodBoard';
import { label, title, intro, groups } from './artifacts';

export const metadata = {
  title: 'Mood Board 3: Light/Grain/Color',
};

export default function LightGrainColorPage() {
  return <MoodBoard label={label} title={title} intro={intro} groups={groups} />;
}
