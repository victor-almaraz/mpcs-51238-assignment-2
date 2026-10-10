/*
 * Shared class strings for the Contrast/Form components (not a component).
 * Class names are written out in full so Tailwind's scanner finds them.
 * Selected (pressed/checked) styling is chosen in JS from the component's
 * props rather than with aria-pressed:/peer-checked: variants, so it can never
 * lose a specificity tie against hover:/active: (both would be 0-2-0).
 *
 * The look: square edges, tracked capitals on controls, hairline borders that
 * brighten on hover, and lit (flat limelight-filled) selected states. No soft
 * glows or washes: light and shadow are flat, hard-edged planes.
 */

/** Joins truthy class names; the caller's className is passed last. */
export function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

export const peerFocusRing =
  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus';

export const disabledState = 'disabled:cursor-not-allowed disabled:opacity-40';

/** Tracked capitals, the lettering of the board's signage and title cards. */
export const controlType = 'text-[0.8125rem] font-normal uppercase tracking-[0.12em]';

export const controlBase = `inline-flex items-center justify-center gap-2 rounded-ds border text-center ${controlType} select-none enabled:cursor-pointer motion-safe:transition-[color,background-color,border-color,box-shadow] motion-safe:duration-150 ${focusRing} ${disabledState}`;

/** Chips: the control base with smaller, tighter capitals. */
export const chipBase = `inline-flex items-center justify-center gap-2 rounded-ds border text-center text-xs font-normal uppercase tracking-[0.06em] select-none enabled:cursor-pointer motion-safe:transition-[color,background-color,border-color] motion-safe:duration-150 ${focusRing} ${disabledState}`;

/** sm 24 px, md 32 px, lg 44 px minimum targets. */
export const controlSizes = {
  sm: 'min-h-6 min-w-6 px-2',
  md: 'min-h-8 min-w-8 px-3',
  lg: 'min-h-11 min-w-11 px-4 lg:px-5',
};

export const iconSizes = {
  sm: 'min-h-6 min-w-6',
  md: 'min-h-8 min-w-8',
  lg: 'min-h-11 min-w-11',
};

export const buttonVariants = {
  primary:
    'border-accent bg-accent text-accent-fg enabled:hover:border-accent-hover enabled:hover:bg-accent-hover enabled:active:bg-accent',
  secondary:
    'border-border-strong bg-transparent text-fg enabled:hover:border-fg enabled:hover:bg-hover enabled:active:bg-active',
  ghost: 'border-transparent bg-transparent text-fg enabled:hover:bg-hover enabled:active:bg-active',
  /* Panic: the one control that must be found at a glance. Vermilion fill, bold label. */
  danger:
    'border-danger bg-danger font-bold! text-accent-fg enabled:hover:border-[color-mix(in_oklch,var(--ds-danger)_80%,white)] enabled:hover:bg-[color-mix(in_oklch,var(--ds-danger)_80%,white)] enabled:active:bg-danger enabled:active:shadow-[inset_0_2px_6px_rgb(0_0_0/0.45)]',
};

/** Hard offset shadow cast by floating panels (menus, toasts). */
export const castShadow = 'shadow-[6px_6px_0_rgb(0_0_0/0.7)]';

/** Pressed / checked look: lit. */
export const selectedLook = 'border-selected bg-selected text-selected-fg';

/** Unpressed toggle look (button elements only, uses :enabled). */
export const unselectedLook =
  'border-border-strong bg-transparent text-fg enabled:hover:border-fg enabled:hover:bg-hover enabled:active:bg-active';

/** Secondary look for non-button elements (labels) that have no :enabled state. */
export const secondaryLabelLook =
  'border-border-strong bg-transparent text-fg hover:border-fg hover:bg-hover active:bg-active';

/** Field labels beside sliders, selects and segmented controls. */
export const fieldLabel = 'w-24 shrink-0 text-sm text-muted';
