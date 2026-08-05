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

  return (
    <AppShell>
      <PageHeader
        title="Contracts"
        description="Structured seasonal agreements with service terms, billing rules, and included services."
      />
      <ContractsTable contracts={contracts} />
    </AppShell>
  );
}
