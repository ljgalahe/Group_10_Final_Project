"use client";

import { useMemo, useState } from "react";
import { AccountantDirectCostsCellButton } from "@/app/reports/profitability/components/AccountantDirectCostsButton";
import type { DirectCostsBreakdown } from "@/app/reports/profitability/queries";
import { formatCurrency } from "@/lib/format";

const ALL = "__all__";

type ContractRow = {
  contractId: string;
  title: string;
  customerName: string;
  monthlyFee: number;
  revenue: number;
  costs: number;
  margin: number;
  marginPct: number;
};

/** Collapsible all-contracts reference table with customer filter. */
export function AllContractsTable({
  rows,
  directCostsBreakdown = null,
  costsLabel = "Direct Costs",
  /** Manager view: cap table height with a vertical scrollbar when expanded. */
  scrollBody = false,
}: {
  rows: ContractRow[];
  directCostsBreakdown?: DirectCostsBreakdown | null;
  costsLabel?: string;
  scrollBody?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState(ALL);

  const customers = useMemo(() => {
    return Array.from(
      new Set(rows.map((r) => r.customerName).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filtered = useMemo(() => {
    if (customer === ALL) return rows;
    return rows.filter((r) => r.customerName === customer);
  }, [rows, customer]);

  const filterLabel =
    customer === ALL ? "All customers" : customer;

  return (
    <section className="mt-10 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-stone-100 bg-stone-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex min-w-0 flex-1 items-start gap-3 rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-green-700/30"
          aria-expanded={open}
          aria-controls="all-contracts-panel"
        >
          <span
            className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-700 transition-transform ${
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
            <span className="block text-base font-semibold text-stone-700">
              All contracts
            </span>
            <span className="mt-0.5 block text-xs text-stone-500">
              {open
                ? "Reference table of billed revenue, direct costs, and margin."
                : `${filtered.length} contract${filtered.length === 1 ? "" : "s"} · ${filterLabel}. Expand to view.`}
            </span>
          </span>
        </button>

        <label className="flex items-center gap-2 text-sm text-stone-800 sm:justify-end">
          <span className="whitespace-nowrap text-xs font-medium text-stone-600">
            Customer
          </span>
          <select
            value={customer}
            onChange={(e) => {
              setCustomer(e.target.value);
              setOpen(true);
            }}
            onClick={(e) => e.stopPropagation()}
            className="max-w-[14rem] rounded-md border border-stone-200 bg-white px-2 py-1.5 text-sm text-stone-800 shadow-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-700/15"
          >
            <option value={ALL}>All customers</option>
            {customers.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {open ? (
        <div
          id="all-contracts-panel"
          className={
            scrollBody
              ? "max-h-80 overflow-y-auto overscroll-contain overflow-x-auto"
              : "overflow-x-auto"
          }
        >
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-stone-500">
              No contracts match this customer filter.
            </p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-white text-left text-stone-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Contract</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Monthly Fee</th>
                  <th className="px-4 py-3 font-medium">Revenue Billed</th>
                  <th className="px-4 py-3 font-medium">{costsLabel}</th>
                  <th className="px-4 py-3 font-medium">Margin</th>
                  <th className="px-4 py-3 font-medium">Margin %</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
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
                      {directCostsBreakdown ? (
                        <AccountantDirectCostsCellButton
                          amount={row.costs}
                          breakdown={directCostsBreakdown}
                          contractId={row.contractId}
                          contractTitle={row.title}
                        />
                      ) : (
                        formatCurrency(row.costs)
                      )}
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
          )}
        </div>
      ) : null}
    </section>
  );
}
