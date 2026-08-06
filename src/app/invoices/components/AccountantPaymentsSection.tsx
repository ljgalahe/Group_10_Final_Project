import Link from "next/link";
import { PostJournalEntryButton } from "@/components/PostJournalEntryButton";
import { formatCurrency, formatDate } from "@/lib/format";
import { paymentJournalReadyReason, type JournalStatus } from "@/lib/journal";

type AccountantPayment = {
  id: string;
  payment_number: string | null;
  payment_date: string;
  payment_method: string;
  amount: number;
  invoice_id: string | null;
  invoices: {
    invoice_number: string;
    customers: { name: string } | null;
  } | null;
  customers: { name: string } | null;
};

export function AccountantPaymentsSection({
  payments,
  paymentJournalStates,
}: {
  payments: AccountantPayment[];
  paymentJournalStates: Map<string, JournalStatus | null>;
}) {
  return (
    <details className="group mt-8 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-stone-50 px-4 py-3 text-green-950 marker:content-none [&::-webkit-details-marker]:hidden">
        <div>
          <h2 className="text-lg font-semibold">Payments</h2>
          <p className="text-sm text-stone-500">
            Cash receipts and payment reconciliation — expand to view all
            payments.
          </p>
        </div>
        <span className="shrink-0 text-sm text-stone-500 group-open:rotate-180">
          ▼
        </span>
      </summary>

      {payments.length === 0 ? (
        <p className="border-t border-stone-200 px-4 py-6 text-sm text-stone-500">
          No payments recorded yet.
        </p>
      ) : (
        <div className="overflow-x-auto border-t border-stone-200">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-50 text-left text-stone-600">
              <tr>
                <th className="px-4 py-3 font-medium">Payment ID</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Invoice</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Journal</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => {
                const invoice = payment.invoices;
                const customerName =
                  payment.customers?.name ?? invoice?.customers?.name ?? "—";

                return (
                  <tr
                    key={payment.id}
                    className="border-t border-stone-100 hover:bg-stone-50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/payments/${payment.id}`}
                        className="font-medium text-green-800 hover:underline"
                      >
                        {payment.payment_number ?? payment.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {formatDate(payment.payment_date)}
                    </td>
                    <td className="px-4 py-3">
                      {invoice?.invoice_number ?? "—"}
                    </td>
                    <td className="px-4 py-3">{customerName}</td>
                    <td className="px-4 py-3 capitalize">
                      {payment.payment_method.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatCurrency(Number(payment.amount))}
                    </td>
                    <td className="px-4 py-3">
                      <PostJournalEntryButton
                        source="payment"
                        sourceId={payment.id}
                        journalStatus={
                          paymentJournalStates.get(payment.id) ?? null
                        }
                        disabledReason={
                          paymentJournalReadyReason({
                            amount: Number(payment.amount),
                            invoiceId: payment.invoice_id,
                          }) ?? undefined
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </details>
  );
}
