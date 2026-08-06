import Link from "next/link";
import { notFound } from "next/navigation";
import { approveExtraWork, declineExtraWork } from "@/app/actions/business";
import { AccountantContractDetail } from "@/components/AccountantContractDetail";
import { AppShell } from "@/components/AppShell";
import { ContractProgressChart } from "@/components/contracts/ContractPromiseUI";
import { ContractPromiseDetailPanel } from "@/components/contracts/ContractPromiseDetailPanel";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { requireAppAccess } from "@/lib/auth-access";
import { buildContractProgress } from "@/lib/contract-controls";
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

  const showOpsDashboard = role === "manager";

  const [{ data: contract }, visitsResult] = await Promise.all([
    fetchContract(id),
    showOpsDashboard
      ? fetchVisits()
      : Promise.resolve({ data: [] as ServiceVisit[] }),
  ]);
  if (!contract) notFound();

  const customer = contract.customers as {
    name: string;
    property_type: string | null;
    address: string | null;
    contact_name: string | null;
  };
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
  const progress = showOpsDashboard
    ? buildContractProgress(contract, contractVisits)
    : null;

  return (
    <AppShell>
      <PageHeader
        title={contract.title}
        description={`${customer.name} · ${customer.property_type ?? "Commercial property"}`}
      />

      <div className="space-y-6">
        {showOpsDashboard && progress ? (
          <>
            <Card>
              <h3 className="text-lg font-semibold text-green-950">
                Contract completion
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
                Contract promise vs actual
              </h3>
              <p className="mt-1 text-sm text-stone-500">
                Review promised vs actual work. Your action is approving extra
                work — operations schedules crews after approval when needed.
              </p>
              <ContractPromiseDetailPanel
                progress={progress}
                extraWork={extraWork}
              />
            </Card>
          </>
        ) : null}

        <Card>
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
            <p className="mt-4 rounded-lg bg-stone-50 p-3 text-sm text-stone-600 whitespace-pre-wrap">
              {contract.notes}
            </p>
          ) : null}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-green-950">
            Extra Work Orders
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Quoted extras for this contract. Approve here or from each extra row
            in promise vs actual above.
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
                      <div className="flex flex-wrap gap-2">
                        <form action={approveExtraWork}>
                          <input
                            type="hidden"
                            name="extra_work_id"
                            value={work.id}
                          />
                          <button
                            type="submit"
                            className="gs-btn-approve rounded-md px-3 py-1 text-xs font-medium"
                          >
                            Approve
                          </button>
                        </form>
                        <form action={declineExtraWork}>
                          <input
                            type="hidden"
                            name="extra_work_id"
                            value={work.id}
                          />
                          <button
                            type="submit"
                            className="rounded-md border border-red-700 px-3 py-1 text-xs font-medium text-red-800 hover:bg-red-50"
                          >
                            Decline
                          </button>
                        </form>
                      </div>
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
