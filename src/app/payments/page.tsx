import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PaymentsManagerClient } from "@/components/PaymentsManagerClient";
import { PageHeader } from "@/components/ui";
import { requireAppAccess } from "@/lib/auth-access";
import { buildCollectionRisk } from "@/lib/collection-risk";
import { getViewRole } from "@/lib/demo-role";
import {
  fetchCustomers,
  fetchInvoices,
  fetchPayments,
  fetchPaymentsSummary,
} from "@/lib/queries";
export default async function PaymentsPage() {
  await requireAppAccess();
  const role = await getViewRole();
  if (role === "crew_member") redirect("/dashboard");
  const isAccountant = role === "accountant";

  if (isAccountant) {
    redirect("/invoices");
  }

  const [
    { data: payments },
    { data: customers },
    summary,
    { data: invoices },
  ] = await Promise.all([
    fetchPayments(),
    fetchCustomers(),
    fetchPaymentsSummary(),
    fetchInvoices(),
  ]);

  const collectionRisk = buildCollectionRisk(invoices, payments);

  return (
    <AppShell>
      <PageHeader
        title="Payments"
        description="Record full and partial invoice payments, track collections, and review payment history."
      />
      <PaymentsManagerClient
        payments={payments}
        customers={customers}
        summary={summary}
        collectionRisk={collectionRisk}
      />
    </AppShell>
  );
}
