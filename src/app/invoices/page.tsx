import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import { fetchInvoices } from "@/lib/queries";
import { requireAppAccess } from "@/lib/auth-access";

export default async function InvoicesPage() {
  await requireAppAccess();

  const { data: invoices } = await fetchInvoices();

  return (
    <AppShell>
      <PageHeader
        title="Invoices"
        description="Bills generated from contract terms and approved extra work."
      />

      {invoices.length === 0 ? (
        <EmptyState message="No invoices yet. Generate one from a contract detail page." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-50 text-left text-stone-600">
              <tr>
                <th className="px-4 py-3 font-medium">Invoice #</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Contract</th>
                <th className="px-4 py-3 font-medium">Issue Date</th>
                <th className="px-4 py-3 font-medium">Due Date</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Balance</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => {
                const balance =
                  Number(invoice.total) - Number(invoice.amount_paid);
                return (
                  <tr key={invoice.id} className="border-t border-stone-100">
                    <td className="px-4 py-3">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="font-medium text-green-800 hover:underline"
                      >
                        {invoice.invoice_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {(invoice.customers as { name: string } | null)?.name}
                    </td>
                    <td className="px-4 py-3">
                      {(invoice.contracts as { title: string } | null)?.title}
                    </td>
                    <td className="px-4 py-3">{formatDate(invoice.issue_date)}</td>
                    <td className="px-4 py-3">{formatDate(invoice.due_date)}</td>
                    <td className="px-4 py-3">
                      {formatCurrency(Number(invoice.total))}
                    </td>
                    <td className="px-4 py-3">{formatCurrency(balance)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={invoice.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
