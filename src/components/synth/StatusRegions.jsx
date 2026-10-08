'use client';

import { Button, Disclosure } from '@/design-systems/meta';

const ACTION_LABELS = { undo: 'Undo', 'download-again': 'Download again' };

/**
 * One polite and one assertive live region (layout-and-responsive.md). Both stay mounted so
 * screen readers pick up changes; the message key forces a fresh text node per message.
 */
export default function StatusRegions({ polite, assertive, onAction }) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 md:px-8">
      <div aria-live="polite" className="flex min-h-6 flex-wrap items-center gap-2 text-sm">
        {polite && (
          <span key={polite.id} className="flex flex-wrap items-center gap-2">
            <span>{polite.text}</span>
            {polite.action && (
              <Button size="sm" onClick={() => onAction(polite.action)}>
                {ACTION_LABELS[polite.action]}
              </Button>
            )}
            {polite.details && polite.details.length > 0 && (
              <Disclosure summary="Details">
                <ul className="list-disc pl-5">
                  {polite.details.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </Disclosure>
            )}
          </span>
        )}
      </div>
      <div aria-live="assertive" className="min-h-6 text-sm font-semibold">
        {assertive && <span key={assertive.id}>{assertive.text}</span>}
      </div>
    </div>
  );
}
