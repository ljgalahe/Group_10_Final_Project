import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui";
import { PaymentsManagerClient } from "@/components/PaymentsManagerClient";
import { requireAppAccess } from "@/lib/auth-access";
import { buildCollectionRisk } from "@/lib/collection-risk";
import {
  fetchCustomers,
  fetchInvoices,
  fetchPayments,
  fetchPaymentsSummary,
} from "@/lib/queries";

export default async function PaymentsPage() {
  await requireAppAccess();

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
