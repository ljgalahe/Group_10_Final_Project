import Link from "next/link";
import { notFound } from "next/navigation";
import { generateInvoice } from "@/app/actions/business";
import { AppShell } from "@/components/AppShell";
import { BillableStatusCard } from "@/components/BillingCards";
import { ContractDetailsForm } from "@/components/ContractDetailsForm";
import { ContractDualApprovalPanel } from "@/components/ContractDualApprovalPanel";
import { ContractInternalControls } from "@/components/ContractInternalControls";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { contractBillableStatus } from "@/lib/billing-status";
import { getContractDisplayStatus } from "@/lib/contract-status";
import { getViewRole } from "@/lib/demo-role";
import {
  fetchAccountantContractBilling,
  fetchContract,
  fetchContractAuditLogs,
  fetchOpenVisitCount,
  fetchPendingContractChangeRequests,
} from "@/lib/queries";
import type { Contract, Customer } from "@/lib/types";

export async function AccountantContractDetail({
  id,
  edit,
  invoiceError,
}: {
  id: string;
  edit?: string;
  invoiceError?: string;
}) {
  const { data: contractRow } = await fetchContract(id);
  if (!contractRow) notFound();

  const role = await getViewRole();
  const customer = contractRow.customers as Customer;
  const contract = contractRow as Contract;
  const services = (contractRow.contract_services ?? []) as {
    id: string;
    service_name: string;
    included: boolean;
  }[];
  const extraWork = (contractRow.extra_work_orders ?? []) as {
    id: string;
    title: string;
    description: string | null;
    quoted_amount: number;
    status: string;
  }[];

  const [openVisitCount, requests, logs, billing] = await Promise.all([
    fetchOpenVisitCount(id),
    fetchPendingContractChangeRequests(),
    fetchContractAuditLogs(id),
    fetchAccountantContractBilling(),
  ]);
  const pendingRequests = requests.data.filter(
    (request) => request.contract_id === id
  );
  const contractVisits = billing.visits.filter(
    (visit) => visit.contract_id === id
  );
  const visitIds = new Set(contractVisits.map((visit) => visit.id));
  const billableStatus = contractBillableStatus({
    visits: contractVisits,
    costs: billing.costs.filter((cost) => visitIds.has(cost.visit_id)),
    hasPendingApproval:
      pendingRequests.length > 0 ||
      extraWork.some((order) => order.status === "quoted"),
  });
  const invoiceBlocked = openVisitCount > 0 || billableStatus !== "billable";

  return (
    <AppShell>
      <PageHeader
        title={contract.title}
        description={`${customer.name} · ${customer.property_type ?? "Commercial property"}`}
        action={
          <div className="flex flex-col items-end gap-1">
            <form action={generateInvoice}>
              <input type="hidden" name="contract_id" value={id} />
              <button
                type="submit"
                disabled={invoiceBlocked}
                title={
                  invoiceBlocked
                    ? "Complete all scheduled visits before invoicing"
                    : undefined
                }
                className="rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Generate Invoice
              </button>
            </form>
            {invoiceBlocked ? (
              <p className="max-w-xs text-right text-xs text-red-700">
                Blocked until {openVisitCount} visit
                {openVisitCount === 1 ? " is" : "s are"} complete
              </p>
            ) : null}
          </div>
        }
      />

      <div className="mb-6">
        <ContractDualApprovalPanel
          contractId={id}
          approvalState={contract.approval_state}
          managerApprovedAt={contract.manager_approved_at}
          accountantApprovedAt={contract.accountant_approved_at}
          role={role}
        />
      </div>

      <div className="mb-6">
        <BillableStatusCard current={billableStatus} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <ContractDetailsForm
            contract={contract}
            customer={customer}
            allowedToEdit
            startEditing={edit === "1"}
          />
          <div className="mt-4 flex justify-center border-t border-stone-100 pt-4">
            <StatusBadge status={getContractDisplayStatus(contract)} />
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-green-950">
            Included Services
          </h2>
          <ul className="mt-4 space-y-2">
            {services.map((service) => (
              <li
                key={service.id}
                className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-sm"
              >
                <span>{service.service_name}</span>
                <span className="text-green-700">
                  {service.included ? "Included" : "Add-on"}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <ContractInternalControls
        contractId={id}
        pendingRequests={pendingRequests}
        auditLogs={logs.data}
        changeOrders={extraWork}
        openVisitCount={openVisitCount}
        invoiceError={invoiceError}
      />

      <div className="mt-6">
        <Link
          href="/contracts"
          className="text-sm text-green-800 hover:underline"
        >
          ← Back to contracts
        </Link>
      </div>
    </AppShell>
  );
}
