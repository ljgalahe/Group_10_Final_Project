import { Card, StatCard } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import type { AgingBucketKey, ArInvoice } from "./ar-types";

function AgingSection({
  title,
  invoices,
}: {
  title: string;
  invoices: ArInvoice[];
}) {
  const total = invoices.reduce(
    (sum, inv) => sum + (Number(inv.total) - Number(inv.amount_paid)),
    0
  );

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-green-950">{title}</h2>
        <span className="font-bold text-green-900">{formatCurrency(total)}</span>
      </div>
      {invoices.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">No balances in this bucket.</p>
      ) : (
        <ul className="mt-4 space-y-2 text-sm">
          {invoices.map((invoice) => (
            <li
              key={invoice.id}
              className="flex justify-between rounded-lg bg-stone-50 px-3 py-2"
            >
              <span>
                {invoice.invoice_number} · {invoice.customers?.name}
              </span>
              <span>
                {formatCurrency(
                  Number(invoice.total) - Number(invoice.amount_paid)
                )}{" "}
                <span className="text-stone-400">
                  due {formatDate(invoice.due_date)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Original manager AR aging layout — bucket stats + simple lists. */
export function ManagerArAgingView({
  buckets,
}: {
  buckets: Record<AgingBucketKey, ArInvoice[]>;
}) {
  const bucketTotals = Object.fromEntries(
    Object.entries(buckets).map(([key, invoiceList]) => [
      key,
      invoiceList.reduce(
        (sum, inv) => sum + (Number(inv.total) - Number(inv.amount_paid)),
        0
      ),
    ])
  ) as Record<string, number>;

  const totalOutstanding = Object.values(bucketTotals).reduce(
    (a, b) => a + b,
    0
  );

  return (
    <>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total Outstanding"
          value={formatCurrency(totalOutstanding)}
        />
        <StatCard
          label="Current"
          value={formatCurrency(bucketTotals.current ?? 0)}
        />
        <StatCard
          label="1–30 Days"
          value={formatCurrency(bucketTotals["1-30"] ?? 0)}
        />
        <StatCard
          label="31–60 Days"
          value={formatCurrency(bucketTotals["31-60"] ?? 0)}
        />
        <StatCard
          label="61+ Days"
          value={formatCurrency(
            (bucketTotals["61-90"] ?? 0) + (bucketTotals["90+"] ?? 0)
          )}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AgingSection
          title="Current (Not Yet Due)"
          invoices={buckets.current ?? []}
        />
        <AgingSection
          title="1–30 Days Past Due"
          invoices={buckets["1-30"] ?? []}
        />
        <AgingSection
          title="31–60 Days Past Due"
          invoices={buckets["31-60"] ?? []}
        />
        <AgingSection
          title="61–90 Days Past Due"
          invoices={buckets["61-90"] ?? []}
        />
        <AgingSection
          title="90+ Days Past Due"
          invoices={buckets["90+"] ?? []}
        />
      </div>
    </>
  );
}
