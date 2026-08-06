"use client";

import type { ManagerInvoiceRow } from "@/lib/invoice-controls";

export function InvoiceReadinessScore({
  row,
  expanded,
  onToggle,
}: {
  row: ManagerInvoiceRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const tone =
    row.readinessScore >= 90
      ? "text-green-800"
      : row.readinessScore >= 70
        ? "text-amber-700"
        : "text-red-700";

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Readiness score
          </p>
          <p className={`mt-1 gs-metric-value text-3xl ${tone}`}>
            {row.readinessScore}
            <span className="ml-2 text-sm font-semibold text-stone-600">
              {row.readinessLabel}
            </span>
          </p>
        </div>
        <span className="text-xs text-green-800 underline">
          {expanded ? "Hide checks" : "View checks"}
        </span>
      </button>
      {expanded ? (
        <ul className="mt-4 space-y-2 border-t border-stone-100 pt-3">
          {row.checks.map((check) => (
            <li
              key={check.id}
              className="flex items-start gap-2 text-sm text-stone-700"
            >
              <span
                className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  check.passed
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {check.passed ? "✓" : "!"}
              </span>
              <span>
                <span className="font-medium">{check.label}</span>
                <span className="block text-xs text-stone-500">
                  {check.detail}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
