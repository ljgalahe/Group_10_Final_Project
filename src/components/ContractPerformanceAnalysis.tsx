"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";
import {
  analyzeContractLeaks,
  contractHealthStatus,
  managerSummarySentence,
  recommendationsForContract,
  sortByMarginPctDesc,
  type ContractHealthStatus,
  type ProfitabilityAnalysisRow,
} from "@/lib/contract-performance-analysis";
import type { ContractProfitLeak, LeakSeverity } from "@/lib/profit-leaks";
import type {
  ContractRecommendations,
  RecommendationIcon,
  RecommendationPriority,
} from "@/lib/manager-recommendations";

export function ContractPerformanceAnalysis({
  report,
  profitLeaks,
  recommendations,
  embedded = false,
}: {
  report: ProfitabilityAnalysisRow[];
  profitLeaks: ContractProfitLeak[];
  recommendations: ContractRecommendations[];
  /** When true, omit page-level section chrome (used inside twin panel). */
  embedded?: boolean;
}) {
  const ranked = useMemo(() => sortByMarginPctDesc(report), [report]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const maxAbsMargin = useMemo(() => {
    const peak = Math.max(...ranked.map((row) => Math.abs(row.marginPct)), 1);
    return Math.max(peak, 40);
  }, [ranked]);

  const selected = ranked.find((row) => row.contractId === selectedId) ?? null;
  const leakById = useMemo(
    () => new Map(profitLeaks.map((row) => [row.contractId, row])),
    [profitLeaks]
  );

  useEffect(() => {
    if (selectedId && !ranked.some((r) => r.contractId === selectedId)) {
      setSelectedId(null);
    }
  }, [ranked, selectedId]);

  if (ranked.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
        No contracts match the current filters.
      </div>
    );
  }

  const selectedLeaks = selected
    ? analyzeContractLeaks(selected, leakById.get(selected.contractId))
    : [];
  const selectedStatus = selected ? contractHealthStatus(selected) : null;
  const selectedRecs = selected
    ? recommendationsForContract(selected.contractId, recommendations)
    : [];

  return (
    <section className={embedded ? "space-y-3" : "mt-2 space-y-4"}>
      <div>
        <h2
          className={
            embedded
              ? "text-base font-semibold text-green-950"
              : "text-lg font-semibold text-green-950"
          }
        >
          Contract Performance Analysis
        </h2>
        {!embedded ? (
          <p className="text-sm text-stone-500">
            Click a contract bar to open status, profit leaks, and recommended
            actions. Sorted highest margin % to lowest.
          </p>
        ) : (
          <p className="text-xs text-stone-500">
            Click a bar to open contract details. Sorted by margin %.
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
          {ranked.map((row) => {
            const isSelected = row.contractId === selectedId;
            const widthPct = Math.min(
              100,
              (Math.abs(row.marginPct) / maxAbsMargin) * 100
            );
            const positive = row.marginPct >= 0;

            return (
              <li key={row.contractId}>
                <button
                  type="button"
                  onClick={() => setSelectedId(row.contractId)}
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
                      {row.title}
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

      {selected && selectedStatus ? (
        <SelectedContractPanel
          row={selected}
          status={selectedStatus}
          summary={managerSummarySentence(
            selected,
            selectedLeaks,
            selectedStatus
          )}
          leaks={selectedLeaks}
          recommendations={selectedRecs}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </section>
  );
}

function SelectedContractPanel({
  row,
  status,
  summary,
  leaks,
  recommendations,
  onClose,
}: {
  row: ProfitabilityAnalysisRow;
  status: ContractHealthStatus;
  summary: string;
  leaks: ReturnType<typeof analyzeContractLeaks>;
  recommendations: ContractRecommendations["recommendations"];
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contract-performance-detail-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Contract performance detail
            </p>
            <h3
              id="contract-performance-detail-title"
              className="mt-1 text-lg font-semibold text-green-950"
            >
              {row.title}
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
        <h4 className="text-sm font-semibold text-green-950">Manager summary</h4>
        <div className="rounded-lg border border-stone-200 bg-stone-50/80 p-4">
          <StatusBadge status={status} />
          <p className="mt-3 text-sm leading-relaxed text-stone-700">{summary}</p>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-green-950">Contract details</h4>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem label="Contract" value={row.title} />
          <DetailItem label="Customer" value={row.customerName || "—"} />
          <DetailItem label="Revenue billed" value={formatCurrency(row.revenue)} />
          <DetailItem label="Direct costs" value={formatCurrency(row.costs)} />
          <DetailItem
            label="Total profit"
            value={formatCurrency(row.margin)}
            emphasize={row.margin >= 0 ? "positive" : "negative"}
          />
          <DetailItem
            label="Margin %"
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
            Profit leak detector
          </h4>
          <p className="text-xs text-stone-500">
            Insights below are estimated from visit costs, cadence, and extra
            work — not confirmed accounting write-offs.
          </p>
        </div>
        {leaks.length === 0 ? (
          <p className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
            No meaningful profit leaks detected from the available data for this
            contract.
          </p>
        ) : (
          <ul className="space-y-3">
            {leaks.map((leak) => (
              <li
                key={`${row.contractId}-${leak.category}`}
                className="rounded-lg border border-stone-200 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-stone-900">
                    {leak.category}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <LeakSeverityBadge level={leak.severity} />
                    <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-600">
                      Estimated insight
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">
                  {leak.explanation}
                </p>
                <p className="mt-2 text-sm font-medium text-stone-800">
                  Est. $ impact:{" "}
                  {leak.dollarImpact === null
                    ? "Not quantified from current data"
                    : formatCurrency(leak.dollarImpact)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-green-950">
              Manager recommendations
            </h4>
            {recommendations.length === 0 ? (
              <p className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                No specific recommendations for this contract right now.
              </p>
            ) : (
              <ul className="grid gap-3 md:grid-cols-2">
                {recommendations.map((rec) => (
                  <li
                    key={rec.id}
                    className={`rounded-lg border p-4 ${prioritySurfaceClass(rec.priority)}`}
                  >
                    <div className="flex gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-green-900 shadow-sm">
                        <RecommendationIconGlyph icon={rec.icon} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-stone-900">
                            {rec.title}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${priorityBadgeClass(rec.priority)}`}
                          >
                            {rec.priority}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-stone-600">
                          {rec.detail}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
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

function StatusBadge({ status }: { status: ContractHealthStatus }) {
  const styles: Record<ContractHealthStatus, string> = {
    "Healthy Contract": "bg-green-100 text-green-800",
    "Needs Attention": "bg-yellow-100 text-yellow-900",
    "High Risk": "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function LeakSeverityBadge({ level }: { level: LeakSeverity }) {
  const styles: Record<LeakSeverity, string> = {
    low: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-900",
    high: "bg-red-100 text-red-800",
  };
  const labels: Record<LeakSeverity, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[level]}`}
    >
      {labels[level]} severity
    </span>
  );
}

function prioritySurfaceClass(priority: RecommendationPriority) {
  if (priority === "high") return "border-red-200 bg-red-50/70";
  if (priority === "medium") return "border-yellow-200 bg-yellow-50/70";
  return "border-green-200 bg-green-50/60";
}

function priorityBadgeClass(priority: RecommendationPriority) {
  if (priority === "high") return "bg-red-100 text-red-800";
  if (priority === "medium") return "bg-yellow-100 text-yellow-900";
  return "bg-green-100 text-green-800";
}

function RecommendationIconGlyph({ icon }: { icon: RecommendationIcon }) {
  const common = "h-4 w-4";

  if (icon === "labor") {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" className={common} aria-hidden>
        <path d="M10 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM4.5 18a5.5 5.5 0 1 1 11 0H4.5Z" />
      </svg>
    );
  }
  if (icon === "visits") {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" className={common} aria-hidden>
        <path d="M6 2a1 1 0 0 0-1 1v1H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1V3a1 1 0 1 0-2 0v1H7V3a1 1 0 0 0-1-1Zm-2 7h12v7H4V9Z" />
      </svg>
    );
  }
  if (icon === "price" || icon === "renewal") {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" className={common} aria-hidden>
        <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm.75 4.5a.75.75 0 0 0-1.5 0V7H8a.75.75 0 0 0 0 1.5h2.5V10H9A1.75 1.75 0 0 0 9 13.5h.25v.75a.75.75 0 0 0 1.5 0V13.5H12a.75.75 0 0 0 0-1.5h-2.5V10H11A1.75 1.75 0 0 0 11 6.5h-.25V6.5Z" />
      </svg>
    );
  }
  if (icon === "materials") {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" className={common} aria-hidden>
        <path d="M3 5.5 10 2l7 3.5v9L10 18l-7-3.5v-9Zm2 1.2v6.5l5 2.5 5-2.5V6.7L10 4.2 5 6.7Z" />
      </svg>
    );
  }
  if (icon === "scope") {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" className={common} aria-hidden>
        <path d="M4 3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H4Zm2 3h8v1.5H6V6Zm0 3.5h8V11H6V9.5Zm0 3.5h5V14H6v-1Z" />
      </svg>
    );
  }
  if (icon === "equipment") {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" className={common} aria-hidden>
        <path d="M11.5 2a1 1 0 0 1 .8.4l1.2 1.6H16a1 1 0 0 1 1 1V7h-1.5l-1.2 7.2A2 2 0 0 1 12.3 16H7.7a2 2 0 0 1-2-1.8L4.5 7H3V5a1 1 0 0 1 1-1h2.5L7.7 2.4A1 1 0 0 1 8.5 2h3ZM8 9.5A2 2 0 1 0 12 9.5 2 2 0 0 0 8 9.5Z" />
      </svg>
    );
  }
  if (icon === "star") {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" className={common} aria-hidden>
        <path d="M10 2.5 12.4 7l5 .7-3.6 3.5.9 4.9L10 13.8 5.3 16.1l.9-4.9L2.6 7.7l5-.7L10 2.5Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={common} aria-hidden>
      <path d="M10 2a6 6 0 0 1 6 6v1.1c0 .5.2 1 .5 1.4l.8 1.1A1.5 1.5 0 0 1 16.1 14H3.9a1.5 1.5 0 0 1-1.2-2.4l.8-1.1c.3-.4.5-.9.5-1.4V8a6 6 0 0 1 6-6Zm-2 14a2 2 0 1 0 4 0H8Z" />
    </svg>
  );
}
