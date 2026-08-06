import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAppAccess } from "@/lib/auth-access";
import { AppShell } from "@/components/AppShell";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { getViewRole, roleCanManageQuotes } from "@/lib/demo-role";
import { formatDate } from "@/lib/format";
import { fetchQuoteRequests } from "@/lib/queries";

export default async function QuotesPage() {
  await requireAppAccess();
  const role = await getViewRole();
  if (!roleCanManageQuotes(role)) {
    redirect("/dashboard");
  }

  const { data: quotes } = await fetchQuoteRequests();

  return (
    <AppShell>
      <PageHeader
        title="Quotes"
        description="Status list of quotes already created from Inquiries. Open a quote to continue site survey, budget, and contract draft. To start from a new or existing-client inquiry, use Inquiries."
      />

      <div className="mb-6 rounded-lg border border-green-800/15 bg-green-50/50 px-4 py-3 text-sm text-stone-700">
        Need to create a quote from a customer inquiry?{" "}
        <Link
          href="/ops/inquiries"
          className="font-medium text-green-900 underline hover:text-green-700"
        >
          Go to Inquiries
        </Link>
        .
      </div>

      {quotes.length === 0 ? (
        <EmptyState message="No quotes yet. Convert a new-client or existing-client inquiry on Inquiries to create one." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-left text-stone-600">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Request</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Received</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {quotes.map((q) => {
                const customer = Array.isArray(q.customers)
                  ? q.customers[0]
                  : q.customers;
                return (
                  <tr key={q.id} className="hover:bg-stone-50/80">
                    <td className="px-4 py-3">
                      <p className="font-medium text-green-950">
                        {customer?.name ?? "Customer"}
                      </p>
                      <p className="text-xs text-stone-500">
                        {q.property_address || customer?.address || "—"}
                      </p>
                    </td>
                    <td className="max-w-md px-4 py-3 text-stone-700">
                      {q.service_description}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={String(q.status)} />
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {formatDate(q.created_at.slice(0, 10))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/quotes/${q.id}`}
                        className="text-sm font-medium text-green-800 hover:underline"
                      >
                        Open
                      </Link>
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
