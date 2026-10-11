import { Heading } from '@/design-systems/meta';
import SafetyTests from '@/components/dev/SafetyTests';

export const metadata = {
  title: 'Safety tests',
  robots: { index: false },
};

export default function SafetyPage() {
  return (
    <main data-ds="meta" className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-4 bg-bg p-4 text-fg md:p-8">
      <Heading level={1}>Audio safety acceptance tests</Heading>
      <p className="text-sm">
        Offline renders through the real output chain at 44.1 and 48 kHz (doc/audio-safety.md, &ldquo;Acceptance
        criteria&rdquo;). Development only.
      </p>
      <SafetyTests />
    </main>
  );
}
