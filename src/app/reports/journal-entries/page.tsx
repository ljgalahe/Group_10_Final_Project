import { redirect } from "next/navigation";
import {
  backfillDepreciationJournals,
  ensureReadyVisitJournalsPosted,
  postAllReadyJournalEntries,
} from "@/app/actions/journal";
import { AccountantJournalEntriesView } from "@/components/AccountantJournalEntriesView";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui";
import { loadAccountingReportData } from "@/app/reports/accounting-data";
import { requireAppAccess } from "@/lib/auth-access";
import { getViewRole, roleCanEditContractDetails } from "@/lib/demo-role";

export default async function JournalEntriesPage() {
  await requireAppAccess();

  const role = await getViewRole();
  if (!roleCanEditContractDetails(role)) redirect("/dashboard");

  await backfillDepreciationJournals();
  await postAllReadyJournalEntries();
  await ensureReadyVisitJournalsPosted();
  const { entries, chartAccounts } = await loadAccountingReportData();

  return (
    <AppShell>
      <PageHeader
        title="Journal Entries"
        description="Create journal entries when a source is ready to post. Edit or delete any entry if something needs to change."
      />
      <AccountantJournalEntriesView
        entries={entries}
        chartAccounts={chartAccounts}
        todayIso={new Date().toISOString().slice(0, 10)}
      />
    </AppShell>
  );
}
