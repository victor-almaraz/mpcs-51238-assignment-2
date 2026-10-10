import MoodBoard from '@/components/mood-board/MoodBoard';
import { label, title, intro, groups } from './artifacts';

export const metadata = {
  title: 'Mood Board 1: Industrial',
};

export default function IndustrialPage() {
  return <MoodBoard label={label} title={title} intro={intro} groups={groups} />;
}
