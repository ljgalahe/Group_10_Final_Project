import Link from "next/link";
import { AccountantContractsView } from "@/components/AccountantContractsView";
import { AppShell } from "@/components/AppShell";
import { ManagerContractsDashboard } from "@/components/contracts/ManagerContractsDashboard";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { requireAppAccess } from "@/lib/auth-access";
import { buildContractProgress } from "@/lib/contract-controls";
import { getViewRole, roleCanEditContractDetails } from "@/lib/demo-role";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  fetchAccountantContractBilling,
  fetchContractAuditLogs,
  fetchContractProfitabilityMap,
  fetchContracts,
  fetchContractsDetailed,
  fetchPendingContractApprovals,
  fetchPendingContractChangeRequests,
  fetchVisits,
} from "@/lib/queries";
import type { ServiceVisit } from "@/lib/types";

function SimpleContractsTable({
  contracts,
  showCustomerColumn,
}: {
  contracts: Awaited<ReturnType<typeof fetchContracts>>["data"];
  showCustomerColumn: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-stone-50 text-left text-stone-600">
          <tr>
            <th className="px-4 py-3 font-medium">Contract</th>
            {showCustomerColumn ? (
              <th className="px-4 py-3 font-medium">Customer</th>
            ) : null}
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
              {showCustomerColumn ? (
                <td className="px-4 py-3">
                  {(contract.customers as { name: string } | null)?.name}
                </td>
              ) : null}
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
  );
}

export default async function ContractsPage() {
  await requireAppAccess();

  const role = await getViewRole();

  if (roleCanEditContractDetails(role)) {
    const [
      { data: contracts },
      profitMap,
      { data: pendingRequests },
      { data: auditLogs },
      billing,
      { data: pendingApprovals },
    ] = await Promise.all([
      fetchContractsDetailed(),
      fetchContractProfitabilityMap(),
      fetchPendingContractChangeRequests(),
      fetchContractAuditLogs(),
      fetchAccountantContractBilling(),
      fetchPendingContractApprovals(),
    ]);
    const unprofitableIds = [...profitMap.entries()]
      .filter(([, info]) => info.unprofitable)
      .map(([id]) => id);

    return (
      <AppShell>
        <PageHeader
          kicker="Ledger"
          title="Contracts"
          description="Internal controls for approvals, renewals, and auditability."
          action={
            <Link href="/contracts/new" className="gs-text-link border border-stone-300 px-4 py-2 hover:border-[var(--champagne)]">
              Add Contract →
            </Link>
          }
        />
        {pendingApprovals.length > 0 ? (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-semibold">
              {pendingApprovals.length} Operations draft
              {pendingApprovals.length === 1 ? "" : "s"} need your approval
            </p>
            <ul className="mt-2 list-disc pl-5">
              {pendingApprovals.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/contracts/${c.id}`}
                    className="font-medium text-green-900 hover:underline"
                  >
                    {c.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <AccountantContractsView
          contracts={contracts}
          unprofitableIds={unprofitableIds}
          pendingRequests={pendingRequests}
          auditLogs={auditLogs}
          visits={billing.visits}
          costs={billing.costs}
        />
      </AppShell>
    );
  }

  const { data: contracts } = await fetchContracts();
  const pendingApprovals =
    role === "manager" || role === "operations"
      ? (await fetchPendingContractApprovals()).data
      : [];

  // Customer (and crew) see the simple agreement list — not manager ops dashboards.
  if (role === "customer" || role === "crew_lead" || role === "crew_member") {
    const isCustomer = role === "customer";
    return (
      <AppShell>
        <PageHeader
          kicker={isCustomer ? "Portal" : "Field"}
          title="Contracts"
          description={
            isCustomer
              ? "Your seasonal agreements, terms, and included services."
              : "Seasonal agreements with service terms, billing rules, and included services."
          }
        />

        {contracts.length === 0 ? (
          <EmptyState
            message={
              isCustomer
                ? "No contracts on file for this property."
                : "No contracts yet. Run the seed script in Supabase to load demo data."
            }
          />
        ) : (
          <SimpleContractsTable
            contracts={contracts}
            showCustomerColumn={!isCustomer}
          />
        )}
      </AppShell>
    );
  }

  // Operations: simple drafts list + pending dual-approval (no manager analytics charts).
  if (role === "operations") {
    return (
      <AppShell>
        <PageHeader
          title="Contracts"
          description="Draft contracts from quotes. Manager and Accountant must both approve before customers see them."
          action={
            <Link
              href="/quotes"
              className="rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Quotes inbox
            </Link>
          }
        />
        {pendingApprovals.length > 0 ? (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-semibold">
              {pendingApprovals.length} contract
              {pendingApprovals.length === 1 ? "" : "s"} awaiting dual approval
            </p>
            <ul className="mt-2 list-disc pl-5">
              {pendingApprovals.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/contracts/${c.id}`}
                    className="font-medium text-green-900 hover:underline"
                  >
                    {c.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {contracts.length === 0 ? (
          <EmptyState message="No contracts yet. Draft one from a quote in the Quotes inbox." />
        ) : (
          <SimpleContractsTable contracts={contracts} showCustomerColumn />
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
  const extraWork = contracts.flatMap((contract) =>
    ((contract.extra_work_orders ?? []) as {
      id: string;
      contract_id: string;
      title: string;
      status: string;
    }[]).map((order) => ({
      id: order.id,
      contract_id: order.contract_id || contract.id,
      title: order.title,
      status: order.status,
    }))
  );

  const { data: pendingChangeRequests } =
    await fetchPendingContractChangeRequests();

  const directoryContracts = contracts.map((contract) => ({
    id: contract.id,
    title: contract.title,
    status: contract.status,
    season_start: contract.season_start,
    season_end: contract.season_end,
    monthly_fee: contract.monthly_fee != null ? Number(contract.monthly_fee) : null,
    visits_per_week: contract.visits_per_week,
    customerName:
      (contract.customers as { name?: string } | null)?.name ?? "Customer",
  }));

  const pendingChangeApprovals = (
    pendingChangeRequests as {
      id: string;
      contract_id: string;
      customer_id: string | null;
      summary: string | null;
      created_at: string;
      requested_by_role: string;
      proposed_contract: {
        monthly_fee?: number | null;
        season_start?: string;
        season_end?: string;
        title?: string;
      };
      proposed_customer?: { name?: string } | null;
    }[]
  ).map((request) => ({
    id: request.id,
    contract_id: request.contract_id,
    customer_id: request.customer_id,
    summary: request.summary,
    created_at: request.created_at,
    requested_by_role: request.requested_by_role,
    proposed_contract: request.proposed_contract ?? {},
    proposed_customer: request.proposed_customer ?? null,
  }));

  return (
    <AppShell>
      <PageHeader
        kicker="Portfolio"
        title="Contracts"
        description="Completion rates, promise vs actual, company agreements, and pending approvals."
      />

      {pendingApprovals.length > 0 ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">
            {pendingApprovals.length} contract
            {pendingApprovals.length === 1 ? "" : "s"} awaiting dual approval
          </p>
          <ul className="mt-2 list-disc pl-5">
            {pendingApprovals.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/contracts/${c.id}`}
                  className="font-medium text-green-900 hover:underline"
                >
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {contracts.length === 0 ? (
        <EmptyState message="No contracts yet. Run the seed script in Supabase to load demo data." />
      ) : (
        <ManagerContractsDashboard
          progressList={progressList}
          extraWork={extraWork}
          contracts={directoryContracts}
          pendingApprovals={pendingChangeApprovals}
        />
      )}
    </AppShell>
  );
}
