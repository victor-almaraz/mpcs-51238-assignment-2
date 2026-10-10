'use client';

import { useState } from 'react';
import { cx, focusRing } from '../classes';

/**
 * A value readout that can be typed into. Shows `display` until focused; Enter or blur
 * calls onCommit(text) when the text changed. The caller ignores text it cannot read, so the
 * field shows `display` again. Escape abandons the edit (it is not consumed, so the app's
 * Escape handling still runs). `label` is the accessible name; the caller sets width,
 * padding and text alignment through `className`.
 */
export default function ValueField({ label, display, onCommit, disabled = false, className, ref, ...rest }) {
  const [draft, setDraft] = useState(null);

  function commit() {
    if (draft === null) return;
    const text = draft.trim();
    setDraft(null);
    if (text !== '' && text !== display) onCommit(text);
  }

  return (
    <input
      ref={ref}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      spellCheck={false}
      aria-label={label}
      value={draft ?? display}
      disabled={disabled}
      onFocus={(e) => {
        setDraft(display);
        e.target.select();
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit();
          // Stay in the field with the new value selected, ready for another entry.
          const input = e.currentTarget;
          requestAnimationFrame(() => {
            if (document.activeElement === input) {
              setDraft(input.value);
              input.select();
            }
          });
        } else if (e.key === 'Escape') {
          setDraft(null);
        }
      }}
      className={cx(
        'min-h-6 min-w-0 rounded-ds border border-transparent border-b-border-strong bg-transparent text-sm tabular-nums text-fg',
        'hover:border-border-strong focus:border-fg disabled:cursor-not-allowed disabled:opacity-40',
        focusRing,
        className,
      )}
      {...rest}
    />
  );
}
