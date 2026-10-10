import SynthApp from '@/components/synth/SynthApp';
import { STYLE, ds } from '@/components/synth/style';

export const metadata = {
  title: 'Synth Rack',
};

export default function SynthPage() {
  return (
    <div data-ds={STYLE} className={`${ds.fontClassName} min-h-dvh bg-bg text-fg`}>
      <SynthApp />
    </div>
  );
}
