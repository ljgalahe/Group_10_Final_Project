import { fetchChartOfAccounts, fetchJournalEntries } from "@/lib/queries";

export async function loadAccountingReportData() {
  const [entries, chartAccounts] = await Promise.all([
    fetchJournalEntries(),
    fetchChartOfAccounts(),
  ]);
  return { entries, chartAccounts };
}
