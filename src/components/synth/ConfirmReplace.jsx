'use client';

import { useRef } from 'react';
import { Button, Dialog } from '@/design-systems/meta';

/** "Replace current rack?" before loading a patch over a non-empty rack. Focus starts on Cancel. */
export default function ConfirmReplace({ open, count, onConfirm, onCancel }) {
  const cancelRef = useRef(null);
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title="Replace current rack?"
      initialFocusRef={cancelRef}
      actions={
        <>
          <Button ref={cancelRef} onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Replace rack</Button>
        </>
      }
    >
      <p className="text-sm">
        Loading this patch removes the {count === 1 ? 'synth' : `${count} synths`} in the rack.
      </p>
    </Dialog>
  );
}
