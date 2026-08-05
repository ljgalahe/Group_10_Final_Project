import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { EmptyState, PageHeader } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import { fetchPayments } from "@/lib/queries";
import { requireAppAccess } from "@/lib/auth-access";
import { getViewRole } from "@/lib/demo-role";

export default async function PaymentsPage() {
  await requireAppAccess();
  const role = await getViewRole();
  if (role === "crew_member") redirect("/dashboard");

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
                  <td className="px-4 py-3">{formatDate(payment.payment_date)}</td>
                  <td className="px-4 py-3">
                    {(payment.invoices as { invoice_number: string } | null)?.invoice_number}
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
