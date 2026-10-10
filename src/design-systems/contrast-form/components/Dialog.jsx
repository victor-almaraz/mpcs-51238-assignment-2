'use client';

import { useEffect, useId, useImperativeHandle, useRef } from 'react';
import { cx } from '../classes';
import Heading from './Heading';

/**
 * Modal native <dialog>. `open` drives showModal()/close(). Esc (cancel) is
 * intercepted and reported through onClose so the parent owns the state; if the
 * browser closes the dialog anyway, onClose is still called.
 * `ref` exposes the <dialog> element.
 */
export default function Dialog({
  open,
  onClose,
  title,
  children,
  actions,
  initialFocusRef,
  className,
  ref,
  ...rest
}) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const openRef = useRef(open);
  const onCloseRef = useRef(onClose);

  useImperativeHandle(ref, () => dialogRef.current, []);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    openRef.current = open;
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      initialFocusRef?.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, initialFocusRef]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    function handleCancel(e) {
      e.preventDefault();
      onCloseRef.current?.();
    }
    function handleClose() {
      if (openRef.current) onCloseRef.current?.();
    }
    dialog.addEventListener('cancel', handleCancel);
    dialog.addEventListener('close', handleClose);
    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('close', handleClose);
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className={cx(
        'm-auto w-[min(28rem,calc(100%_-_2rem))] max-w-none rounded-ds border border-border-strong bg-surface p-5 text-sm text-fg [--cf-notch:var(--ds-surface)]',
        'shadow-[4px_4px_0_var(--ds-border),8px_8px_0_var(--ds-hover)] backdrop:bg-[rgb(0_0_0/0.75)]',
        className,
      )}
      {...rest}
    >
      <div className="flex flex-col gap-4">
        <Heading level={2} id={titleId}>
          {title}
        </Heading>
        <div className="flex flex-col gap-2">{children}</div>
        {actions ? <div className="flex flex-wrap justify-end gap-2">{actions}</div> : null}
      </div>
    </dialog>
  );
}
