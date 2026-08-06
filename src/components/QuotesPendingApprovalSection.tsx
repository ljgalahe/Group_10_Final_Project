import Link from "next/link";
import {
  approveQuote,
  requestQuoteChanges,
} from "@/app/actions/quote-approvals";
import { DownloadQuotePdfButton } from "@/components/DownloadQuotePdfButton";
import { StatusBadge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import type { QuoteLineItem } from "@/lib/service-pricing";

type PendingQuote = {
  id: string;
  service_description: string;
  status: string;
  monthly_fee?: number | null;
  submitted_for_approval_at?: string | null;
  created_at: string;
  property_address?: string | null;
  visits_per_week?: number | null;
  visit_frequency_notes?: string | null;
  season_start?: string | null;
  season_end?: string | null;
  notes?: string | null;
  line_items?: QuoteLineItem[] | null;
  customers?: {
    name?: string | null;
    address?: string | null;
  } | null;
};

export function QuotesPendingApprovalSection({
  quotes,
}: {
  quotes: PendingQuote[];
}) {
  return (
    <section className="mb-6 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-4 shadow-sm">
      <h2 className="text-lg font-semibold text-green-950">
        Quotes Pending Approval
      </h2>

      {quotes.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">
          No Quotes Are Waiting For Approval.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-amber-100 overflow-hidden rounded-lg border border-amber-200 bg-white">
          {quotes.map((quote) => {
            const customerName =
              (quote.customers as { name?: string } | null)?.name ?? null;
            const customerAddress =
              (quote.customers as { address?: string } | null)?.address ?? null;
            const lineItems = (quote.line_items as QuoteLineItem[]) ?? [];
            return (
              <li
                key={quote.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <Link
                    href={`/quotes/${quote.id}`}
                    className="font-medium text-green-900 hover:underline"
                  >
                    {quote.service_description.slice(0, 80)}
                  </Link>
                  <p className="mt-0.5 text-sm text-stone-500">
                    {customerName ? `${customerName} · ` : ""}
                    {quote.monthly_fee != null
                      ? `${formatCurrency(Number(quote.monthly_fee))} / Mo`
                      : "Fee TBD"}
                    {" · "}
                    Submitted{" "}
                    {formatDate(
                      (
                        quote.submitted_for_approval_at ?? quote.created_at
                      ).slice(0, 10)
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={String(quote.status)} />
                  <DownloadQuotePdfButton
                    data={{
                      id: quote.id,
                      customerName: customerName ?? "Customer",
                      propertyAddress:
                        quote.property_address || customerAddress || "—",
                      serviceDescription: quote.service_description,
                      status: String(quote.status),
                      lineItems,
                      visitsPerWeek: quote.visits_per_week ?? null,
                      visitFrequencyNotes: quote.visit_frequency_notes ?? null,
                      seasonStart: quote.season_start ?? null,
                      seasonEnd: quote.season_end ?? null,
                      monthlyFee:
                        quote.monthly_fee != null
                          ? Number(quote.monthly_fee)
                          : null,
                      notes: quote.notes ?? null,
                      submittedAt: quote.submitted_for_approval_at ?? null,
                      createdAt: quote.created_at,
                    }}
                  />
                  <form action={approveQuote}>
                    <input type="hidden" name="quote_id" value={quote.id} />
                    <button
                      type="submit"
                      className="rounded-md bg-green-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800"
                    >
                      Approve
                    </button>
                  </form>
                  <form
                    action={requestQuoteChanges}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <input type="hidden" name="quote_id" value={quote.id} />
                    <input
                      name="change_notes"
                      placeholder="Request Changes…"
                      className="rounded-md border border-stone-300 px-2 py-1.5 text-xs"
                    />
                    <button
                      type="submit"
                      className="rounded-md border border-amber-700 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-50"
                    >
                      Request Changes
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
