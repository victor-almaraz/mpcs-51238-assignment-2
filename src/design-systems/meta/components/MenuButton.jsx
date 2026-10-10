'use client';

import { useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import { cx } from '../classes';
import Button from './Button';

/**
 * APG menu button. Enter/Space/click and ArrowDown open on the first item,
 * ArrowUp on the last; Up/Down/Home/End move; Escape closes, returns focus to
 * the button and calls preventDefault (so the app skips Panic); Tab, focus or a
 * pointer outside closes. Choosing an item calls onSelect(value) then closes
 * without moving focus (the app focuses the new widget).
 * Items: `{ value, label, description?, disabled?, disabledReason? }`, plus
 * `{ type: 'radio', checked }` for menuitemradio and `{ type: 'separator' }`.
 * Separators are skipped by the arrow keys.
 * align="flow": full-width list in normal flow on mobile, anchored dropdown at md+.
 * align="end": anchored dropdown at every size, right edge under the button.
 * `className` goes on the wrapper, other props and `ref` on the button. `defaultOpen` renders
 * the menu open initially, and an item's `force` sets its data-force (design-system pages).
 */
const MENU_PLACEMENT = {
  flow: 'mt-2 w-full md:absolute md:top-full md:left-0 md:z-20 md:w-72',
  end: 'absolute top-full right-0 z-20 mt-2 w-72',
};

export default function MenuButton({
  label,
  items,
  onSelect,
  variant = 'primary',
  size = 'lg',
  align = 'flow',
  defaultOpen = false,
  buttonClassName,
  menuClassName,
  className,
  onClick,
  onKeyDown,
  ref,
  ...rest
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [focusIndex, setFocusIndex] = useState(-1);
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);
  const itemRefs = useRef([]);
  const menuId = useId();
  const buttonId = useId();

  useImperativeHandle(ref, () => buttonRef.current, []);

  // Move focus to the active item once the menu is rendered visible.
  useEffect(() => {
    if (open && focusIndex >= 0) itemRefs.current[focusIndex]?.focus();
  }, [open, focusIndex]);

  // Close on pointer or focus outside the wrapper.
  useEffect(() => {
    if (!open) return undefined;
    function handleOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', handleOutside);
    document.addEventListener('focusin', handleOutside);
    return () => {
      document.removeEventListener('pointerdown', handleOutside);
      document.removeEventListener('focusin', handleOutside);
    };
  }, [open]);

  // Focus indices count menu items only, not separators.
  const count = items.filter((item) => item.type !== 'separator').length;
  itemRefs.current.length = count;
  let itemIndex = 0;

  function openAt(index) {
    if (count === 0) return;
    setOpen(true);
    setFocusIndex(index);
  }

  function closeToButton() {
    setOpen(false);
    setFocusIndex(-1);
    buttonRef.current?.focus();
  }

  function handleButtonClick(e) {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (open) closeToButton();
    else openAt(0);
  }

  function handleButtonKeyDown(e) {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      openAt(0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      openAt(count - 1);
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      closeToButton();
    }
  }

  function handleMenuKeyDown(e) {
    const current = itemRefs.current.indexOf(document.activeElement);
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusIndex((current + 1 + count) % count);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusIndex((current - 1 + count) % count);
        break;
      case 'Home':
        e.preventDefault();
        setFocusIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusIndex(count - 1);
        break;
      case 'Escape':
        e.preventDefault();
        closeToButton();
        break;
      case 'Tab':
        // Park focus on the button so the browser's Tab/Shift+Tab continues
        // from there once the menu is hidden.
        buttonRef.current?.focus();
        setOpen(false);
        setFocusIndex(-1);
        break;
      default:
        break;
    }
  }

  function choose(item) {
    if (item.disabled) return;
    onSelect(item.value);
    setOpen(false);
    setFocusIndex(-1);
  }

  return (
    <div
      ref={wrapRef}
      data-menu-open={open ? '' : undefined}
      className={cx('relative', className)}
    >
      <Button
        ref={buttonRef}
        id={buttonId}
        variant={variant}
        size={size}
        aria-haspopup="menu"
        aria-expanded={open ? 'true' : 'false'}
        aria-controls={menuId}
        onClick={handleButtonClick}
        onKeyDown={handleButtonKeyDown}
        className={buttonClassName}
        {...rest}
      >
        {label}
        <span aria-hidden="true">▾</span>
      </Button>
      <ul
        id={menuId}
        role="menu"
        aria-labelledby={buttonId}
        hidden={!open}
        onKeyDown={handleMenuKeyDown}
        className={cx(
          'rounded-ds border border-border-strong bg-surface py-1 text-sm text-fg',
          MENU_PLACEMENT[align],
          menuClassName,
        )}
      >
        {items.map((item) => {
          if (item.type === 'separator') {
            return <li key={String(item.value)} role="separator" className="my-1 border-t border-border" />;
          }
          const i = itemIndex++;
          const radio = item.type === 'radio';
          return (
            <li key={String(item.value)} role="none">
              <button
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                role={radio ? 'menuitemradio' : 'menuitem'}
                aria-checked={radio ? (item.checked ? 'true' : 'false') : undefined}
                tabIndex={-1}
                aria-disabled={item.disabled ? 'true' : undefined}
                data-force={item.force}
                onClick={() => choose(item)}
                className={cx(
                  'flex min-h-11 w-full flex-col items-start justify-center px-3 py-2 text-left',
                  'focus:bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus',
                  item.disabled ? 'cursor-not-allowed text-muted' : 'cursor-pointer hover:bg-hover active:bg-active',
                )}
              >
                <span>
                  {radio ? <span aria-hidden="true">{item.checked ? '● ' : '○ '}</span> : null}
                  <span className="font-semibold">{item.label}</span>
                  {item.description ? ` — ${item.description}` : null}
                </span>
                {item.disabled && item.disabledReason ? (
                  <span className="text-muted">Unavailable: {item.disabledReason}</span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
