"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";
import type { CustomerRiskRow, CustomerRiskTier } from "./customer-risk";

const TIER_STYLE: Record<CustomerRiskTier, { badge: string; row: string }> = {
  Critical: {
    badge: "bg-red-100 text-red-900",
    row: "border-l-4 border-l-red-500 bg-red-50/50",
  },
  High: {
    badge: "bg-orange-100 text-orange-900",
    row: "border-l-4 border-l-orange-400 bg-orange-50/40",
  },
  Watch: {
    badge: "bg-amber-100 text-amber-900",
    row: "border-l-4 border-l-amber-400 bg-amber-50/30",
  },
  Low: {
    badge: "bg-green-100 text-green-900",
    row: "border-l-4 border-l-green-500 bg-green-50/30",
  },
};

type ViewMode = "riskiest" | "all";

type Props = {
  allRows: CustomerRiskRow[];
};

function CompactRiskRow({
  row,
  index,
  stretch = false,
}: {
  row: CustomerRiskRow;
  index: number;
  stretch?: boolean;
}) {
  const style = TIER_STYLE[row.tier];
  return (
    <li
      className={`flex items-center px-3 py-2 ${style.row} ${
        stretch ? "min-h-0 flex-1" : ""
      }`}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-stone-400">
              #{index + 1}
            </span>
            <p className="truncate text-sm font-semibold text-green-950">
              {row.customer}
            </p>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${style.badge}`}
            >
              {row.tier}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-stone-500">
            SP {row.shortPayCount}
            {row.shortPayExposure > 0
              ? ` (${formatCurrency(row.shortPayExposure)})`
              : ""}
            {" · "}Late {row.latePayCount}
            {row.avgDaysLate > 0 ? `/${row.avgDaysLate}d` : ""}
            {" · "}PD {formatCurrency(row.openPastDue)}
          </p>
        </div>
        <p className="shrink-0 text-lg font-bold tabular-nums text-stone-900">
          {row.riskScore}
        </p>
      </div>
    </li>
  );
}

/** Highlights customers with the worst short-pay and late-payment patterns. */
export function RiskiestCustomers({ allRows }: Props) {
  const [mode, setMode] = useState<ViewMode>("riskiest");

  const riskiest = useMemo(
    () => allRows.filter((r) => r.riskScore >= 12).slice(0, 5),
    [allRows]
  );

  const btn =
    "rounded-md border px-2.5 py-1 text-xs font-medium transition";
  const btnIdle = `${btn} border-stone-200 bg-white text-stone-700 hover:bg-stone-50`;
  const btnActive = `${btn} border-green-800 bg-green-800 text-white`;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="mb-2 flex shrink-0 flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-green-950">
            {mode === "all" ? "All Customer Risk Scores" : "Riskiest Customers"}
          </h2>
          <p className="mt-0.5 text-xs text-stone-500">
            {mode === "all"
              ? `${allRows.length} customers · highest risk first · scroll for more`
              : "Top 5 · short-pays, late pays, past-due"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={mode === "riskiest" ? btnActive : btnIdle}
            onClick={() => setMode("riskiest")}
          >
            Top 5
          </button>
          <button
            type="button"
            className={mode === "all" ? btnActive : btnIdle}
            onClick={() => setMode("all")}
          >
            View all scores
          </button>
        </div>
      </div>

      <p className="mb-2 shrink-0 text-[11px] leading-snug text-stone-500">
        Score ≈0–100: short-pay, late (12 mo), past-due, disputes (capped).{" "}
        <span className="text-red-800">Critical ≥70</span>
        {" · "}
        <span className="text-orange-800">High ≥40</span>
        {" · "}
        <span className="text-amber-800">Watch ≥12</span>
        {" · "}
        <span className="text-green-800">Low &lt;12</span>
      </p>

      {mode === "riskiest" ? (
        riskiest.length === 0 ? (
          <div className="flex min-h-0 flex-1 items-center rounded-lg border border-stone-200 bg-stone-50 px-3 py-4 text-sm text-stone-500">
            No elevated risk in the current filter.
          </div>
        ) : (
          <ul className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-stone-200 divide-y divide-stone-100">
            {riskiest.map((row, index) => (
              <CompactRiskRow
                key={row.customer}
                row={row}
                index={index}
                stretch
              />
            ))}
          </ul>
        )
      ) : allRows.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center rounded-lg border border-stone-200 bg-stone-50 px-3 py-4 text-sm text-stone-500">
          No customers available in the current filter.
        </div>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-lg border border-stone-200 divide-y divide-stone-100">
          {allRows.map((row, index) => (
            <CompactRiskRow key={row.customer} row={row} index={index} />
          ))}
        </ul>
      )}
    </div>
  );
}
