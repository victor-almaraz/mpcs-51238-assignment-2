/*
 * Shared class strings for the meta components (not a component).
 * Class names are written out in full so Tailwind's scanner finds them.
 * Selected (pressed/checked) styling is chosen in JS from the component's
 * props rather than with aria-pressed:/peer-checked: variants, so it can never
 * lose a specificity tie against hover:/active: (both would be 0-2-0).
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

export const controlBase = `inline-flex items-center justify-center gap-2 rounded-ds border text-center text-sm font-normal select-none enabled:cursor-pointer motion-safe:transition-colors ${focusRing} ${disabledState}`;

/** sm 24 px, md 32 px, lg 44 px minimum targets. */
export const controlSizes = {
  sm: 'min-h-6 min-w-6 px-2',
  md: 'min-h-8 min-w-8 px-3',
  lg: 'min-h-11 min-w-11 px-3 lg:px-4',
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
    'border-border-strong bg-surface text-fg enabled:hover:bg-hover enabled:active:bg-active',
  ghost: 'border-transparent bg-transparent text-fg enabled:hover:bg-hover enabled:active:bg-active',
  /* Panic: the one control that must be found at a glance. Solid fill, bold label, heavy border. */
  danger:
    'border-2 border-danger bg-danger font-bold! text-accent-fg enabled:hover:border-accent-hover enabled:hover:bg-accent-hover enabled:active:bg-danger',
};

/** Pressed / checked look. */
export const selectedLook = 'border-selected bg-selected text-selected-fg';

/** Unpressed toggle look (button elements only, uses :enabled). */
export const unselectedLook =
  'border-border-strong bg-surface text-fg enabled:hover:bg-hover enabled:active:bg-active';

/** Secondary look for non-button elements (labels) that have no :enabled state. */
export const secondaryLabelLook =
  'border-border-strong bg-surface text-fg hover:bg-hover active:bg-active';
