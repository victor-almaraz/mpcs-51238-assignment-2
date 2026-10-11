import { Heading } from '@/design-systems/meta';
import CoreTests from '@/components/dev/CoreTests';

export const metadata = {
  title: 'Audio-core tests',
  robots: { index: false },
};

export default function CorePage() {
  return (
    <main data-ds="meta" className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-4 bg-bg p-4 text-fg md:p-8">
      <Heading level={1}>Audio-core functional tests</Heading>
      <p className="text-sm">
        Offline renders through buildEngine and the real output chain: every synth sounds and stops, pitch, levels,
        envelopes, the newer params, determinism, voice caps, mute and solo, and the song render. Development only.
      </p>
      <CoreTests />
    </main>
  );
}
