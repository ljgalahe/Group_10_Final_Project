import { redirect } from "next/navigation";
import { AccountantGeneralLedgerView } from "@/components/AccountantGeneralLedgerView";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui";
import { loadAccountingReportData } from "@/app/reports/accounting-data";
import { requireAppAccess } from "@/lib/auth-access";
import { getViewRole, roleCanEditContractDetails } from "@/lib/demo-role";

export default async function GeneralLedgerPage() {
  await requireAppAccess();

  const role = await getViewRole();
  if (!roleCanEditContractDetails(role)) redirect("/dashboard");

  const { entries, chartAccounts } = await loadAccountingReportData();

  return (
    <AppShell>
      <PageHeader
        title="General Ledger"
        description="Trial balance and account registers rolled up from posted journal entries."
      />
      <AccountantGeneralLedgerView
        entries={entries}
        chartAccounts={chartAccounts}
      />
    </AppShell>
  );
}
