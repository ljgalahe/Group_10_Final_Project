import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import { fetchContracts } from "@/lib/queries";
import { requireAppAccess } from "@/lib/auth-access";

export default async function ContractsPage() {
  await requireAppAccess();

  const { data: contracts } = await fetchContracts();

  return (
    <AppShell>
      <PageHeader
        title="Contracts"
        description="Structured seasonal agreements with service terms, billing rules, and included services."
      />

      {contracts.length === 0 ? (
        <EmptyState message="No contracts yet. Run the seed script in Supabase to load demo data." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-50 text-left text-stone-600">
              <tr>
                <th className="px-4 py-3 font-medium">Contract</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Season</th>
                <th className="px-4 py-3 font-medium">Monthly Fee</th>
                <th className="px-4 py-3 font-medium">Visits/Week</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract) => (
                <tr key={contract.id} className="border-t border-stone-100">
                  <td className="px-4 py-3">
                    <Link
                      href={`/contracts/${contract.id}`}
                      className="font-medium text-green-800 hover:underline"
                    >
                      {contract.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {(contract.customers as { name: string } | null)?.name}
                  </td>
                  <td className="px-4 py-3">
                    {formatDate(contract.season_start)} –{" "}
                    {formatDate(contract.season_end)}
                  </td>
                  <td className="px-4 py-3">
                    {contract.monthly_fee
                      ? formatCurrency(Number(contract.monthly_fee))
                      : "—"}
                  </td>
                  <td className="px-4 py-3">{contract.visits_per_week ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={contract.status} />
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
