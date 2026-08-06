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
import { buildCustomerServiceHolds } from "@/lib/service-hold";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ risk?: string }>;
}) {
  await requireAppAccess();
  const role = await getViewRole();
  if (role === "crew_member") redirect("/dashboard");
  const isAccountant = role === "accountant";
  const params = await searchParams;
  const highRiskOnly = params.risk === "high";

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
  const serviceHolds = buildCustomerServiceHolds(
    invoices.map((invoice) => ({
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      customer_id: String(invoice.customer_id),
      total: Number(invoice.total),
      amount_paid: Number(invoice.amount_paid),
      status: invoice.status,
      due_date: invoice.due_date,
      customers: invoice.customers
        ? { name: invoice.customers.name }
        : null,
    }))
  );

  return (
    <AppShell>
      <PageHeader
        title="Payments"
        description="Record full and partial invoice payments, track collections, and review payment history. Paying past-due balances automatically releases Service Hold when no invoices remain 30+ days overdue."
      />
      <PaymentsManagerClient
        payments={payments}
        customers={customers}
        summary={summary}
        collectionRisk={collectionRisk}
        serviceHolds={serviceHolds}
        highRiskOnly={highRiskOnly}
      />
    </AppShell>
  );
}
