"use client";

import { useState } from "react";
import { EmptyState, StatCard } from "@/components/ui";
import { formatCurrency } from "@/lib/format";

type ProfitabilityRow = {
  contractId: string;
  title: string;
  customerName: string;
  revenue: number;
  costs: number;
  margin: number;
  marginPct: number;
  monthlyFee: number;
};

/** Original manager profitability layout — stats + contract table only. */
export function ManagerProfitabilityView({
  report,
}: {
  report: ProfitabilityRow[];
}) {
  const [tableOpen, setTableOpen] = useState(true);
  const totalRevenue = report.reduce((s, r) => s + r.revenue, 0);
  const totalCosts = report.reduce((s, r) => s + r.costs, 0);
  const totalMargin = totalRevenue - totalCosts;
  const avgMarginPct =
    totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

  return (
    <>
      <div className="mb-8 gs-kpi-grid">
        <StatCard label="Total Revenue" value={formatCurrency(totalRevenue)} />
        <StatCard label="Total Direct Costs" value={formatCurrency(totalCosts)} />
        <StatCard label="Total Margin" value={formatCurrency(totalMargin)} />
        <StatCard
          label="Average Margin %"
          value={`${avgMarginPct.toFixed(1)}%`}
        />
      </div>

      {report.length === 0 ? (
        <EmptyState message="No active contracts to analyze." />
      ) : (
        <section className="rounded-xl border border-stone-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setTableOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left sm:px-5"
            aria-expanded={tableOpen}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-semibold text-green-950">
                  Contract profitability
                </h2>
                <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
                  {report.length} contract{report.length === 1 ? "" : "s"}
                </span>
              </div>
              <p className="mt-0.5 truncate text-sm text-stone-500">
                Revenue, costs, and margin by active contract
              </p>
            </div>
            <span className="shrink-0 text-xs font-medium text-stone-500">
              {tableOpen ? "Collapse" : "Expand"}
            </span>
          </button>

          <div
            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
              tableOpen
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0"
            }`}
            aria-hidden={!tableOpen}
          >
            <div
              className={`min-h-0 overflow-hidden ${tableOpen ? "" : "pointer-events-none"}`}
            >
              <div className="max-h-80 overflow-y-auto overscroll-contain border-t border-stone-100 pr-1">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-stone-50 text-left text-stone-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Contract</th>
                      <th className="px-4 py-3 font-medium">Customer</th>
                      <th className="px-4 py-3 font-medium">Monthly Fee</th>
                      <th className="px-4 py-3 font-medium">Revenue Billed</th>
                      <th className="px-4 py-3 font-medium">Direct Costs</th>
                      <th className="px-4 py-3 font-medium">Margin</th>
                      <th className="px-4 py-3 font-medium">Margin %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.map((row) => (
                      <tr
                        key={row.contractId}
                        className="border-t border-stone-100"
                      >
                        <td className="px-4 py-3 font-medium">{row.title}</td>
                        <td className="px-4 py-3">{row.customerName}</td>
                        <td className="px-4 py-3">
                          {formatCurrency(row.monthlyFee)}
                        </td>
                        <td className="px-4 py-3">
                          {formatCurrency(row.revenue)}
                        </td>
                        <td className="px-4 py-3">
                          {formatCurrency(row.costs)}
                        </td>
                        <td
                          className={`px-4 py-3 font-medium ${
                            row.margin >= 0 ? "text-green-800" : "text-red-700"
                          }`}
                        >
                          {formatCurrency(row.margin)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              row.marginPct >= 25
                                ? "bg-green-100 text-green-800"
                                : row.marginPct >= 10
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {row.marginPct.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
