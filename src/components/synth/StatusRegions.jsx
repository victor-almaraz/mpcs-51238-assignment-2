'use client';

import { useEffect, useState } from 'react';
import { Button, Disclosure, Toast } from '@/design-systems/meta';

const ACTION_LABELS = { undo: 'Undo', 'download-again': 'Download Again' };

/** How long a toast stays up; the timer pauses while the pointer or focus is on it. */
export const TOAST_MS = 6000;

/**
 * Status messages as toasts (layout-and-responsive.md "Status toasts"): fixed near the
 * bottom of the window, centred, above the mobile transport bar (`--bottom-bar-h`, set by
 * Transport). One assertive and one polite live region stay mounted so screen readers pick
 * up changes. `onDismiss(id)` runs when a toast times out or is dismissed; an action such
 * as Undo is only offered while its toast is visible.
 */
export default function StatusRegions({ polite, assertive, onAction, onDismiss }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--bottom-bar-h,0px)+0.75rem)] z-40 flex flex-col items-center gap-2 px-4 lg:bottom-6">
      <div aria-live="assertive" className="flex w-full max-w-lg flex-col items-stretch font-semibold empty:hidden">
        {assertive && <ToastSlot key={assertive.id} msg={assertive} onAction={onAction} onDismiss={onDismiss} />}
      </div>
      <div aria-live="polite" className="flex w-full max-w-lg flex-col items-stretch empty:hidden">
        {polite && <ToastSlot key={polite.id} msg={polite} onAction={onAction} onDismiss={onDismiss} />}
      </div>
    </div>
  );
}

function ToastSlot({ msg, onAction, onDismiss }) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return undefined;
    const timer = setTimeout(() => onDismiss(msg.id), TOAST_MS);
    return () => clearTimeout(timer);
  }, [paused, msg.id, onDismiss]);

  return (
    <Toast
      onDismiss={() => onDismiss(msg.id)}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
      }}
      action={
        msg.action ? (
          <Button size="md" onClick={() => onAction(msg.action, msg.id)}>
            {ACTION_LABELS[msg.action]}
          </Button>
        ) : null
      }
      details={
        msg.details && msg.details.length > 0 ? (
          <Disclosure summary="Details">
            <ul className="list-disc pl-5">
              {msg.details.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </Disclosure>
        ) : null
      }
    >
      {msg.text}
    </Toast>
  );
}
