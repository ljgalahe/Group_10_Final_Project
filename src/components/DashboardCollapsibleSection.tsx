"use client";

import { useState, type ReactNode } from "react";

export function DashboardCollapsibleSection({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-xl border border-stone-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left sm:px-5"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-green-950">{title}</h2>
          {summary ? (
            <p className="mt-0.5 truncate text-sm text-stone-500">{summary}</p>
          ) : null}
        </div>
        <span className="shrink-0 text-xs font-medium text-stone-500">
          {open ? "Collapse" : "Expand"}
        </span>
      </button>
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          open
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        }`}
        aria-hidden={!open}
      >
        <div
          className={`min-h-0 overflow-hidden ${open ? "" : "pointer-events-none"}`}
        >
          {open ? (
            <div className="border-t border-stone-100 px-4 py-4 sm:px-5">
              {children}
            </div>
          ) : (
            <div className="border-t border-transparent px-4 py-0 sm:px-5" />
          )}
        </div>
      </div>
    </section>
  );
}
