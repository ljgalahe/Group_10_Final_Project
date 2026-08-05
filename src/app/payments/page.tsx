import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import { PostJournalEntryButton } from "@/components/PostJournalEntryButton";
import { paymentJournalReadyReason } from "@/lib/journal";
import { fetchJournalSourceStates, fetchPayments } from "@/lib/queries";
import { requireAppAccess } from "@/lib/auth-access";
import { getViewRole } from "@/lib/demo-role";
import { RecordPaymentButton } from "@/app/payments/components/RecordPaymentButton";
import { fetchOpenInvoicesForPayment } from "@/app/invoices/queries";
import {
  fetchCustomersForPayment,
  fetchPaymentsForAccountant,
  fetchUnappliedCashPayments,
} from "@/app/payments/queries";

export default async function PaymentsPage() {
  await requireAppAccess();
  const role = await getViewRole();
  const isAccountant = role === "accountant";

  if (!isAccountant) {
    const { data: payments } = await fetchPayments();

    return (
      <AppShell>
        <PageHeader
          title="Payments"
          description="Simulated payment records for checks, ACH, and card payments."
        />

        {payments.length === 0 ? (
          <EmptyState message="No payments recorded yet." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-stone-50 text-left text-stone-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Invoice</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-t border-stone-100">
                    <td className="px-4 py-3">
                      {formatDate(payment.payment_date)}
                    </td>
                    <td className="px-4 py-3">
                      {
                        (payment.invoices as { invoice_number: string } | null)
                          ?.invoice_number
                      }
                    </td>
                    <td className="px-4 py-3">
                      {
                        (
                          payment.invoices as {
                            customers: { name: string } | null;
                          } | null
                        )?.customers?.name
                      }
                    </td>
                    <td className="px-4 py-3 capitalize">
                      {payment.payment_method.replace("_", " ")}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatCurrency(Number(payment.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AppShell>
    );
  }

  const { data: payments } = await fetchPaymentsForAccountant();
  const paymentJournalStates = (await fetchJournalSourceStates()).payment;
  const openInvoices = await fetchOpenInvoicesForPayment();
  const customers = await fetchCustomersForPayment();
  const unappliedCash = await fetchUnappliedCashPayments();

  return (
    <AppShell>
      <PageHeader
        title="Payments"
        description="Cash receipts and payment reconciliation — click a Payment ID for details."
        action={
          <RecordPaymentButton invoices={openInvoices} customers={customers} />
        }
      />

      {payments.length === 0 ? (
        <EmptyState message="No payments recorded yet." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-50 text-left text-stone-600">
              <tr>
                <th className="px-4 py-3 font-medium">Payment ID</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Invoice</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Unapplied</th>
                <th className="px-4 py-3 font-medium">Journal</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => {
                const invoice = payment.invoices as {
                  invoice_number: string;
                  customers: { name: string } | null;
                } | null;
                const customer = payment.customers as { name: string } | null;
                const customerName =
                  customer?.name ?? invoice?.customers?.name ?? "—";

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
                      {invoice?.invoice_number ?? (
                        <span className="text-stone-400">Unapplied</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{customerName}</td>
                    <td className="px-4 py-3 capitalize">
                      {payment.payment_method.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatCurrency(Number(payment.amount))}
                    </td>
                    <td className="px-4 py-3">
                      {Number(payment.unapplied_amount) > 0 ? (
                        <span className="font-medium text-amber-800">
                          {formatCurrency(Number(payment.unapplied_amount))}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <PostJournalEntryButton
                        source="payment"
                        sourceId={payment.id}
                        journalStatus={paymentJournalStates.get(payment.id) ?? null}
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

      {unappliedCash.length > 0 && (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-green-950">Unapplied Cash</h2>
          <p className="mt-1 text-sm text-stone-500">
            Customer payments not yet matched to an invoice, or overpayment balances.
          </p>
          <table className="mt-4 min-w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-stone-500">
                <th className="py-2 font-medium">Payment ID</th>
                <th className="py-2 font-medium">Customer</th>
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 font-medium">Unapplied</th>
                <th className="py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {unappliedCash.map((payment) => (
                <tr key={payment.id} className="border-b border-stone-100">
                  <td className="py-3">
                    <Link
                      href={`/payments/${payment.id}`}
                      className="font-medium text-green-800 hover:underline"
                    >
                      {payment.payment_number}
                    </Link>
                  </td>
                  <td className="py-3">
                    {(payment.customers as { name: string } | null)?.name ?? "—"}
                  </td>
                  <td className="py-3">{formatDate(payment.payment_date)}</td>
                  <td className="py-3 font-medium text-amber-800">
                    {formatCurrency(Number(payment.unapplied_amount))}
                  </td>
                  <td className="py-3 text-stone-500">{payment.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </AppShell>
  );
}
