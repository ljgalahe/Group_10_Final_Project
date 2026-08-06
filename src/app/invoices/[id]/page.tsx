import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CustomerPayButton } from "@/components/customer/CustomerPayButton";
import { DownloadInvoiceReceiptButton } from "@/components/customer/DownloadInvoiceReceiptButton";
import { AppShell } from "@/components/AppShell";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { requireAppAccess } from "@/lib/auth-access";
import {
  getViewCustomerId,
  getViewRole,
  roleCanManageBilling,
} from "@/lib/demo-role";
import { formatCurrency, formatDate, getDisplayInvoiceStatus } from "@/lib/format";
import { PostJournalEntryButton } from "@/components/PostJournalEntryButton";
import { invoiceJournalReadyReason } from "@/lib/journal";
import {
  fetchCustomerPaymentMethods,
  fetchInvoice,
  fetchJournalSourceStates,
} from "@/lib/queries";
import {
  getDisplayInvoiceStatus as getAccountantInvoiceStatus,
  getOutstandingBalance,
} from "@/app/invoices/lib/accounting";
import { InvoiceSummaryCard } from "@/app/invoices/components/InvoiceSummaryCard";
import {
  DuplicatePaymentAlert,
  InvoiceActivityButton,
} from "@/app/invoices/components/InvoiceActivityButton";
import { InvoiceWorkflowActions } from "@/app/invoices/components/InvoiceWorkflowActions";
import { SendReminderButton } from "@/app/invoices/components/SendReminderButton";
import { fetchInvoiceActivity } from "@/app/invoices/queries";
import { RecordPaymentButton } from "@/app/payments/components/RecordPaymentButton";

/** Prefer stored customer method labels; map legacy simulated_* values only. */
function formatCustomerPaymentMethod(method: string, notes?: string | null) {
  // Prefer the customer-facing label stored in portal payment notes.
  const fromNotes = notes?.match(/·\s*(.+)$/)?.[1]?.trim();
  if (fromNotes && !/simulated/i.test(fromNotes)) return fromNotes;

  const normalized = method.toLowerCase().trim();
  const labels: Record<string, string> = {
    card: "Card payment",
    ach: "ACH bank transfer",
    bank_transfer: "Bank transfer",
    check: "Check",
    simulated_card: "Card ending in 4242",
    simulated: "Card ending in 4242",
    "card payment": "Card payment",
    card_payment: "Card payment",
    simulated_ach: "Bank account ending in 8821",
    simulated_check: "Check",
  };
  if (labels[normalized]) return labels[normalized];
  if (!/simulated/i.test(method)) {
    return method.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  const cleaned = method
    .replace(/simulated[_ ]?/gi, "")
    .replaceAll("_", " ")
    .trim();
  return cleaned || "Card payment";
}

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ duplicate?: string }>;
}) {
  const { id } = await params;
  const { duplicate } = await searchParams;
  await requireAppAccess();

  const role = await getViewRole();
  if (role === "crew_member") redirect("/dashboard");
  const isAccountant = role === "accountant";
  const showAccountantLayout = roleCanManageBilling(role);
  const { data: invoice } = await fetchInvoice(id);
  if (!invoice) notFound();

  const customerId = role === "customer" ? await getViewCustomerId() : null;
  const paymentMethods =
    customerId != null
      ? (await fetchCustomerPaymentMethods(customerId)).data
      : [];
  const activities = showAccountantLayout ? await fetchInvoiceActivity(id) : [];
  const invoiceJournalStatus = showAccountantLayout
    ? ((await fetchJournalSourceStates()).invoice.get(id) ?? null)
    : null;

  const lines = (invoice.invoice_lines ?? []) as {
    id: string;
    description: string;
    amount: number;
    line_type: string | null;
  }[];
  const payments = (invoice.payments ?? []) as {
    id: string;
    payment_number?: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    notes?: string | null;
    unapplied_amount?: number;
  }[];
  const balance = getOutstandingBalance(
    Number(invoice.total),
    Number(invoice.amount_paid)
  );
  const amountPaid = Number(invoice.amount_paid);
  const canDownloadReceipt = role === "customer" && amountPaid > 0;
  const displayStatus = getAccountantInvoiceStatus(invoice);
  const isOverdue = displayStatus === "past_due" && balance > 0;

  const invoiceForPayment = {
    id: invoice.id as string,
    invoice_number: invoice.invoice_number as string,
    total: Number(invoice.total),
    amount_paid: Number(invoice.amount_paid),
    customers: (invoice.customers as { name: string } | null) ?? null,
  };

  const receiptData = {
    invoiceNumber: invoice.invoice_number,
    customerName: (invoice.customers as { name: string }).name,
    contractTitle: (invoice.contracts as { title: string }).title,
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    total: Number(invoice.total),
    amountPaid,
    balance,
    lines: lines.map((line) => ({
      description: line.description,
      amount: Number(line.amount),
      line_type: line.line_type,
    })),
    payments: payments.map((payment) => ({
      amount: Number(payment.amount),
      payment_date: payment.payment_date,
      payment_method: payment.payment_method,
    })),
  };

  return (
    <AppShell>
      {isAccountant && duplicate ? (
        <DuplicatePaymentAlert message={duplicate} />
      ) : null}

      <PageHeader
        title={`Invoice ${invoice.invoice_number}`}
        description={`${(invoice.customers as { name: string }).name} · ${(invoice.contracts as { title: string }).title}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {showAccountantLayout ? (
              <>
                <PostJournalEntryButton
                  source="invoice"
                  sourceId={id}
                  journalStatus={invoiceJournalStatus}
                  disabledReason={invoiceJournalReadyReason(invoice.status) ?? undefined}
                  readOnly={!isAccountant}
                />
                <InvoiceActivityButton activities={activities} />
                {isAccountant ? (
                  <>
                    <InvoiceWorkflowActions
                      invoice={invoice}
                      invoiceNumber={invoice.invoice_number as string}
                    />
                    {isOverdue ? <SendReminderButton invoiceId={id} /> : null}
                  </>
                ) : null}
              </>
            ) : null}
            {role === "customer" && balance > 0 ? (
              <CustomerPayButton
                invoiceId={id}
                invoiceNumber={invoice.invoice_number}
                amountDue={balance}
                dueDate={invoice.due_date}
                paymentMethods={paymentMethods}
              />
            ) : null}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-green-950">Line Items</h2>
          <table className="mt-4 min-w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-stone-500">
                <th className="py-2 font-medium">Description</th>
                <th className="py-2 font-medium">Type</th>
                <th className="py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id} className="border-b border-stone-100">
                  <td className="py-3">{line.description}</td>
                  <td className="py-3 capitalize text-stone-500">
                    {line.line_type?.replace("_", " ") ?? "—"}
                  </td>
                  <td className="py-3 text-right">
                    {formatCurrency(Number(line.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          {showAccountantLayout ? (
            <InvoiceSummaryCard invoice={invoice} />
          ) : (
            <>
              <h2 className="text-lg font-semibold text-green-950">Summary</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-stone-500">Status</dt>
                  <dd>
                    <StatusBadge
                      status={getDisplayInvoiceStatus(
                        invoice.status,
                        invoice.due_date,
                        balance,
                        amountPaid,
                        role === "customer"
                      )}
                    />
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-500">Issue Date</dt>
                  <dd>{formatDate(invoice.issue_date)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-500">Due Date</dt>
                  <dd>{formatDate(invoice.due_date)}</dd>
                </div>
                <div className="flex justify-between font-semibold">
                  <dt>Total</dt>
                  <dd>{formatCurrency(Number(invoice.total))}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-500">Paid</dt>
                  <dd>{formatCurrency(amountPaid)}</dd>
                </div>
                <div className="flex justify-between font-semibold text-green-900">
                  <dt>Balance Due</dt>
                  <dd>{formatCurrency(balance)}</dd>
                </div>
              </dl>
            </>
          )}
        </Card>
      </div>

      {(role === "customer" || payments.length > 0) && (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-green-950">Payment History</h2>
          {payments.length === 0 ? (
            <p className="mt-4 text-sm text-stone-500">
              No payments yet. After you pay, payments will appear here and you
              can download a PDF receipt.
            </p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {payments.map((payment) => (
                <li key={payment.id} className="flex justify-between gap-4">
                  <span>
                    {showAccountantLayout ? (
                      <>
                        <Link
                          href={`/payments/${payment.id}`}
                          className="font-medium text-green-800 hover:underline"
                        >
                          {payment.payment_number ?? "Payment"}
                        </Link>
                        {" · "}
                      </>
                    ) : null}
                    {formatDate(payment.payment_date)} ·{" "}
                    {role === "customer"
                      ? formatCustomerPaymentMethod(
                          payment.payment_method,
                          payment.notes
                        )
                      : payment.payment_method.replace(/_/g, " ")}
                    {showAccountantLayout && Number(payment.unapplied_amount) > 0 ? (
                      <span className="text-amber-700">
                        {" "}
                        ({formatCurrency(Number(payment.unapplied_amount))} unapplied)
                      </span>
                    ) : null}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(Number(payment.amount))}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {canDownloadReceipt ? (
            <div className="mt-6 border-t border-stone-100 pt-4">
              <DownloadInvoiceReceiptButton data={receiptData} />
              <p className="mt-3 text-sm text-stone-600">
                Download a PDF receipt for your records.
              </p>
            </div>
          ) : null}
        </Card>
      )}

      {isAccountant && balance > 0 && invoice.status !== "voided" && (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-green-950">Payments</h2>
          <p className="mt-1 text-sm text-stone-500">
            Record a new payment against this invoice.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <RecordPaymentButton
              invoices={[invoiceForPayment]}
              defaultInvoiceId={invoice.id}
              invoiceOnly
              redirectTo={`/invoices/${invoice.id}`}
            />
          </div>
        </Card>
      )}

      <div className="mt-6">
        <Link href="/invoices" className="text-sm text-green-800 hover:underline">
          ← Back to invoices
        </Link>
      </div>
    </AppShell>
  );
}
