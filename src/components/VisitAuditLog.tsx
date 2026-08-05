"use client";

import { useState } from "react";

export function VisitAuditLog({
  entries,
}: {
  entries: Array<{ date: string; event: string }>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <h3 className="text-sm font-semibold text-green-950">Audit Log</h3>
          <p className="text-xs text-stone-500">Small expandable section</p>
        </div>
        <span className="text-xs font-medium text-green-800">
          {open ? "Hide" : "Show"}
        </span>
      </button>
      {open ? (
        <div className="mt-3 rounded-lg bg-stone-100 p-3 font-mono text-xs text-stone-800">
          <p className="mb-2 font-semibold">Activity Log</p>
          <ul className="space-y-1">
            {entries.map((entry) => (
              <li key={`${entry.date}-${entry.event}`}>
                {entry.date}: {entry.event}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
