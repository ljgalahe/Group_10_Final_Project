import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ArAgingManagerClient } from "@/components/ArAgingManagerClient";
import { PageHeader } from "@/components/ui";
import { requireAppAccess } from "@/lib/auth-access";
import { getViewRole, roleCanViewReports } from "@/lib/demo-role";
import { fetchArAgingReport, fetchPayments } from "@/lib/queries";

export default async function ArAgingPage() {
  await requireAppAccess();

  const role = await getViewRole();
  if (!roleCanViewReports(role)) redirect("/dashboard");

  const [buckets, { data: payments }] = await Promise.all([
    fetchArAgingReport(),
    fetchPayments(),
  ]);

  return (
    <AppShell>
      <PageHeader
        title="AR Aging Report"
        description="Outstanding receivables grouped by how long they've been past due."
      />
      <ArAgingManagerClient buckets={buckets} payments={payments} />
    </AppShell>
  );
}
