"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Centered overlay portaled to document.body so it stays above page stacking
 * contexts (cards, sticky headers, overflow containers).
 */
export function CenteredModal({
  open,
  onClose,
  children,
  labelledBy,
  backdropClassName = "bg-black/40",
  closeOnBackdrop = true,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
  /** Backdrop color/opacity classes (defaults to bg-black/40). */
  backdropClassName?: string;
  closeOnBackdrop?: boolean;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center p-4 ${backdropClassName}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onClick={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative z-[201] max-h-[90vh]">{children}</div>
    </div>,
    document.body
  );
}
