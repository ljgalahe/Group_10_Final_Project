"use client";

import { useState } from "react";
import type { BillableStatus } from "@/lib/billing-status";

function CopyIconButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      aria-label={copied ? "Copied" : "Copy"}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        } catch {
          setCopied(false);
        }
      }}
      className="absolute right-3 top-3 rounded-md p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        className="h-4 w-4"
      >
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    </button>
  );
}

function StatusDot({ color }: { color: "green" | "amber" | "red" }) {
  const fill = {
    green: "gs-complete-dot",
    amber: "bg-amber-500",
    red: "bg-rose-600",
  }[color];

  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${fill}`}
      aria-hidden
    />
  );
}

const STATUS_META = {
  billable: { label: "Billable", color: "green" as const },
  pending_approval: { label: "Pending Approval", color: "amber" as const },
  missing_labor: { label: "Missing Labor Entry", color: "red" as const },
};

export function BillableStatusBadge({ status }: { status: BillableStatus }) {
  const meta = STATUS_META[status];

  return (
    <span className="inline-flex items-center gap-2 text-sm text-stone-800">
      <StatusDot color={meta.color} />
      {meta.label}
    </span>
  );
}

export function BillableStatusCard({ current }: { current?: BillableStatus }) {
  const items = (
    Object.entries(STATUS_META) as Array<
      [BillableStatus, (typeof STATUS_META)[BillableStatus]]
    >
  ).map(([key, meta]) => ({ key, ...meta }));

  return (
    <section className="relative max-w-xl rounded-xl border border-stone-200 bg-white px-5 py-4 shadow-sm">
      <CopyIconButton text="Billable Status: Billable or Pending Approval or Missing Labor Entry" />
      <p className="text-sm font-semibold text-green-950">Billable Status</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-stone-700">
        {items.map((item, index) => (
          <span key={item.key} className="inline-flex items-center gap-2">
            {index > 0 ? (
              <span className="text-stone-400">or</span>
            ) : null}
            <span
              className={`inline-flex items-center gap-2 ${
                current && current !== item.key
                  ? "text-stone-400"
                  : "text-stone-800"
              }`}
            >
              <StatusDot color={item.color} />
              {item.label}
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}
