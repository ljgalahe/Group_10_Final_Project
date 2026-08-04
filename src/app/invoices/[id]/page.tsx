import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { customerPayInvoice } from "@/app/actions/business";
import { AppShell } from "@/components/AppShell";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { getViewRole } from "@/lib/demo-role";
import { formatCurrency, formatDate } from "@/lib/format";
import { fetchInvoice } from "@/lib/queries";
import { requireAppAccess } from "@/lib/auth-access";
import { PaymentForm } from "@/components/PaymentForm";

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

  return (
    <AppShell>
      <PageHeader
        title={`Invoice ${invoice.invoice_number}`}
        description={`${(invoice.customers as { name: string }).name} · ${(invoice.contracts as { title: string }).title}`}
        action={
          role === "customer" && balance > 0 ? (
            <form action={customerPayInvoice}>
              <input type="hidden" name="invoice_id" value={id} />
              <button
                type="submit"
                className="rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Pay Now (Simulated)
              </button>
            </form>
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
                <StatusBadge status={invoice.status} />
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
              <dd>{formatCurrency(Number(invoice.amount_paid))}</dd>
            </div>
            <div className="flex justify-between font-semibold text-green-900">
              <dt>Balance Due</dt>
              <dd>{formatCurrency(balance)}</dd>
            </div>
          </dl>
        </Card>
      </div>

      {payments.length > 0 && (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-green-950">Payment History</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {payments.map((payment) => (
              <li key={payment.id} className="flex justify-between">
                <span>
                  {formatDate(payment.payment_date)} · {payment.payment_method}
                </span>
                <span className="font-medium">
                  {formatCurrency(Number(payment.amount))}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(role === "manager" || role === "accountant") && balance > 0 && (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-green-950">Record Payment</h2>
          <div className="mt-4">
            <PaymentForm invoiceId={invoice.id} maxAmount={balance} />
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
