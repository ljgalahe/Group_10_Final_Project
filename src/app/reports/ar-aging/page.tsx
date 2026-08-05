import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui";
import { requireAppAccess } from "@/lib/auth-access";
import { getViewRole, roleCanViewReports } from "@/lib/demo-role";
import { ArAgingReport } from "./ArAgingReport";
import { loadAccountantArAgingData } from "./load-ar-aging";
import { ManagerArAgingView } from "./ManagerArAgingView";

export default async function ArAgingPage() {
  await requireAppAccess();

  const role = await getViewRole();
  if (!roleCanViewReports(role)) redirect("/dashboard");

  const { asOf, invoices, buckets, customerNames } =
    await loadAccountantArAgingData();

  return (
    <AppShell>
      <PageHeader
        title="AR Aging Report"
        description="Outstanding receivables from Contracts, Invoices, and Payments, grouped by how long they've been past due."
      />

      {role === "accountant" ? (
        <ArAgingReport
          buckets={buckets}
          invoices={invoices}
          asOf={asOf}
          customerNames={customerNames}
        />
      ) : (
        <ManagerArAgingView buckets={buckets} />
      )}
    </AppShell>
  );
}
