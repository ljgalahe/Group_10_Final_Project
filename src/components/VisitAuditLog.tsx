"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type VisitActivityEntry = {
  action: string;
  details?: string | null;
  created_at: string;
};

export function VisitAuditLog({
  entries,
}: {
  entries: VisitActivityEntry[];
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
      >
        Activity
      </button>

      {open && mounted
        ? createPortal(
            <div
              className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="visit-activity-title"
              onClick={(e) => {
                if (e.target === e.currentTarget) setOpen(false);
              }}
            >
              <div className="relative z-[201] max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2
                      id="visit-activity-title"
                      className="text-lg font-semibold text-green-950"
                    >
                      Visit Activity
                    </h2>
                    <p className="mt-1 text-sm text-stone-500">
                      History of updates and events on this visit.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="text-stone-400 hover:text-stone-600"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
                <ul className="mt-6 space-y-4">
                  {entries.length === 0 ? (
                    <li className="text-sm text-stone-500">
                      No activity recorded yet.
                    </li>
                  ) : (
                    entries.map((item, index) => (
                      <li
                        key={`${item.created_at}-${item.action}-${index}`}
                        className="border-l-2 border-green-200 pl-4"
                      >
                        <p className="text-sm font-medium text-green-950">
                          {item.action}
                        </p>
                        {item.details ? (
                          <p className="mt-0.5 text-sm text-stone-600">
                            {item.details}
                          </p>
                        ) : null}
                        <p className="mt-1 text-xs text-stone-400">
                          {new Date(item.created_at).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
