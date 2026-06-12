"use client";

import { useEffect, useRef, type ReactNode } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
};

/**
 * Styled native dialog for create and edit flows.
 */
export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="fixed top-1/2 left-1/2 m-0 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-sm border border-neutral-200 bg-white p-0 shadow-lg backdrop:bg-neutral-900/40 open:backdrop:backdrop-blur-[1px]"
    >
      <div className="border-b border-neutral-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
      </div>

      <div className="px-6 py-4">{children}</div>

      {footer ? (
        <div className="flex justify-end gap-2 border-t border-neutral-200 px-6 py-4">
          {footer}
        </div>
      ) : null}
    </dialog>
  );
}
