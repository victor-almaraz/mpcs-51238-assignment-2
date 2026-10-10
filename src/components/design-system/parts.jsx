'use client';

/*
 * Layout pieces of the design-system pages. The page chrome is the meta style; each
 * specimen panel carries the showcased style (data-ds plus its font class).
 */

/** Interaction states shown statically through data-force (see globals.css). */
export const INTERACTION = [
  ['Default', undefined],
  ['Hover', 'hover'],
  ['Active', 'active'],
  ['Focus-visible', 'focus'],
];

/** A component's entry: meta heading and note, then its specimen panel. */
export function Entry({ id, title, note, children }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 id={id} className="text-base font-semibold">
          {title}
        </h3>
        {note ? <p className="max-w-prose text-sm text-muted">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** Dark (or otherwise styled) panel that renders specimens in the showcased style. */
export function Panel({ style, fontClassName, className = '', children }) {
  return (
    <div data-ds={style} className={`${fontClassName} flex flex-col gap-6 bg-bg p-2 text-fg sm:p-4 md:p-6 ${className}`}>
      {children}
    </div>
  );
}

/** A row of labelled states. */
export function States({ children }) {
  return <div className="flex flex-wrap items-start gap-x-6 gap-y-4">{children}</div>;
}

/** One labelled state. `wide` lets the specimen take a full row on small screens. */
export function State({ label, wide = false, children }) {
  return (
    <figure className={`flex min-w-0 flex-col gap-2 ${wide ? 'w-full max-w-md' : ''}`}>
      <div className="flex min-h-8 items-center">{children}</div>
      <figcaption className="text-xs text-muted">{label}</figcaption>
    </figure>
  );
}

/** Default / hover / active / focus-visible (and optionally disabled) of one element. */
export function InteractionStates({ render, disabled, extra = [] }) {
  return (
    <States>
      {INTERACTION.map(([label, force]) => (
        <State key={label} label={label}>
          {render({ 'data-force': force })}
        </State>
      ))}
      {disabled ? <State label="Disabled">{render({ disabled: true })}</State> : null}
      {extra.map(([label, props]) => (
        <State key={label} label={label}>
          {render(props)}
        </State>
      ))}
    </States>
  );
}
