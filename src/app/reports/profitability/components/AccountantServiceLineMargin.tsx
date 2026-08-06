"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";
import type { ServiceLineMarginRow } from "@/app/reports/profitability/queries";

function healthForMargin(marginPct: number): {
  label: string;
  className: string;
} {
  if (marginPct >= 25) {
    return { label: "Healthy line", className: "bg-green-100 text-green-800" };
  }
  if (marginPct >= 10) {
    return {
      label: "Needs attention",
      className: "bg-yellow-100 text-yellow-900",
    };
  }
  return { label: "Weak margin", className: "bg-red-100 text-red-800" };
}

function summaryForLine(row: ServiceLineMarginRow): string {
  if (row.marginPct >= 25) {
    return `${row.serviceName} is contributing solid gross margin at ${row.marginPct.toFixed(1)}% across ${row.contractCount} contract${row.contractCount === 1 ? "" : "s"}. Protect pricing and keep visit costs in check.`;
  }
  if (row.marginPct >= 10) {
    return `${row.serviceName} margin is soft at ${row.marginPct.toFixed(1)}%. Review labor and materials mix on the ${row.contractCount} contract${row.contractCount === 1 ? "" : "s"} carrying this line.`;
  }
  if (row.marginPct >= 0) {
    return `${row.serviceName} is barely covering direct costs (${row.marginPct.toFixed(1)}% margin). This is a primary margin-leak candidate before renewal.`;
  }
  return `${row.serviceName} is underwater at ${row.marginPct.toFixed(1)}% gross margin. Costs allocated to this line exceed billed revenue share — investigate scope and crew productivity.`;
}

/** Accountant-only: CPA-style gross margin bars by included service line. */
export function AccountantServiceLineMargin({
  rows,
  embedded = false,
}: {
  rows: ServiceLineMarginRow[];
  /** When true, omit page-level section chrome (used inside twin panel). */
  embedded?: boolean;
}) {
  const [selectedName, setSelectedName] = useState<string | null>(null);

  const maxAbsMargin = useMemo(() => {
    const peak = Math.max(...rows.map((row) => Math.abs(row.marginPct)), 1);
    return Math.max(peak, 40);
  }, [rows]);

  const selected = rows.find((row) => row.serviceName === selectedName) ?? null;

  useEffect(() => {
    if (selectedName && !rows.some((r) => r.serviceName === selectedName)) {
      setSelectedName(null);
    }
  }, [rows, selectedName]);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
        No service lines match the current filters.
      </div>
    );
  }

  const status = selected ? healthForMargin(selected.marginPct) : null;

  return (
    <section className={embedded ? "space-y-3" : "mb-10 space-y-4"}>
      <div>
        <h2
          className={
            embedded
              ? "text-base font-semibold text-green-950"
              : "text-lg font-semibold text-green-950"
          }
        >
          Gross margin by service line
        </h2>
        {!embedded ? (
          <p className="text-sm text-stone-500">
            Click a service bar to open a detail popup. Contract totals are
            shared evenly across each contract’s included services. Sorted
            highest margin % to lowest.
          </p>
        ) : (
          <p className="text-xs text-stone-500">
            Click a bar to open line details. Sorted by margin %.
          </p>
        )}
      </div>

      <div
        className={`rounded-xl border border-stone-200 bg-white shadow-sm ${
          embedded ? "p-3 sm:p-4" : "p-4 sm:p-6"
        }`}
      >
        <ul
          className={`space-y-3 ${embedded ? "max-h-[28rem] overflow-y-auto pr-1" : ""}`}
          role="list"
        >
          {rows.map((row) => {
            const isSelected = row.serviceName === selectedName;
            const widthPct = Math.min(
              100,
              (Math.abs(row.marginPct) / maxAbsMargin) * 100
            );
            const positive = row.marginPct >= 0;

            return (
              <li key={row.serviceName}>
                <button
                  type="button"
                  onClick={() => setSelectedName(row.serviceName)}
                  aria-pressed={isSelected}
                  className={`group w-full rounded-lg border px-3 py-2.5 text-left transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 ${
                    isSelected
                      ? "border-green-700 bg-green-50 shadow-sm ring-2 ring-green-700/20"
                      : "border-transparent hover:border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <span
                      className={`truncate text-sm font-medium ${
                        isSelected ? "text-green-950" : "text-stone-800"
                      }`}
                    >
                      {row.serviceName}
                    </span>
                    <span
                      className={`shrink-0 text-sm font-semibold tabular-nums ${
                        positive ? "text-green-900" : "text-red-700"
                      }`}
                    >
                      {row.marginPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ease-out ${
                        isSelected
                          ? positive
                            ? "bg-green-800"
                            : "bg-red-600"
                          : positive
                            ? "bg-green-600 group-hover:bg-green-700"
                            : "bg-red-500 group-hover:bg-red-600"
                      }`}
                      style={{ width: `${Math.max(widthPct, 3)}%` }}
                    />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {selected && status ? (
        <SelectedServicePanel
          row={selected}
          status={status}
          summary={summaryForLine(selected)}
          onClose={() => setSelectedName(null)}
        />
      ) : null}
    </section>
  );
}

function SelectedServicePanel({
  row,
  status,
  summary,
  onClose,
}: {
  row: ServiceLineMarginRow;
  status: { label: string; className: string };
  summary: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="service-line-detail-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Service line detail
            </p>
            <h3
              id="service-line-detail-title"
              className="mt-1 text-lg font-semibold text-green-950"
            >
              {row.serviceName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-stone-400 hover:bg-stone-50 hover:text-stone-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-6 py-5">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-green-950">
              Accountant summary
            </h4>
            <div className="rounded-lg border border-stone-200 bg-stone-50/80 p-4">
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.className}`}
              >
                {status.label}
              </span>
              <p className="mt-3 text-sm leading-relaxed text-stone-700">
                {summary}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-green-950">Line details</h4>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Service" value={row.serviceName} />
              <DetailItem
                label="Contracts with this line"
                value={String(row.contractCount)}
              />
              <DetailItem
                label="Allocated revenue"
                value={formatCurrency(row.revenue)}
              />
              <DetailItem
                label="Allocated direct costs"
                value={formatCurrency(row.costs)}
              />
              <DetailItem
                label="Gross profit"
                value={formatCurrency(row.margin)}
                emphasize={row.margin >= 0 ? "positive" : "negative"}
              />
              <DetailItem
                label="Gross margin %"
                value={`${row.marginPct.toFixed(1)}%`}
                emphasize={
                  row.marginPct >= 25
                    ? "positive"
                    : row.marginPct < 10
                      ? "negative"
                      : "neutral"
                }
              />
            </dl>
          </div>

          <div className="space-y-2">
            <div>
              <h4 className="text-sm font-semibold text-green-950">
                Contracts on this line
              </h4>
              <p className="text-xs text-stone-500">
                Each contract’s revenue and costs are split evenly across its
                included services for this view.
              </p>
            </div>
            <div className="overflow-hidden rounded-xl border border-stone-200">
              <table className="min-w-full text-sm">
                <thead className="bg-stone-50 text-left text-stone-600">
                  <tr>
                    <th className="px-3 py-2 font-medium">Contract</th>
                    <th className="px-3 py-2 font-medium">Customer</th>
                    <th className="px-3 py-2 font-medium">Revenue share</th>
                    <th className="px-3 py-2 font-medium">Cost share</th>
                    <th className="px-3 py-2 font-medium">Margin</th>
                    <th className="px-3 py-2 font-medium">Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {row.contracts.map((c) => (
                    <tr key={c.contractId} className="border-t border-stone-100">
                      <td className="px-3 py-2 font-medium">{c.title}</td>
                      <td className="px-3 py-2">{c.customerName || "—"}</td>
                      <td className="px-3 py-2">{formatCurrency(c.revenue)}</td>
                      <td className="px-3 py-2">{formatCurrency(c.costs)}</td>
                      <td
                        className={`px-3 py-2 font-medium ${
                          c.margin >= 0 ? "text-green-800" : "text-red-700"
                        }`}
                      >
                        {formatCurrency(c.margin)}
                      </td>
                      <td className="px-3 py-2">{c.marginPct.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end border-t border-stone-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: "positive" | "negative" | "neutral";
}) {
  const valueClass =
    emphasize === "positive"
      ? "text-green-800"
      : emphasize === "negative"
        ? "text-red-700"
        : "text-stone-900";

  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50/60 px-3 py-2.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
        {label}
      </dt>
      <dd className={`mt-1 text-sm font-semibold ${valueClass}`}>{value}</dd>
    </div>
  );
}
