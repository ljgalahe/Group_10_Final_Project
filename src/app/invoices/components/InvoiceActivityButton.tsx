"use client";

import { useState } from "react";

export function InvoiceActivityButton({
  activities,
}: {
  activities: {
    id: string;
    action: string;
    details: string | null;
    created_at: string;
  }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
      >
        Activity
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="relative z-[201] max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-green-950">Invoice Activity</h2>
                <p className="mt-1 text-sm text-stone-500">
                  History of updates and events on this invoice.
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
              {activities.length === 0 ? (
                <li className="text-sm text-stone-500">No activity recorded yet.</li>
              ) : (
                activities.map((item) => (
                  <li key={item.id} className="border-l-2 border-green-200 pl-4">
                    <p className="text-sm font-medium text-green-950">{item.action}</p>
                    {item.details ? (
                      <p className="mt-0.5 text-sm text-stone-600">{item.details}</p>
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
        </div>
      )}
    </>
  );
}

export function DuplicatePaymentAlert({ message }: { message: string }) {
  return (
    <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
      <p className="font-semibold text-red-800">Potential Duplicate Payment</p>
      <p className="mt-1 text-sm text-red-700">{message}</p>
    </div>
  );
}
