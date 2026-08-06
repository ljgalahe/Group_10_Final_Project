import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { approveExtraWork, generateInvoice } from "@/app/actions/business";
import {
  declineCustomerContract,
  sendContractToCustomer,
  signCustomerContract,
} from "@/app/actions/customer-contract-sign";
import { AccountantContractDetail } from "@/components/AccountantContractDetail";
import { AppShell } from "@/components/AppShell";
import { CustomerContractSelfService } from "@/components/CustomerContractSelfService";
import {
  ContractProgressChart,
  ContractPromiseSummary,
  PromiseVsActualTable,
} from "@/components/contracts/ContractPromiseUI";
import { OutOfScopeWorkWatch } from "@/components/contracts/OutOfScopeWorkWatch";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { requireAppAccess } from "@/lib/auth-access";
import {
  buildContractProgress,
  buildScopeCreepAlerts,
} from "@/lib/contract-controls";
import {
  getContractDisplayStatus,
  isContractFullyApproved,
  isContractPendingCustomer,
} from "@/lib/contract-status";
import {
  getViewRole,
  roleCanDraftContracts,
  roleCanEditContractDetails,
  roleCanManageBilling,
  roleCanSignContracts,
} from "@/lib/demo-role";
import { formatCurrency, formatDate } from "@/lib/format";
import { fetchContract, fetchVisits } from "@/lib/queries";
import type { ServiceVisit } from "@/lib/types";

export default async function ContractDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    edit?: string;
    invoiceError?: string;
    openVisits?: string;
    sent?: string;
    signed?: string;
    paused?: string;
    inquiry?: string;
    cancelled?: string;
    error?: string;
  }>;
}) {
  const { id } = await params;
  await requireAppAccess();

  const role = await getViewRole();
  if (roleCanEditContractDetails(role)) {
    const query = searchParams ? await searchParams : {};
    return (
      <AccountantContractDetail
        id={id}
        edit={query.edit}
        invoiceError={query.invoiceError}
      />
    );
  }

  const showManagerDashboard = role === "manager";
  const flash = searchParams ? await searchParams : {};

  const [{ data: contract }, visitsResult] = await Promise.all([
    fetchContract(id),
    showManagerDashboard
      ? fetchVisits()
      : Promise.resolve({ data: [] as ServiceVisit[] }),
  ]);
  if (!contract) notFound();

  const approvalState = (contract as { approval_state?: string | null })
    .approval_state;
  const customerSignedAt = (
    contract as { customer_signed_at?: string | null }
  ).customer_signed_at;
  const servicePausedUntil = (
    contract as { service_paused_until?: string | null }
  ).service_paused_until;

  if (role === "customer") {
    if (
      !isContractFullyApproved(
        contract as {
          approval_state?: string | null;
          customer_signed_at?: string | null;
        }
      )
    ) {
      redirect("/contracts");
    }
  }

  const customer = contract.customers as {
    name: string;
    property_type: string | null;
    address: string | null;
    contact_name: string | null;
  };
  const services = (contract.contract_services ?? []) as {
    id: string;
    service_name: string;
    included: boolean;
  }[];
  const extraWork = (contract.extra_work_orders ?? []) as {
    id: string;
    title: string;
    description: string | null;
    quoted_amount: number;
    status: string;
  }[];

  const contractVisits = ((visitsResult.data ?? []) as ServiceVisit[]).filter(
    (v) => v.contract_id === id
  );
  const progress = showManagerDashboard
    ? buildContractProgress(contract, contractVisits)
    : null;
  const scopeAlerts = showManagerDashboard
    ? buildScopeCreepAlerts([contract]).filter((a) => a.contractId === id)
    : [];

  const pendingCustomer = isContractPendingCustomer(
    contract as {
      approval_state?: string | null;
      customer_signed_at?: string | null;
    }
  );
  const opsCanSend =
    roleCanDraftContracts(role) &&
    approvalState === "draft" &&
    !customerSignedAt;
  const customerCanSign = roleCanSignContracts(role) && pendingCustomer;
  const readyToSchedule = roleCanDraftContracts(role) && !!customerSignedAt;
  const customerSelfService =
    role === "customer" &&
    contract.status === "active" &&
    !pendingCustomer;

  return (
    <AppShell>
      <PageHeader
        title={contract.title}
        description={`${customer.name} · ${customer.property_type ?? "Commercial Property"}`}
        action={
          roleCanManageBilling(role) ? (
            <form action={generateInvoice}>
              <input type="hidden" name="contract_id" value={id} />
              <button
                type="submit"
                className="rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Generate Invoice
              </button>
            </form>
          ) : null
        }
      />

      {flash.sent === "1" ? (
        <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          Contract Sent To Customer As Proposed Contract.
        </p>
      ) : null}
      {flash.signed === "1" ? (
        <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          Contract Signed. Ops Can Schedule Service Visits.
        </p>
      ) : null}
      {flash.paused === "1" ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Service Paused For One Month. You Can Extend Pause Again If Needed.
        </p>
      ) : null}
      {flash.inquiry === "1" ? (
        <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          Your Contract Inquiry Was Submitted. We Will Follow Up Soon.
        </p>
      ) : null}
      {flash.cancelled === "1" ? (
        <p className="mb-4 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-800">
          Your Contract Has Been Cancelled.
        </p>
      ) : null}

      {opsCanSend ? (
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-green-950">
            Draft Contract
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Send This Draft To The Customer For Review And Signature. Manager
            Already Approved The Quote.
          </p>
          <form action={sendContractToCustomer} className="mt-4">
            <input type="hidden" name="contract_id" value={id} />
            <button
              type="submit"
              className="rounded-md bg-green-900 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
            >
              Send To Customer
            </button>
          </form>
        </Card>
      ) : null}

      {customerCanSign ? (
        <Card className="mb-6 border-amber-200 bg-amber-50/50">
          <h2 className="text-lg font-semibold text-green-950">
            Proposed Contract
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Status: Needs Review And Signature
          </p>
          <form action={signCustomerContract} className="mt-4 space-y-3">
            <input type="hidden" name="contract_id" value={id} />
            <label className="block text-sm">
              <span className="text-stone-600">Full Name (Signature)</span>
              <input
                name="signature_name"
                required
                className="mt-1 w-full max-w-md rounded-md border border-stone-300 px-3 py-2"
                placeholder="Type Your Full Name"
              />
            </label>
            <button
              type="submit"
              className="rounded-md bg-green-900 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
            >
              Approve &amp; Sign
            </button>
          </form>

          <form
            action={declineCustomerContract}
            className="mt-6 space-y-3 border-t border-amber-200 pt-4"
          >
            <input type="hidden" name="contract_id" value={id} />
            <h3 className="text-sm font-semibold text-green-950">Decline</h3>
            <label className="block text-sm">
              <span className="font-medium text-stone-700">
                Questions Or Concerns
              </span>
              <textarea
                name="decline_notes"
                required
                rows={3}
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
                placeholder="Share Your Questions Or Concerns"
              />
            </label>
            <button
              type="submit"
              className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-50"
            >
              Decline Proposed Contract
            </button>
          </form>
        </Card>
      ) : null}

      {customerSelfService ? (
        <CustomerContractSelfService
          contractId={id}
          servicePausedUntil={servicePausedUntil}
          isActive={contract.status === "active"}
        />
      ) : null}

      {customerSignedAt ? (
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-green-950">
            Customer Signature
          </h2>
          <p className="mt-2 text-sm text-stone-700">
            Signed By{" "}
            <span className="font-medium">
              {(contract as { customer_signature_name?: string | null })
                .customer_signature_name ?? "Customer"}
            </span>{" "}
            On {formatDate(customerSignedAt.slice(0, 10))}
          </p>
          {readyToSchedule ? (
            <Link
              href={`/schedule?contract_id=${id}`}
              className="mt-4 inline-block rounded-md bg-green-900 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
            >
              Schedule Service Visits
            </Link>
          ) : null}
        </Card>
      ) : null}

      <div className="space-y-6">
        {showManagerDashboard && progress ? (
          <>
            <Card>
              <h3 className="text-lg font-semibold text-green-950">
                Contract Completion
              </h3>
              <div className="mt-6">
                <ContractProgressChart
                  percentComplete={progress.percentComplete}
                  trackStatus={progress.trackStatus}
                  contractStatus={progress.contractStatus}
                  seasonElapsedPct={progress.seasonElapsedPct}
                  completedVisits={progress.completedVisits}
                  promisedVisits={progress.promisedVisits}
                />
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-green-950">
                Contract Promise Vs Actual Work Map
              </h3>
              <ContractPromiseSummary progress={progress} />
              <PromiseVsActualTable rows={progress.rows} />
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-green-950">
                Out-Of-Scope Work Watch
              </h3>
              <OutOfScopeWorkWatch alerts={scopeAlerts} />
            </Card>
          </>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="text-lg font-semibold text-green-950">
              Contract Terms
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-stone-500">Status</dt>
                <dd>
                  <StatusBadge status={getContractDisplayStatus(contract)} />
                </dd>
              </div>
              {servicePausedUntil ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-stone-500">Service Paused Until</dt>
                  <dd>{formatDate(servicePausedUntil)}</dd>
                </div>
              ) : null}
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
                <dd>{contract.visits_per_week} Visits Per Week</dd>
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
              <p className="mt-4 rounded-lg bg-stone-50 p-3 text-sm text-stone-600 whitespace-pre-wrap">
                {contract.notes}
              </p>
            ) : null}
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
                    {service.included ? "Included" : "Add-On"}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card>
          <h2 className="text-lg font-semibold text-green-950">
            Extra Work Orders
          </h2>
          {extraWork.length === 0 ? (
            <p className="mt-4 text-sm text-stone-500">
              No Extra Work On This Contract.
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
                    {roleCanManageBilling(role) && work.status === "quoted" && (
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

        <div>
          <Link
            href="/contracts"
            className="text-sm text-green-800 hover:underline"
          >
            ← Back To Contracts
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
