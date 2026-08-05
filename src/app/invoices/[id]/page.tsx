import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerPayButton } from "@/components/customer/CustomerPayButton";
import { DownloadInvoiceReceiptButton } from "@/components/customer/DownloadInvoiceReceiptButton";
import { AppShell } from "@/components/AppShell";
import { PaymentForm } from "@/components/PaymentForm";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { requireAppAccess } from "@/lib/auth-access";
import { getViewCustomerId, getViewRole } from "@/lib/demo-role";
import { formatCurrency, formatDate, getDisplayInvoiceStatus } from "@/lib/format";
import { fetchCustomerPaymentMethods, fetchInvoice } from "@/lib/queries";

/** Prefer stored customer method labels; map legacy simulated_* values only. */
function formatCustomerPaymentMethod(method: string) {
  const normalized = method.toLowerCase().trim();
  const legacy: Record<string, string> = {
    simulated_card: "Card ending in 4242",
    simulated: "Card ending in 4242",
    "card payment": "Card ending in 4242",
    card_payment: "Card ending in 4242",
    simulated_ach: "Bank account ending in 8821",
    simulated_check: "Check",
  };
  if (legacy[normalized]) return legacy[normalized];
  if (!/simulated/i.test(method)) return method;

  const cleaned = method
    .replace(/simulated[_ ]?/gi, "")
    .replaceAll("_", " ")
    .trim();
  return cleaned || "Card ending in 4242";
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAppAccess();

  const role = await getViewRole();
  const { data: invoice } = await fetchInvoice(id);
  if (!invoice) notFound();

  const customerId =
    role === "customer" ? await getViewCustomerId() : null;
  const paymentMethods =
    customerId != null
      ? (await fetchCustomerPaymentMethods(customerId)).data
      : [];

  const lines = (invoice.invoice_lines ?? []) as {
    id: string;
    description: string;
    amount: number;
    line_type: string | null;
  }[];
  const payments = (invoice.payments ?? []) as {
    id: string;
    amount: number;
    payment_date: string;
    payment_method: string;
  }[];
  const balance = Number(invoice.total) - Number(invoice.amount_paid);
  const amountPaid = Number(invoice.amount_paid);
  const canDownloadReceipt = role === "customer" && amountPaid > 0;

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
      <PageHeader
        title={`Invoice ${invoice.invoice_number}`}
        description={`${(invoice.customers as { name: string }).name} · ${(invoice.contracts as { title: string }).title}`}
        action={
          role === "customer" && balance > 0 ? (
            <CustomerPayButton
              invoiceId={id}
              invoiceNumber={invoice.invoice_number}
              amountDue={balance}
              dueDate={invoice.due_date}
              paymentMethods={paymentMethods}
            />
          ) : null
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
                    amountPaid
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
        </Card>
      </div>

      {(role === "customer" || payments.length > 0) && (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-green-950">
            Payment History
          </h2>
          {payments.length === 0 ? (
            <p className="mt-4 text-sm text-stone-500">
              No payments yet. After you pay, payments will appear here and you
              can download a PDF receipt.
            </p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {payments.map((payment) => (
                <li key={payment.id} className="flex justify-between">
                  <span>
                    {formatDate(payment.payment_date)} ·{" "}
                    {role === "customer"
                      ? formatCustomerPaymentMethod(payment.payment_method)
                      : payment.payment_method.replaceAll("_", " ")}
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

      {(role === "manager" || role === "accountant") && balance > 0 && (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-green-950">
            Record Payment
          </h2>
          <div className="mt-4">
            <PaymentForm invoiceId={invoice.id} maxAmount={balance} />
          </div>
        </Card>
      )}

      <div className="mt-6">
        <Link
          href="/invoices"
          className="text-sm text-green-800 hover:underline"
        >
          ← Back to invoices
        </Link>
      </div>
    </AppShell>
  );
}
