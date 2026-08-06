import Link from "next/link";
import { AccountantContractsView } from "@/components/AccountantContractsView";
import { AppShell } from "@/components/AppShell";
import { ContractCompletionChart } from "@/components/contracts/ContractCompletionChart";
import { OutOfScopeWorkWatch } from "@/components/contracts/OutOfScopeWorkWatch";
import { PromiseVsActualMap } from "@/components/contracts/PromiseVsActualMap";
import { DraftContractsSection } from "@/components/DraftContractsSection";
import { ProposedContractSection } from "@/components/ProposedContractSection";
import { QuotesPendingApprovalSection } from "@/components/QuotesPendingApprovalSection";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { requireAppAccess } from "@/lib/auth-access";
import {
  buildContractProgress,
  buildScopeCreepAlerts,
} from "@/lib/contract-controls";
import { getContractDisplayStatus } from "@/lib/contract-status";
import { getViewRole, roleCanEditContractDetails } from "@/lib/demo-role";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  fetchAccountantContractBilling,
  fetchApprovedQuotesForDraft,
  fetchContractAuditLogs,
  fetchContractProfitabilityMap,
  fetchContracts,
  fetchContractsDetailed,
  fetchPendingContractChangeRequests,
  fetchProposedContractsForCustomer,
  fetchQuotesPendingApproval,
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
                <StatusBadge status={getContractDisplayStatus(contract)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function ContractsPage({
  searchParams,
}: {
  searchParams?: Promise<{ declined?: string }>;
}) {
  await requireAppAccess();

  const flash = searchParams ? await searchParams : {};
  const role = await getViewRole();

  if (roleCanEditContractDetails(role)) {
    const [
      { data: contracts },
      profitMap,
      { data: pendingRequests },
      { data: auditLogs },
      billing,
    ] = await Promise.all([
      fetchContractsDetailed(),
      fetchContractProfitabilityMap(),
      fetchPendingContractChangeRequests(),
      fetchContractAuditLogs(),
      fetchAccountantContractBilling(),
    ]);
    const unprofitableIds = [...profitMap.entries()]
      .filter(([, info]) => info.unprofitable)
      .map(([id]) => id);

    return (
      <AppShell>
        <PageHeader
          title="Contracts"
          description="Manage Billing, Renewals, And Audit Controls."
        />
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

  if (role === "customer" || role === "crew_lead" || role === "crew_member") {
    const isCustomer = role === "customer";
    const proposed = isCustomer
      ? (await fetchProposedContractsForCustomer()).data
      : [];
    const activeList = isCustomer
      ? contracts.filter(
          (c) =>
            (c as { approval_state?: string | null }).approval_state !==
              "pending_customer" ||
            (c as { customer_signed_at?: string | null }).customer_signed_at
        )
      : contracts;

    return (
      <AppShell>
        <PageHeader
          title="Contracts"
          description={
            isCustomer
              ? "Review Proposed Contracts And Your Signed Agreements."
              : "Structured Seasonal Agreements With Service Terms And Billing Rules."
          }
        />

        {isCustomer && flash.declined === "1" ? (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Proposed Contract Declined. Ops Will Review Your Questions Or
            Concerns.
          </p>
        ) : null}

        {isCustomer ? <ProposedContractSection contracts={proposed} /> : null}

        {activeList.length === 0 && (!isCustomer || proposed.length === 0) ? (
          <EmptyState
            message={
              isCustomer
                ? "No Contracts On File For This Property."
                : "No Contracts Yet."
            }
          />
        ) : activeList.length > 0 ? (
          <SimpleContractsTable
            contracts={activeList}
            showCustomerColumn={!isCustomer}
          />
        ) : null}
      </AppShell>
    );
  }

  if (role === "operations") {
    const { data: approvedQuotes } = await fetchApprovedQuotesForDraft();
    return (
      <AppShell>
        <PageHeader
          title="Contracts"
          description="Create Draft Contracts From Approved Quotes, Then Send To The Customer For Signature."
          action={
            <Link
              href="/quotes"
              className="rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Quotes Inbox
            </Link>
          }
        />
        <DraftContractsSection quotes={approvedQuotes} />
        {contracts.length === 0 ? (
          <EmptyState message="No Contracts Yet. Create One From An Approved Quote Above." />
        ) : (
          <SimpleContractsTable contracts={contracts} showCustomerColumn />
        )}
      </AppShell>
    );
  }

  const [{ data: pendingQuotes }, { data: visits }] = await Promise.all([
    fetchQuotesPendingApproval(),
    fetchVisits(),
  ]);

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
        description="Approve Ops Quotes, Then Track Completion And Promise Vs Actual Work."
      />

      <QuotesPendingApprovalSection quotes={pendingQuotes} />

      {contracts.length === 0 ? (
        <EmptyState message="No Contracts Yet." />
      ) : (
        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-semibold text-green-950">
              Contract Completion
            </h3>
            <p className="mt-1 text-sm text-stone-500">
              Percent Complete, On-Track Status, And Contract Status.
            </p>
            <div className="mt-4">
              <ContractCompletionChart progressList={progressList} />
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-green-950">
              Contract Promise Vs Actual
            </h3>
            <p className="mt-1 text-sm text-stone-500">
              Job, Contracted Visits, Completed Visits, And Status.
            </p>
            <PromiseVsActualMap progressList={progressList} />
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-green-950">
              Out-Of-Scope Work Watch
            </h3>
            <p className="mt-1 text-sm text-stone-500">
              Filter By Company Or Task.
            </p>
            <OutOfScopeWorkWatch alerts={outOfScopeAlerts} />
          </Card>
        </div>
      )}
    </AppShell>
  );
}
