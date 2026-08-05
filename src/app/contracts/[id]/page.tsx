import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { approveExtraWork, generateInvoice } from "@/app/actions/business";
import { AppShell } from "@/components/AppShell";
import { ContractDetailsForm } from "@/components/ContractDetailsForm";
import { ContractDualApprovalPanel } from "@/components/ContractDualApprovalPanel";
import { ContractInternalControls } from "@/components/ContractInternalControls";
import { BillableStatusCard } from "@/components/BillingCards";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { contractBillableStatus } from "@/lib/billing-status";
import {
  getViewRole,
  roleCanEditContractDetails,
  roleCanManageBilling,
} from "@/lib/demo-role";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  fetchAccountantContractBilling,
  fetchContract,
  fetchContractAuditLogs,
  fetchOpenVisitCount,
  fetchPendingContractChangeRequests,
} from "@/lib/queries";
import { requireAppAccess } from "@/lib/auth-access";
import type { Contract, Customer } from "@/lib/types";

export default async function ContractDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    edit?: string;
    invoiceError?: string;
    openVisits?: string;
  }>;
}) {
  const { id } = await params;
  const { edit, invoiceError } = await searchParams;
  await requireAppAccess();

  const role = await getViewRole();
  if (role === "crew_member") redirect("/dashboard");
  const { data: contractRow } = await fetchContract(id);
  if (!contractRow) notFound();

  const customer = contractRow.customers as Customer;
  const contract = contractRow as Contract;

  if (role === "customer") {
    const state = contract.approval_state;
    if (state && state !== "approved") {
      redirect("/contracts");
    }
  }
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
  const canManageBilling = roleCanManageBilling(role);
  const canEditDetails = roleCanEditContractDetails(role);
  const startEditing = canEditDetails && edit === "1";

  let openVisitCount = 0;
  let pendingRequests: Awaited<
    ReturnType<typeof fetchPendingContractChangeRequests>
  >["data"] = [];
  let auditLogs: Awaited<ReturnType<typeof fetchContractAuditLogs>>["data"] =
    [];
  let billableStatus: ReturnType<typeof contractBillableStatus> | null = null;

  if (canEditDetails) {
    const [visits, requests, logs, billing] = await Promise.all([
      fetchOpenVisitCount(id),
      fetchPendingContractChangeRequests(),
      fetchContractAuditLogs(id),
      fetchAccountantContractBilling(),
    ]);
    openVisitCount = visits;
    pendingRequests = requests.data.filter((request) => request.contract_id === id);
    auditLogs = logs.data;
    const contractVisits = billing.visits.filter(
      (visit) => visit.contract_id === id
    );
    const visitIds = new Set(contractVisits.map((visit) => visit.id));
    billableStatus = contractBillableStatus({
      visits: contractVisits,
      costs: billing.costs.filter((cost) => visitIds.has(cost.visit_id)),
      hasPendingApproval:
        pendingRequests.length > 0 ||
        extraWork.some((order) => order.status === "quoted"),
    });
  }

  const invoiceBlocked =
    canEditDetails &&
    (openVisitCount > 0 || billableStatus !== "billable");

  return (
    <AppShell>
      <PageHeader
        title={contract.title}
        description={`${customer.name} · ${customer.property_type ?? "Commercial property"}`}
        action={
          canManageBilling ? (
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
          ) : null
        }
      />

      {billableStatus ? (
        <div className="mb-6">
          <BillableStatusCard current={billableStatus} />
        </div>
      ) : null}

      <div className="mb-6">
        <ContractDualApprovalPanel
          contractId={id}
          approvalState={contract.approval_state}
          managerApprovedAt={contract.manager_approved_at}
          accountantApprovedAt={contract.accountant_approved_at}
          role={role}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          {canEditDetails ? (
            <>
              <ContractDetailsForm
                contract={contract}
                customer={customer}
                allowedToEdit
                startEditing={startEditing}
              />
              <div className="mt-4 flex justify-center border-t border-stone-100 pt-4">
                <StatusBadge status={contract.status} />
              </div>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-green-950">
                Contract Terms
              </h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-stone-500">Status</dt>
                  <dd>
                    <StatusBadge status={contract.status} />
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-stone-500">Season</dt>
                  <dd>
                    {formatDate(contract.season_start)} –{" "}
                    {formatDate(contract.season_end)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-stone-500">Monthly Fee</dt>
                  <dd>{formatCurrency(Number(contract.monthly_fee ?? 0))}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-stone-500">Visit Frequency</dt>
                  <dd>{contract.visits_per_week} visits per week</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-stone-500">Billing Method</dt>
                  <dd className="capitalize">
                    {contract.billing_method.replace("_", " ")}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-stone-500">Property Address</dt>
                  <dd className="text-right">{customer.address ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-stone-500">Contact</dt>
                  <dd>{customer.contact_name ?? "—"}</dd>
                </div>
              </dl>
              {contract.notes ? (
                <p className="mt-4 rounded-lg bg-stone-50 p-3 text-sm text-stone-600">
                  {contract.notes}
                </p>
              ) : null}
            </>
          )}
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

      {canEditDetails ? (
        <ContractInternalControls
          contractId={id}
          pendingRequests={pendingRequests}
          auditLogs={auditLogs}
          changeOrders={extraWork}
          openVisitCount={openVisitCount}
          invoiceError={invoiceError}
        />
      ) : (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-green-950">
            Extra Work Orders
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Work requested outside the original agreement — quoted, approved,
            then billed separately.
          </p>
          {extraWork.length === 0 ? (
            <p className="mt-4 text-sm text-stone-500">
              No extra work on this contract.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {extraWork.map((work) => (
                <div
                  key={work.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 p-4"
                >
                  <div>
                    <p className="font-medium text-stone-800">{work.title}</p>
                    <p className="text-sm text-stone-500">{work.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-green-900">
                      {formatCurrency(Number(work.quoted_amount))}
                    </span>
                    <StatusBadge status={work.status} />
                    {canManageBilling && work.status === "quoted" && (
                      <form action={approveExtraWork}>
                        <input
                          type="hidden"
                          name="extra_work_id"
                          value={work.id}
                        />
                        <button
                          type="submit"
                          className="rounded-md bg-green-800 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                        >
                          Approve
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

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
