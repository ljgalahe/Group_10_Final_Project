import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ContractCompletionChart } from "@/components/contracts/ContractCompletionChart";
import { OutOfScopeWorkWatch } from "@/components/contracts/OutOfScopeWorkWatch";
import { PromiseVsActualMap } from "@/components/contracts/PromiseVsActualMap";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { requireAppAccess } from "@/lib/auth-access";
import {
  buildContractProgress,
  buildScopeCreepAlerts,
} from "@/lib/contract-controls";
import { getViewRole } from "@/lib/demo-role";
import { formatCurrency, formatDate } from "@/lib/format";
import { fetchContracts, fetchVisits } from "@/lib/queries";
import type { ServiceVisit } from "@/lib/types";

export default async function ContractsPage() {
  await requireAppAccess();

  const role = await getViewRole();
  const { data: contracts } = await fetchContracts();

  if (role === "crew_lead") {
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
                    <td className="px-4 py-3">
                      {contract.visits_per_week ?? "—"}
                    </td>
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

  const { data: visits } = await fetchVisits();

  const visitsByContract = new Map<string, ServiceVisit[]>();
  for (const visit of visits as ServiceVisit[]) {
    const list = visitsByContract.get(visit.contract_id) ?? [];
    list.push(visit);
    visitsByContract.set(visit.contract_id, list);
  }

  const progressList = contracts.map((contract) =>
    buildContractProgress(contract, visitsByContract.get(contract.id) ?? [])
  );
  const outOfScopeAlerts = buildScopeCreepAlerts(contracts);

  return (
    <AppShell>
      <PageHeader
        title="Contracts"
        description="Contract completion, promise vs actual work, and out-of-scope tracking."
      />

      {contracts.length === 0 ? (
        <EmptyState message="No contracts yet. Run the seed script in Supabase to load demo data." />
      ) : (
        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-semibold text-green-950">
              Contract completion
            </h3>
            <p className="mt-1 text-sm text-stone-500">
              Percent complete, on-track status, and contract status. Filter by
              company or view overall.
            </p>
            <div className="mt-4">
              <ContractCompletionChart progressList={progressList} />
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-green-950">
              Contract promise vs actual
            </h3>
            <p className="mt-1 text-sm text-stone-500">
              Job, contracted visits, completed visits, and status. Filter by
              one company or overall across all companies.
            </p>
            <PromiseVsActualMap progressList={progressList} />
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-green-950">
              Out-of-scope work watch
            </h3>
            <p className="mt-1 text-sm text-stone-500">
              Filter by company or task. Each row shows company, job, and amount
              — click for details and actions.
            </p>
            <OutOfScopeWorkWatch alerts={outOfScopeAlerts} />
          </Card>
        </div>
      )}
    </AppShell>
  );
}
