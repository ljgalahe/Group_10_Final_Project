import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, PageHeader } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import { getOutstandingBalance } from "@/app/invoices/lib/accounting";
import { InvoiceStatusBadge } from "@/app/invoices/components/InvoiceStatusBadge";
import { fetchPayment, fetchPaymentAuditTrail } from "@/app/payments/queries";
import { PostJournalEntryButton } from "@/components/PostJournalEntryButton";
import { requireAppAccess } from "@/lib/auth-access";
import { getViewRole } from "@/lib/demo-role";
import { paymentJournalReadyReason } from "@/lib/journal";
import { fetchJournalSourceStates } from "@/lib/queries";
import { notFound } from "next/navigation";

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAppAccess();
  const role = await getViewRole();
  const isAccountant = role === "accountant";

  const { data: payment } = await fetchPayment(id);
  if (!payment) notFound();

  const { activity: auditTrail } = await fetchPaymentAuditTrail(id);
  const paymentJournalStatus = isAccountant
    ? ((await fetchJournalSourceStates()).payment.get(id) ?? null)
    : null;
  const invoice = payment.invoices as {
    id: string;
    invoice_number: string;
    total: number;
    amount_paid: number;
    due_date: string;
    status: string;
    customers: { name: string } | null;
    contracts: { title: string } | null;
  } | null;
  const customer = payment.customers as { name: string } | null;

  const balance = invoice
    ? getOutstandingBalance(Number(invoice.total), Number(invoice.amount_paid))
    : 0;

  return (
    <AppShell>
      <PageHeader
        title={`Payment ${payment.payment_number}`}
        description={`${formatCurrency(Number(payment.amount))} · ${formatDate(payment.payment_date)} · ${payment.payment_method.replace(/_/g, " ")}`}
        action={
          isAccountant ? (
            <PostJournalEntryButton
              source="payment"
              sourceId={id}
              journalStatus={paymentJournalStatus}
              disabledReason={
                paymentJournalReadyReason({
                  amount: Number(payment.amount),
                  invoiceId: payment.invoice_id,
                }) ?? undefined
              }
            />
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-green-950">Payment Details</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone-500">Payment ID</dt>
              <dd className="font-semibold">{payment.payment_number}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">Amount Received</dt>
              <dd className="font-semibold">{formatCurrency(Number(payment.amount))}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">Applied to Invoice</dt>
              <dd>{formatCurrency(Number(payment.applied_amount ?? payment.amount))}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">Unapplied Cash</dt>
              <dd className={Number(payment.unapplied_amount) > 0 ? "font-semibold text-amber-800" : ""}>
                {formatCurrency(Number(payment.unapplied_amount ?? 0))}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">Date</dt>
              <dd>{formatDate(payment.payment_date)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">Method</dt>
              <dd className="capitalize">{payment.payment_method.replace(/_/g, " ")}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">Customer</dt>
              <dd>{customer?.name ?? invoice?.customers?.name ?? "—"}</dd>
            </div>
            {payment.notes ? (
              <div className="flex justify-between">
                <dt className="text-stone-500">Notes</dt>
                <dd className="max-w-xs text-right">{payment.notes}</dd>
              </div>
            ) : null}
          </dl>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-green-950">
            {invoice ? "Linked Invoice" : "Invoice Match"}
          </h2>
          {invoice ? (
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-stone-500">Invoice</dt>
                <dd>
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="font-medium text-green-800 hover:underline"
                  >
                    {invoice.invoice_number}
                  </Link>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-500">Contract</dt>
                <dd>{invoice.contracts?.title}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-500">Status</dt>
                <dd>
                  <InvoiceStatusBadge invoice={invoice} />
                </dd>
              </div>
              <div className="flex justify-between font-semibold text-green-900">
                <dt>Outstanding Balance</dt>
                <dd>{formatCurrency(balance)}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-stone-600">
              This cash receipt has not been matched to an invoice. The full amount is
              held as unapplied cash for {customer?.name ?? "the customer"} until applied.
            </p>
          )}
        </Card>
      </div>

      {auditTrail.length > 0 && (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-green-950">Audit Trail</h2>
          <p className="mt-1 text-sm text-stone-500">
            Invoice activity linked to this payment for reconciliation and review.
          </p>
          <ul className="mt-4 space-y-4">
            {auditTrail.map((entry) => (
              <li key={entry.id} className="border-l-2 border-green-200 pl-4">
                <p className="text-sm font-medium text-green-950">{entry.action}</p>
                {entry.details ? (
                  <p className="mt-0.5 text-sm text-stone-600">{entry.details}</p>
                ) : null}
                <p className="mt-1 text-xs text-stone-400">
                  {new Date(entry.created_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mt-6">
        <Link href="/payments" className="text-sm text-green-800 hover:underline">
          ← Back to payments
        </Link>
      </div>
    </AppShell>
  );
}
