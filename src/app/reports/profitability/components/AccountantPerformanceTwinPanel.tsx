"use client";

import { useMemo, useState } from "react";
import { ContractPerformanceAnalysis } from "@/components/ContractPerformanceAnalysis";
import { AccountantServiceLineMargin } from "@/app/reports/profitability/components/AccountantServiceLineMargin";
import type { ServiceLineMarginRow } from "@/app/reports/profitability/queries";
import type { ProfitabilityAnalysisRow } from "@/lib/contract-performance-analysis";
import type { ContractProfitLeak } from "@/lib/profit-leaks";
import type { ContractRecommendations } from "@/lib/manager-recommendations";

const ALL = "__all__";

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function filterServiceLines(
  rows: ServiceLineMarginRow[],
  customer: string,
  service: string
): ServiceLineMarginRow[] {
  return rows
    .map((row) => {
      if (service !== ALL && row.serviceName !== service) return null;

      const contracts =
        customer === ALL
          ? row.contracts
          : row.contracts.filter((c) => c.customerName === customer);

      if (contracts.length === 0) return null;

      const revenue = roundMoney(
        contracts.reduce((sum, c) => sum + c.revenue, 0)
      );
      const costs = roundMoney(contracts.reduce((sum, c) => sum + c.costs, 0));
      const margin = roundMoney(revenue - costs);
      const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;

      return {
        ...row,
        revenue,
        costs,
        margin,
        marginPct: Math.round(marginPct * 10) / 10,
        contractCount: contracts.length,
        contracts: [...contracts].sort((a, b) => b.marginPct - a.marginPct),
      };
    })
    .filter((row): row is ServiceLineMarginRow => row != null)
    .sort((a, b) => b.marginPct - a.marginPct);
}

/**
 * Accountant twin panel: service-line margin and contract performance side by
 * side, collapsed by default, with customer + service filters.
 */
export function AccountantPerformanceTwinPanel({
  serviceLines,
  report,
  profitLeaks,
  recommendations,
}: {
  serviceLines: ServiceLineMarginRow[];
  report: ProfitabilityAnalysisRow[];
  profitLeaks: ContractProfitLeak[];
  recommendations: ContractRecommendations[];
}) {
  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState(ALL);
  const [service, setService] = useState(ALL);

  const customers = useMemo(() => {
    return Array.from(
      new Set(report.map((r) => r.customerName).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [report]);

  const services = useMemo(() => {
    return Array.from(
      new Set(serviceLines.map((r) => r.serviceName).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [serviceLines]);

  const filteredReport = useMemo(() => {
    let rows = report;
    if (customer !== ALL) {
      rows = rows.filter((r) => r.customerName === customer);
    }
    if (service !== ALL) {
      const contractIds = new Set(
        serviceLines
          .find((s) => s.serviceName === service)
          ?.contracts.map((c) => c.contractId) ?? []
      );
      rows = rows.filter((r) => contractIds.has(r.contractId));
    }
    return rows;
  }, [report, customer, service, serviceLines]);

  const filteredServiceLines = useMemo(
    () => filterServiceLines(serviceLines, customer, service),
    [serviceLines, customer, service]
  );

  const filterSummary = [
    customer === ALL ? "All customers" : customer,
    service === ALL ? "All services" : service,
  ].join(" · ");

  return (
    <section className="mb-10 overflow-hidden rounded-xl border border-green-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-green-100 bg-green-50/90 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex min-w-0 flex-1 items-start gap-3 rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-green-700/30"
          aria-expanded={open}
          aria-controls="performance-twin-panel"
        >
          <span
            className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-green-200 bg-white text-green-800 transition-transform ${
              open ? "rotate-90" : ""
            }`}
            aria-hidden="true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z"
                clipRule="evenodd"
              />
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-green-950">
              Performance analysis
            </span>
            <span className="mt-0.5 block text-xs text-green-800/80">
              {open
                ? "Service-line margin and contract performance side by side."
                : `${filteredServiceLines.length} service line${filteredServiceLines.length === 1 ? "" : "s"} · ${filteredReport.length} contract${filteredReport.length === 1 ? "" : "s"} · ${filterSummary}. Expand to compare.`}
            </span>
          </span>
        </button>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <label className="flex items-center gap-2 text-sm text-green-950">
            <span className="whitespace-nowrap text-xs font-medium text-green-800">
              Customer
            </span>
            <select
              value={customer}
              onChange={(e) => {
                setCustomer(e.target.value);
                setOpen(true);
              }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-[12rem] rounded-md border border-green-200 bg-white px-2 py-1.5 text-sm text-stone-800 shadow-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-700/15"
            >
              <option value={ALL}>All customers</option>
              {customers.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm text-green-950">
            <span className="whitespace-nowrap text-xs font-medium text-green-800">
              Service
            </span>
            <select
              value={service}
              onChange={(e) => {
                setService(e.target.value);
                setOpen(true);
              }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-[12rem] rounded-md border border-green-200 bg-white px-2 py-1.5 text-sm text-stone-800 shadow-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-700/15"
            >
              <option value={ALL}>All services</option>
              {services.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {open ? (
        <div id="performance-twin-panel" className="bg-green-50/30 p-4 sm:p-5">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-5">
            <div className="min-w-0 rounded-xl border border-green-100 bg-white p-3 sm:p-4">
              <AccountantServiceLineMargin
                rows={filteredServiceLines}
                embedded
              />
            </div>
            <div className="min-w-0 rounded-xl border border-green-100 bg-white p-3 sm:p-4">
              <ContractPerformanceAnalysis
                report={filteredReport}
                profitLeaks={profitLeaks}
                recommendations={recommendations}
                embedded
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
