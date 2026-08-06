import Link from "next/link";
import { createContractFromApprovedQuote } from "@/app/actions/customer-contract-sign";
import { StatusBadge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";

type ApprovedQuote = {
  id: string;
  service_description: string;
  monthly_fee?: number | null;
  season_start?: string | null;
  season_end?: string | null;
  draft_contract_id?: string | null;
  customers?: { name?: string | null } | null;
};

export function DraftContractsSection({
  quotes,
}: {
  quotes: ApprovedQuote[];
}) {
  const ready = quotes.filter((q) => !q.draft_contract_id);

  return (
    <section className="mb-6 rounded-xl border border-green-200 bg-green-50/60 px-4 py-4 shadow-sm">
      <h2 className="text-lg font-semibold text-green-950">Draft Contracts</h2>
      <p className="mt-1 text-sm text-stone-600">
        Approved Quotes Ready To Become Contracts.
      </p>

      {ready.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">
          No Approved Quotes Waiting For A Contract Draft.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-green-100 overflow-hidden rounded-lg border border-green-200 bg-white">
          {ready.map((quote) => {
            const customerName =
              (quote.customers as { name?: string } | null)?.name ?? null;
            return (
              <li
                key={quote.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-green-950">
                    {customerName ?? "Customer"}
                  </p>
                  <p className="mt-0.5 text-sm text-stone-500">
                    {quote.service_description.slice(0, 72)}
                    {quote.monthly_fee != null
                      ? ` · ${formatCurrency(Number(quote.monthly_fee))} / Mo`
                      : ""}
                    {quote.season_start && quote.season_end
                      ? ` · ${formatDate(quote.season_start)} – ${formatDate(quote.season_end)}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status="approved" />
                  <form action={createContractFromApprovedQuote}>
                    <input type="hidden" name="quote_id" value={quote.id} />
                    <button
                      type="submit"
                      className="rounded-md bg-green-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800"
                    >
                      Create Contract
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
