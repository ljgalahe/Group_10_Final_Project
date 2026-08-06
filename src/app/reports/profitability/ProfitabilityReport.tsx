"use client";

import { useMemo, useState } from "react";
import { Card, EmptyState, StatCard } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { CrewHourContributionChart } from "./CrewHourContributionChart";
import { SeasonalMarginChart } from "./SeasonalMarginChart";

export type SeasonalMarginPoint = {
  monthKey: string;
  label: string;
  customerName: string;
  revenue: number;
  costs: number;
  laborHours: number;
};
export type ProfitabilityRow = {
  contractId: string;
  title: string;
  customerName: string;
  revenue: number;
  costs: number;
  margin: number;
  marginPct: number;
  monthlyFee: number;
};

const ALL_CUSTOMERS = "__all__";

export function ProfitabilityReport({
  rows,
  seasonal,
}: {
  rows: ProfitabilityRow[];
  seasonal: SeasonalMarginPoint[];
}) {
  const [selectedCustomer, setSelectedCustomer] = useState(ALL_CUSTOMERS);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const customers = useMemo(() => {
    const names = Array.from(
      new Set(rows.map((r) => r.customerName).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
    return names;
  }, [rows]);

  const filteredCustomers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((name) => name.toLowerCase().includes(q));
  }, [customers, query]);

  const filteredRows = useMemo(() => {
    if (selectedCustomer === ALL_CUSTOMERS) return rows;
    return rows.filter((r) => r.customerName === selectedCustomer);
  }, [rows, selectedCustomer]);

  const customerMargins = useMemo(() => {
    const byCustomer = new Map<
      string,
      { customerName: string; revenue: number; costs: number; contracts: number }
    >();

    for (const row of filteredRows) {
      const key = row.customerName || "Unknown";
      const existing = byCustomer.get(key) ?? {
        customerName: key,
        revenue: 0,
        costs: 0,
        contracts: 0,
      };
      existing.revenue += row.revenue;
      existing.costs += row.costs;
      existing.contracts += 1;
      byCustomer.set(key, existing);
    }

    return Array.from(byCustomer.values())
      .map((c) => {
        const margin = c.revenue - c.costs;
        const marginPct = c.revenue > 0 ? (margin / c.revenue) * 100 : 0;
        return { ...c, margin, marginPct };
      })
      .sort((a, b) => b.margin - a.margin);
  }, [filteredRows]);

  const totalRevenue = filteredRows.reduce((s, r) => s + r.revenue, 0);
  const totalCosts = filteredRows.reduce((s, r) => s + r.costs, 0);
  const totalMargin = totalRevenue - totalCosts;
  const avgMarginPct = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

  const monthlyMargins = useMemo(() => {
    const filtered =
      selectedCustomer === ALL_CUSTOMERS
        ? seasonal
        : seasonal.filter((p) => p.customerName === selectedCustomer);

    const byMonth = new Map<
      string,
      {
        monthKey: string;
        label: string;
        revenue: number;
        costs: number;
        laborHours: number;
      }
    >();

    for (const p of filtered) {
      const existing = byMonth.get(p.monthKey) ?? {
        monthKey: p.monthKey,
        label: p.label,
        revenue: 0,
        costs: 0,
        laborHours: 0,
      };
      existing.revenue += p.revenue;
      existing.costs += p.costs;
      existing.laborHours += p.laborHours;
      byMonth.set(p.monthKey, existing);
    }

    // Preserve chronological month order from the series labels
    const monthOrder = Array.from(
      new Map(seasonal.map((p) => [p.monthKey, p.label])).entries()
    );

    return monthOrder.map(([monthKey, label]) => {
      const row = byMonth.get(monthKey) ?? {
        monthKey,
        label,
        revenue: 0,
        costs: 0,
        laborHours: 0,
      };
      const margin = row.revenue - row.costs;
      const marginPct = row.revenue > 0 ? (margin / row.revenue) * 100 : 0;
      return { ...row, margin, marginPct };
    });
  }, [seasonal, selectedCustomer]);

  const displayLabel =
    selectedCustomer === ALL_CUSTOMERS ? "All customers" : selectedCustomer;

  function selectCustomer(name: string) {
    setSelectedCustomer(name);
    setQuery("");
    setOpen(false);
  }

  return (
    <>
      <div className="mb-6 max-w-md">
        <label
          htmlFor="customer-filter"
          className="mb-1.5 block text-sm font-medium text-stone-700"
        >
          Filter by customer
        </label>
        <div className="relative">
          <input
            id="customer-filter"
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls="customer-filter-list"
            aria-autocomplete="list"
            placeholder="Search customers…"
            value={open ? query : displayLabel}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              setQuery("");
              setOpen(true);
            }}
            onBlur={() => {
              // Delay so option click can register
              window.setTimeout(() => setOpen(false), 150);
            }}
            className="w-full appearance-none rounded-lg border border-stone-300 bg-white py-2 pl-3 pr-10 text-sm text-stone-900 shadow-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-700/20"
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label={open ? "Close customer list" : "Open customer list"}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-stone-500"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              if (open) {
                setOpen(false);
                setQuery("");
              } else {
                setQuery("");
                setOpen(true);
                document.getElementById("customer-filter")?.focus();
              }
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          {open ? (
            <ul
              id="customer-filter-list"
              role="listbox"
              className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-stone-200 bg-white py-1 shadow-lg"
            >
              <li role="option">
                <button
                  type="button"
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-stone-50 ${
                    selectedCustomer === ALL_CUSTOMERS
                      ? "bg-green-50 font-medium text-green-900"
                      : "text-stone-800"
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectCustomer(ALL_CUSTOMERS)}
                >
                  All customers
                </button>
              </li>
              {filteredCustomers.length === 0 ? (
                <li className="px-3 py-2 text-sm text-stone-500">
                  No customers match “{query}”
                </li>
              ) : (
                filteredCustomers.map((name) => (
                  <li key={name} role="option">
                    <button
                      type="button"
                      className={`block w-full px-3 py-2 text-left text-sm hover:bg-stone-50 ${
                        selectedCustomer === name
                          ? "bg-green-50 font-medium text-green-900"
                          : "text-stone-800"
                      }`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectCustomer(name)}
                    >
                      {name}
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Gross Revenue" value={formatCurrency(totalRevenue)} />
        <StatCard label="Total Direct Costs" value={formatCurrency(totalCosts)} />
        <StatCard label="Gross Profit" value={formatCurrency(totalMargin)} />
        <StatCard
          label="Gross Margin %"
          value={`${avgMarginPct.toFixed(1)}%`}
        />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <SeasonalMarginChart months={monthlyMargins} />
        <CrewHourContributionChart months={monthlyMargins} />
      </div>

      {customerMargins.length === 0 ? null : (
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-green-950">
            Gross Profit by Customer
          </h2>
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-stone-50 text-left text-stone-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Contracts</th>
                  <th className="px-4 py-3 font-medium">Gross Revenue</th>
                  <th className="px-4 py-3 font-medium">Direct Costs</th>
                  <th className="px-4 py-3 font-medium">Gross Profit</th>
                  <th className="px-4 py-3 font-medium">Gross Margin %</th>
                </tr>
              </thead>
              <tbody>
                {customerMargins.map((row) => (
                  <tr key={row.customerName} className="border-t border-stone-100">
                    <td className="px-4 py-3 font-medium">{row.customerName}</td>
                    <td className="px-4 py-3">{row.contracts}</td>
                    <td className="px-4 py-3">{formatCurrency(row.revenue)}</td>
                    <td className="px-4 py-3">{formatCurrency(row.costs)}</td>
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
      )}

      {filteredRows.length === 0 ? (
        <EmptyState
          message={
            selectedCustomer === ALL_CUSTOMERS
              ? "No active contracts to analyze."
              : `No contracts found for ${selectedCustomer}.`
          }
        />
      ) : (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-green-950">
            By Contract
          </h2>
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-50 text-left text-stone-600">
              <tr>
                <th className="px-4 py-3 font-medium">Contract</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Monthly Fee</th>
                <th className="px-4 py-3 font-medium">Gross Revenue</th>
                <th className="px-4 py-3 font-medium">Direct Costs</th>
                <th className="px-4 py-3 font-medium">Gross Profit</th>
                <th className="px-4 py-3 font-medium">Gross Margin %</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.contractId} className="border-t border-stone-100">
                  <td className="px-4 py-3 font-medium">{row.title}</td>
                  <td className="px-4 py-3">{row.customerName}</td>
                  <td className="px-4 py-3">{formatCurrency(row.monthlyFee)}</td>
                  <td className="px-4 py-3">{formatCurrency(row.revenue)}</td>
                  <td className="px-4 py-3">{formatCurrency(row.costs)}</td>
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
      )}

      <Card className="mt-8">
        <h2 className="text-lg font-semibold text-green-950">
          How to read this report
        </h2>
        <p className="mt-2 text-sm text-stone-600">
          <strong>Gross revenue</strong> is total invoiced billings.{" "}
          <strong>Gross profit</strong> is gross revenue minus direct visit
          costs (labor, materials, equipment).{" "}
          <strong>Gross margin %</strong> is gross profit ÷ gross revenue.{" "}
          <strong>CM per crew hour</strong> is contribution margin (same as
          gross profit here) ÷ labor person-hours. Use the customer filter
          above to focus on one account at a time.
        </p>
      </Card>
    </>
  );
}
