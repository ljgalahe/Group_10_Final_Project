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
      className="absolute right-4 top-4 text-stone-500 hover:text-stone-800"
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

function GlowDot({ color }: { color: "green" | "amber" | "red" }) {
  const fill = {
    green: "bg-green-500 shadow-[0_0_10px_2px_rgba(34,197,94,0.85)]",
    amber: "bg-amber-400 shadow-[0_0_10px_2px_rgba(251,191,36,0.85)]",
    red: "bg-red-500 shadow-[0_0_10px_2px_rgba(239,68,68,0.85)]",
  }[color];

  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${fill}`} />;
}

export function BillableStatusBadge({ status }: { status: BillableStatus }) {
  const meta = {
    billable: { label: "Billable", color: "green" as const },
    pending_approval: { label: "Pending Approval", color: "amber" as const },
    missing_labor: { label: "Missing Labor Entry", color: "red" as const },
  }[status];

  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs text-stone-800">
      <GlowDot color={meta.color} />
      {meta.label}
    </span>
  );
}

export function BillableStatusCard({ current }: { current?: BillableStatus }) {
  const items: Array<{
    key: BillableStatus;
    label: string;
    color: "green" | "amber" | "red";
  }> = [
    { key: "billable", label: "Billable", color: "green" },
    { key: "pending_approval", label: "Pending Approval", color: "amber" },
    { key: "missing_labor", label: "Missing Labor Entry", color: "red" },
  ];

  return (
    <section className="relative max-w-xl rounded-2xl bg-stone-200/70 px-6 py-5">
      <CopyIconButton text="Billable Status: Billable or Pending Approval or Missing Labor Entry" />
      <p className="font-mono text-[15px] font-semibold text-stone-900">
        Billable Status
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2 font-mono text-[15px] text-stone-900">
        {items.map((item, index) => (
          <span key={item.key} className="inline-flex items-center gap-2">
            {index > 0 ? <span className="text-stone-700">or</span> : null}
            <span
              className={`inline-flex items-center gap-2 ${
                current && current !== item.key ? "opacity-40" : ""
              }`}
            >
              <GlowDot color={item.color} />
              {item.label}
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}
