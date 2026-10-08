import SynthApp from '@/components/synth/SynthApp';

export const metadata = {
  title: 'Synth Rack',
};

export default function SynthPage() {
  // The step-1 rack uses the bare meta style; step 4 swaps in the chosen design system.
  return (
    <div data-ds="meta" className="min-h-dvh bg-bg text-fg">
      <SynthApp />
    </div>
  );
}
