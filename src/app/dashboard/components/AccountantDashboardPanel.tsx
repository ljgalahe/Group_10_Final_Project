import Link from "next/link";
import { CreateFinancialStatementButton } from "@/app/reports/profitability/components/CreateFinancialStatementButton";
import { Card, StatCard } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import type { AccountantDashboardData } from "@/app/dashboard/accountant-dashboard-data";

const AGING_TILES = [
  { key: "current" as const, label: "Current", accent: "border-green-200 bg-green-50/60", amountClass: "text-green-900" },
  { key: "1-30" as const, label: "1–30 days", accent: "border-amber-200 bg-amber-50/60", amountClass: "text-amber-900" },
  { key: "31-60" as const, label: "31–60 days", accent: "border-orange-200 bg-orange-50/60", amountClass: "text-orange-900" },
  { key: "61-90" as const, label: "61–90 days", accent: "border-orange-300 bg-orange-50/80", amountClass: "text-orange-950" },
  { key: "90+" as const, label: "90+ days", accent: "border-red-200 bg-red-50/70", amountClass: "text-red-900" },
];

export function AccountantDashboardPanel({
  data,
}: {
  data: AccountantDashboardData;
}) {
  return (
    <div className="mt-8 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Past due AR"
          value={formatCurrency(data.pastDueTotal)}
          hint={`As of ${formatDate(data.asOf)}`}
        />
        <StatCard
          label="Collected this month"
          value={formatCurrency(data.collectedThisMonth)}
          hint={
            data.collectionRate != null
              ? `${data.collectionRate.toFixed(1)}% collection rate`
              : "Month-to-date receipts"
          }
        />
        <StatCard
          label="Ready to post"
          value={data.readyToPostCount}
          hint="Invoices and payments awaiting journals"
        />
        <StatCard
          label="Avg days to pay"
          value={
            data.averageDaysToPay != null
              ? `${data.averageDaysToPay} days`
              : "—"
          }
          hint="From issued invoice to payment"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-green-950">
                AR aging snapshot
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Open receivables by bucket — as of {formatDate(data.asOf)}.
              </p>
            </div>
            <Link
              href="/reports/ar-aging"
              className="text-sm font-medium text-green-800 hover:underline"
            >
              Full report →
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {AGING_TILES.map((tile) => (
              <div
                key={tile.key}
                className={`rounded-xl border p-3 ${tile.accent}`}
              >
                <p className="text-xs font-medium text-stone-600">{tile.label}</p>
                <p className={`mt-1 text-lg font-semibold ${tile.amountClass}`}>
                  {formatCurrency(data.agingBuckets[tile.key])}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold text-green-950">
              Invoices needing attention
            </h2>
            <Link
              href="/invoices"
              className="text-sm font-medium text-green-800 hover:underline"
            >
              All invoices →
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
      </div>

      <div className="rounded-xl border border-green-800/15 bg-green-50/60 px-5 py-4">
        <p className="text-sm font-semibold text-green-950">Quick actions</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link
            href="/invoices"
            className="rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700"
          >
            Invoices &amp; Payments
          </Link>
          <Link
            href="/reports/journal-entries"
            className="rounded-lg border border-green-800/40 bg-white px-4 py-2 text-sm font-medium text-green-900 shadow-sm hover:border-green-800 hover:bg-green-50"
          >
            Journal entries
            {data.readyToPostCount > 0 ? (
              <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-900">
                {data.readyToPostCount}
              </span>
            ) : null}
          </Link>
          <Link
            href="/equipment"
            className="rounded-lg border border-green-800/40 bg-white px-4 py-2 text-sm font-medium text-green-900 shadow-sm hover:border-green-800 hover:bg-green-50"
          >
            Equipment
          </Link>
          <Link
            href="/reports/profitability"
            className="rounded-lg border border-green-800/40 bg-white px-4 py-2 text-sm font-medium text-green-900 shadow-sm hover:border-green-800 hover:bg-green-50"
          >
            Profitability
          </Link>
          <Link
            href="/reports/ar-aging"
            className="rounded-lg border border-green-800/40 bg-white px-4 py-2 text-sm font-medium text-green-900 shadow-sm hover:border-green-800 hover:bg-green-50"
          >
            AR aging
          </Link>
          <CreateFinancialStatementButton
            inputs={data.financialStatementInputs}
          />
        </div>
      </div>
    </div>
  );
}
