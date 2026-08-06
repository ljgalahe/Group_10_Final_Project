"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, StatCard } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import type { AccountantDashboardData } from "@/app/dashboard/accountant-dashboard-data";
import { AccountantCompanyPerformanceSection } from "@/app/dashboard/components/AccountantCompanyPerformance";

/** UTC calendar day — keeps accountant dashboard SSR/client date labels identical. */
function formatDashboardDate(dateStr: string) {
  const [year, month, day] = dateStr.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return dateStr;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

const AGING_TILES = [
  { key: "current" as const, label: "Current", accent: "border-green-200 bg-green-50/60", amountClass: "text-green-900" },
  { key: "1-30" as const, label: "1–30 Days", accent: "border-amber-200 bg-amber-50/60", amountClass: "text-amber-900" },
  { key: "31-60" as const, label: "31–60 Days", accent: "border-orange-200 bg-orange-50/60", amountClass: "text-orange-900" },
  { key: "61-90" as const, label: "61–90 Days", accent: "border-orange-300 bg-orange-50/80", amountClass: "text-orange-950" },
  { key: "90+" as const, label: "90+ Days", accent: "border-red-200 bg-red-50/70", amountClass: "text-red-900" },
];

export function AccountantDashboardPanel({
  data,
}: {
  data: AccountantDashboardData;
}) {
  // Defer rich markup until after hydrate so Cursor/browser DOM attrs
  // (e.g. data-cursor-ref) cannot mismatch SSR HTML.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="mt-8 space-y-6"
        aria-busy="true"
        suppressHydrationWarning
      >
        <div className="h-28 animate-pulse rounded-xl bg-stone-100" />
        <div className="h-72 animate-pulse rounded-xl bg-stone-100" />
        <div className="h-48 animate-pulse rounded-xl bg-stone-100" />
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6" suppressHydrationWarning>
      <div className="gs-kpi-grid">
        <StatCard
          label="Past Due AR"
          value={formatCurrency(data.pastDueTotal)}
          hint={`As of ${formatDashboardDate(data.asOf)}`}
        />
        <StatCard
          label="Collected This Month"
          value={formatCurrency(data.collectedThisMonth)}
          hint={
            data.collectionRate != null
              ? `${data.collectionRate.toFixed(1)}% collection rate`
              : "Month-to-date receipts"
          }
        />
        <StatCard
          label="Ready to Post"
          value={data.readyToPostCount}
          hint="Invoices and payments awaiting journals"
        />
        <StatCard
          label="Avg Days to Pay"
          value={
            data.averageDaysToPay != null
              ? `${data.averageDaysToPay} days`
              : "—"
          }
          hint="From issued invoice to payment"
        />
      </div>

      <AccountantCompanyPerformanceSection data={data.companyPerformance} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-green-950">
                AR Aging Snapshot
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Open receivables by bucket — as of{" "}
                {formatDashboardDate(data.asOf)}.
              </p>
            </div>
            <Link
              href="/reports/ar-aging"
              className="shrink-0 text-sm font-medium text-green-800 hover:underline"
            >
              Full report →
            </Link>
          </div>
          <div className="mt-4 gs-kpi-grid !gap-3 [grid-template-columns:repeat(auto-fit,minmax(9.5rem,1fr))]">
            {AGING_TILES.map((tile) => (
              <div
                key={tile.key}
                className={`min-w-0 overflow-hidden rounded-xl border p-3 ${tile.accent}`}
              >
                <p
                  className="truncate text-xs font-medium text-stone-600"
                  suppressHydrationWarning
                >
                  {tile.label}
                </p>
                <p
                  className={`gs-metric-value gs-kpi-value mt-1 font-semibold ${tile.amountClass}`}
                  title={formatCurrency(data.agingBuckets[tile.key])}
                  suppressHydrationWarning
                >
                  {formatCurrency(data.agingBuckets[tile.key])}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold text-green-950">
              Invoices Needing Attention
            </h2>
            <Link
              href="/invoices"
              className="shrink-0 text-sm font-medium text-green-800 hover:underline"
            >
              All Invoices →
            </Link>
          </div>
          {data.invoiceQueue.length === 0 ? (
            <p className="mt-4 text-sm text-stone-500">
              No invoices need attention right now.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-stone-100 border-t border-stone-100">
              {data.invoiceQueue.map((item) => (
                <li key={item.id} suppressHydrationWarning>
                  <Link
                    href={item.href}
                    className="group flex items-center gap-3 py-3 transition hover:bg-stone-50"
                  >
                    <span
                      className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                        item.urgent ? "bg-red-500" : "bg-stone-300"
                      }`}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-medium ${
                          item.urgent ? "text-red-900" : "text-green-950"
                        }`}
                      >
                        {item.invoiceNumber} · {item.customerName}
                      </p>
                      <p className="mt-0.5 text-sm text-stone-500">
                        {item.statusLabel}
                        {item.balance > 0
                          ? ` · ${formatCurrency(item.balance)} due ${formatDashboardDate(item.dueDate)}`
                          : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium text-green-800 group-hover:underline">
                      Open
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
