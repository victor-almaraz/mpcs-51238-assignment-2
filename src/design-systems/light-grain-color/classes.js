/*
 * Shared class strings for the Light/Grain/Color components (not a component).
 * Class names are written out in full so Tailwind's scanner finds them.
 * Selected (pressed/checked) styling is chosen in JS from the component's
 * props rather than with aria-pressed:/peer-checked: variants, so it can never
 * lose a specificity tie against hover:/active: (both would be 0-2-0).
 *
 * The look: rounded forms, heavy sentence-case labels, and light that blooms:
 * lit (selected) and primary controls glow, panels float on soft shadows.
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

/** Heavy labels: bold, sentence case. */
export const controlType = 'text-sm font-bold';

export const controlBase = `inline-flex items-center justify-center gap-2 rounded-ds border text-center ${controlType} select-none enabled:cursor-pointer motion-safe:transition-[color,background-color,border-color,box-shadow] motion-safe:duration-200 ${focusRing} ${disabledState}`;

/** Chips: pill-shaped, heavy labels a step smaller so a widget header fits on one row. */
export const chipBase = `inline-flex items-center justify-center gap-2 rounded-full border text-center text-[0.8125rem] font-bold select-none enabled:cursor-pointer motion-safe:transition-[color,background-color,border-color,box-shadow] motion-safe:duration-200 ${focusRing} ${disabledState}`;

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

/** Bloom around a lit control. */
export const bloom = 'shadow-[0_0_18px_var(--ds-glow)]';

/** Soft shadow under floating panels (menus, toasts, dialogs). */
export const floatShadow = 'shadow-[0_18px_48px_rgb(0_0_0/0.55)]';

export const buttonVariants = {
  primary:
    'border-accent bg-accent text-accent-fg shadow-[0_0_14px_var(--ds-accent-glow)] enabled:hover:border-accent-hover enabled:hover:bg-accent-hover enabled:hover:shadow-[0_0_26px_var(--ds-accent-glow)] enabled:active:bg-accent',
  secondary:
    'border-border-strong bg-transparent text-fg enabled:hover:border-fg enabled:hover:bg-hover enabled:active:bg-active',
  ghost: 'border-transparent bg-transparent text-fg enabled:hover:bg-hover enabled:active:bg-active',
  /* Panic: the one control that must be found at a glance. Gel-red fill, bloom. */
  danger:
    'border-danger bg-danger text-accent-fg shadow-[0_0_16px_var(--ds-danger-glow)] enabled:hover:border-[color-mix(in_oklch,var(--ds-danger)_80%,white)] enabled:hover:bg-[color-mix(in_oklch,var(--ds-danger)_80%,white)] enabled:hover:shadow-[0_0_28px_var(--ds-danger-glow)] enabled:active:bg-danger enabled:active:shadow-[inset_0_2px_6px_rgb(0_0_0/0.45)]',
};

/** Pressed / checked look: lit, with bloom. */
export const selectedLook = `border-selected bg-selected text-selected-fg ${bloom}`;

/** Unpressed toggle look (button elements only, uses :enabled). */
export const unselectedLook =
  'border-border-strong bg-transparent text-fg enabled:hover:border-fg enabled:hover:bg-hover enabled:active:bg-active';

/** Secondary look for non-button elements (labels) that have no :enabled state. */
export const secondaryLabelLook =
  'border-border-strong bg-transparent text-fg hover:border-fg hover:bg-hover active:bg-active';

/** Field labels beside sliders, selects and segmented controls. */
export const fieldLabel = 'w-24 shrink-0 text-sm text-muted';
