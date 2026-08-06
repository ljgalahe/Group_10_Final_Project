import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { approveExtraWork, generateInvoice } from "@/app/actions/business";
import { AccountantContractDetail } from "@/components/AccountantContractDetail";
import { AppShell } from "@/components/AppShell";
import { ContractDualApprovalPanel } from "@/components/ContractDualApprovalPanel";
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
} from "@/lib/contract-status";
import {
  getViewRole,
  roleCanEditContractDetails,
  roleCanManageBilling,
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

  const [{ data: contract }, visitsResult] = await Promise.all([
    fetchContract(id),
    showManagerDashboard
      ? fetchVisits()
      : Promise.resolve({ data: [] as ServiceVisit[] }),
  ]);
  if (!contract) notFound();

  if (role === "customer") {
    if (
      !isContractFullyApproved(
        contract as { approval_state?: string | null }
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

  return (
    <AppShell>
      <PageHeader
        title={contract.title}
        description={`${customer.name} · ${customer.property_type ?? "Commercial property"}`}
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

      <div className="mb-6">
        <ContractDualApprovalPanel
          contractId={id}
          approvalState={
            (contract as { approval_state?: string | null }).approval_state
          }
          managerApprovedAt={
            (contract as { manager_approved_at?: string | null })
              .manager_approved_at
          }
          accountantApprovedAt={
            (contract as { accountant_approved_at?: string | null })
              .accountant_approved_at
          }
          role={role}
        />
      </div>

      <div className="space-y-6">
        {showManagerDashboard && progress ? (
          <>
            <Card>
              <h3 className="text-lg font-semibold text-green-950">
                Contract Completion
              </h3>
              <p className="mt-1 text-sm text-stone-500">
                Percent complete, on-track status, and agreement status for this
                property.
              </p>
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
                Contract Promise vs Actual Work Map
              </h3>
              <p className="mt-1 text-sm text-stone-500">
                What the contract promised, what was scheduled/completed/skipped,
                and extras not included in the agreement.
              </p>
              <ContractPromiseSummary progress={progress} />
              <PromiseVsActualTable rows={progress.rows} />
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-green-950">
                Out-of-Scope Work Watch
              </h3>
              <p className="mt-1 text-sm text-stone-500">
                Detects repeated uncontracted work and offers change-order,
                renewal, or goodwill actions. Filter by company or task.
              </p>
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
                    {service.included ? "Included" : "Add-on"}
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
            ← Back to contracts
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
