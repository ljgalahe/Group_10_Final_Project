import { redirect } from "next/navigation";
import { AccountantJournalEntriesView } from "@/components/AccountantJournalEntriesView";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui";
import { requireAppAccess } from "@/lib/auth-access";
import { getViewRole, roleCanEditContractDetails } from "@/lib/demo-role";
import { fetchJournalEntries } from "@/lib/queries";

export default async function JournalEntriesPage() {
  await requireAppAccess();

  const role = await getViewRole();
  if (!roleCanEditContractDetails(role)) redirect("/dashboard");

  const entries = await fetchJournalEntries();

  return (
    <AppShell>
      <PageHeader
        title="Journal Entries"
        description="Create journal entries when a source is ready to post. Edit or delete any entry if something needs to change."
      />
      <AccountantJournalEntriesView
        entries={entries}
        todayIso={new Date().toISOString().slice(0, 10)}
      />
    </AppShell>
  );
}
