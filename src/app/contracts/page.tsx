import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountantContractsView } from "@/components/AccountantContractsView";
import { AppShell } from "@/components/AppShell";
import { ContractsTable } from "@/components/ContractsTable";
import { PageHeader } from "@/components/ui";
import { requireAppAccess } from "@/lib/auth-access";
import { getViewRole, roleCanEditContractDetails } from "@/lib/demo-role";
import {
  fetchAccountantContractBilling,
  fetchContractAuditLogs,
  fetchContractProfitabilityMap,
  fetchContracts,
  fetchContractsDetailed,
  fetchPendingContractApprovals,
  fetchPendingContractChangeRequests,
} from "@/lib/queries";

export default async function ContractsPage() {
  await requireAppAccess();
  const role = await getViewRole();
  if (role === "crew_member") redirect("/dashboard");

  const isAccountant = roleCanEditContractDetails(role);

  if (isAccountant) {
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
          title="Contracts"
          description="Accountant workspace with internal controls for approvals, renewals, and auditability."
          action={
            <Link
              href="/contracts/new"
              className="rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Add Contract
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
    role === "manager"
      ? (await fetchPendingContractApprovals()).data
      : [];

  return (
    <AppShell>
      <PageHeader
        title="Contracts"
        description={
          role === "operations"
            ? "Draft contracts from quotes. Manager and Accountant must both approve before customers see them."
            : "Structured seasonal agreements with service terms, billing rules, and included services."
        }
        action={
          role === "operations" ? (
            <Link
              href="/quotes"
              className="rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Quotes inbox
            </Link>
          ) : undefined
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
      <ContractsTable contracts={contracts} />
    </AppShell>
  );
}
