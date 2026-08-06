import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ArAgingManagerClient } from "@/components/ArAgingManagerClient";
import { PageHeader } from "@/components/ui";
import { requireAppAccess } from "@/lib/auth-access";
import { getViewRole, roleCanViewReports } from "@/lib/demo-role";
import { fetchArAgingReport, fetchPayments } from "@/lib/queries";
import { ArAgingReport } from "./ArAgingReport";
import { loadAccountantArAgingData } from "./load-ar-aging";

export default async function ArAgingPage({
  searchParams,
}: {
  searchParams: Promise<{
    customer?: string;
    hold?: string;
    approaching?: string;
  }>;
}) {
  await requireAppAccess();

  const role = await getViewRole();
  if (!roleCanViewReports(role)) redirect("/dashboard");
  const params = await searchParams;
  const alertFilter =
    params.hold === "1"
      ? ("hold" as const)
      : params.approaching === "1"
        ? ("approaching" as const)
        : undefined;

  if (role === "accountant") {
    const { asOf, invoices, buckets, customerNames } =
      await loadAccountantArAgingData();

    return (
      <AppShell>
        <PageHeader
          title="AR Aging Report"
          description="Outstanding receivables from Contracts, Invoices, and Payments, grouped by how long they've been past due."
        />
        <ArAgingReport
          buckets={buckets}
          invoices={invoices}
          asOf={asOf}
          customerNames={customerNames}
        />
      </AppShell>
    );
  }

  const [buckets, { data: payments }] = await Promise.all([
    fetchArAgingReport(),
    fetchPayments(),
  ]);

  return (
    <AppShell>
      <PageHeader
        title="AR Aging Report"
        description="Outstanding receivables from Contracts, Invoices, and Payments, grouped by how long they've been past due. Customers with invoices 30+ days overdue are on automatic Service Hold."
      />
      <ArAgingManagerClient
        buckets={buckets}
        payments={payments}
        highlightCustomerId={params.customer}
        alertFilter={alertFilter}
      />
    </AppShell>
  );
}
