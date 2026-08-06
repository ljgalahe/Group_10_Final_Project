import Link from "next/link";
import { Card, StatCard } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import type { AccountantDashboardData } from "@/app/dashboard/accountant-dashboard-data";

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
  return (
    <div className="mt-8 space-y-6">
      <div className="gs-kpi-grid">
        <StatCard
          label="Past Due AR"
          value={formatCurrency(data.pastDueTotal)}
          hint={`As of ${formatDate(data.asOf)}`}
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

      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-green-950">
              AR Aging Snapshot
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Open receivables by bucket — as of {formatDate(data.asOf)}.
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
              <p className="truncate text-xs font-medium text-stone-600">
                {tile.label}
              </p>
              <p
                className={`gs-metric-value gs-kpi-value mt-1 font-semibold ${tile.amountClass}`}
                title={formatCurrency(data.agingBuckets[tile.key])}
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
                <li key={item.id}>
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
                          ? ` · ${formatCurrency(item.balance)} due ${formatDate(item.dueDate)}`
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

      <div className="border-y border-green-800/10 bg-white py-3">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-2 px-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Quick Actions
          </p>
          <nav
            aria-label="Quick Actions"
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
          >
            <Link
              href="/invoices"
              className="rounded-md bg-green-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700"
            >
              Invoices
            </Link>
            <Link
              href="/reports/journal-entries"
              className="rounded-md border border-green-800/40 bg-white px-2.5 py-1 text-xs font-medium text-green-900 hover:border-green-800 hover:bg-green-50"
            >
              Journal Entries
              {data.readyToPostCount > 0 ? (
                <span className="ml-1 rounded-full bg-amber-100 px-1 py-0.5 text-[10px] font-semibold text-amber-900">
                  {data.readyToPostCount}
                </span>
              ) : null}
            </Link>
            <Link
              href="/equipment"
              className="rounded-md border border-green-800/40 bg-white px-2.5 py-1 text-xs font-medium text-green-900 hover:border-green-800 hover:bg-green-50"
            >
              Equipment
            </Link>
            <Link
              href="/reports/profitability"
              className="rounded-md border border-green-800/40 bg-white px-2.5 py-1 text-xs font-medium text-green-900 hover:border-green-800 hover:bg-green-50"
            >
              Profitability
            </Link>
            <Link
              href="/reports/ar-aging"
              className="rounded-md border border-green-800/40 bg-white px-2.5 py-1 text-xs font-medium text-green-900 hover:border-green-800 hover:bg-green-50"
            >
              AR Aging
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
}
