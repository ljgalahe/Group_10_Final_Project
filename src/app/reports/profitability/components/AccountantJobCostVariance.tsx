"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StatCard } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import type {
  JobCostContractDetail,
  JobCostVarianceReport,
  JobCostVarianceRow,
} from "@/app/reports/profitability/queries";

function overrunFlag(variancePct: number) {
  if (variancePct >= 25) {
    return {
      label: "Severe overrun",
      className: "bg-red-100 text-red-800",
    };
  }
  if (variancePct >= 10) {
    return {
      label: "Over Quote",
      className: "bg-amber-100 text-amber-900",
    };
  }
  return {
    label: "Slightly over",
    className: "bg-yellow-100 text-yellow-900",
  };
}

const ALL_CUSTOMERS = "__all__";

/** Accountant-only: estimated vs actual job costs — where margin is leaking. */
export function AccountantJobCostVariance({
  report,
}: {
  report: JobCostVarianceReport;
}) {
  const [selected, setSelected] = useState<{
    contractId: string;
    visitId?: string;
  } | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [customerFilter, setCustomerFilter] = useState(ALL_CUSTOMERS);
  const [marginLeakedOpen, setMarginLeakedOpen] = useState(false);

  const customers = useMemo(() => {
    return Array.from(
      new Set(
        report.contractDetails.map((r) => r.customerName).filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [report.contractDetails]);

  const filteredContracts = useMemo(() => {
    if (customerFilter === ALL_CUSTOMERS) return report.contractDetails;
    return report.contractDetails.filter(
      (r) => r.customerName === customerFilter
    );
  }, [report.contractDetails, customerFilter]);

  const filteredOverrun = useMemo(
    () =>
      Math.round(
        filteredContracts.reduce((sum, row) => sum + row.totalOverrun, 0) * 100
      ) / 100,
    [filteredContracts]
  );

  const detail = useMemo(() => {
    if (!selected) return null;
    const contract = report.contractDetails.find(
      (c) => c.contractId === selected.contractId
    );
    if (!contract) return null;
    const focusJob = selected.visitId
      ? (contract.jobs.find((j) => j.visitId === selected.visitId) ??
        contract.jobs[0] ??
        null)
      : (contract.jobs[0] ?? null);
    return { contract, focusJob };
  }, [report.contractDetails, selected]);

  if (report.jobsWithCosts === 0) {
    return (
      <section className="mb-10 space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-green-950">
            Estimated vs. Actual Job Cost
          </h2>
          <p className="text-sm text-stone-500">
            No visit costs logged yet — variance will appear once jobs are
            costed.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-10 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-green-950">
          Estimated vs. Actual Job Cost
        </h2>
        <p className="text-sm text-stone-500">
          Flags contracts that blew past their quote, and by how much — the
          clearest view of where margin is leaking. Click a contract for the
          full breakdown.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Jobs Over Quote"
          value={`${report.jobsOverQuote} / ${report.jobsWithCosts}`}
          hint="Service visits with actual cost above estimate"
        />
        <button
          type="button"
          onClick={() => setMarginLeakedOpen(true)}
          className="rounded-xl border border-stone-200 bg-stone-50 p-5 text-left shadow-sm transition hover:border-red-400 hover:ring-2 hover:ring-red-700/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-700/30"
        >
          <p className="text-sm font-medium text-stone-500">Margin Leaked</p>
          <p className="mt-2 text-3xl font-bold text-red-800">
            {formatCurrency(report.totalOverrun)}
          </p>
          <p className="mt-1 text-xs text-red-800/80">
            Click to see why margin leaked
          </p>
        </button>
      </div>

      {marginLeakedOpen ? (
        <MarginLeakedModal
          report={report}
          onClose={() => setMarginLeakedOpen(false)}
        />
      ) : null}

      {report.contractDetails.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
          No contracts are currently over their quoted estimate.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-stone-100 bg-red-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setListOpen((open) => !open)}
              className="flex min-w-0 flex-1 items-start gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-red-700/30 rounded-md"
              aria-expanded={listOpen}
              aria-controls="worst-overruns-panel"
            >
              <span
                className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-red-200 bg-white text-red-800 transition-transform ${
                  listOpen ? "rotate-90" : ""
                }`}
                aria-hidden="true"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-red-900">
                  Worst overruns — review these first
                </span>
                <span className="mt-0.5 block text-xs text-red-800/80">
                  {listOpen
                    ? "Contracts ranked by total $ over quote. Click a name for job details."
                    : `${filteredContracts.length} contract${filteredContracts.length === 1 ? "" : "s"} · ${formatCurrency(filteredOverrun)} over quote${
                        customerFilter === ALL_CUSTOMERS
                          ? ""
                          : ` · ${customerFilter}`
                      }. Expand to review.`}
                </span>
              </span>
            </button>

            <label className="flex shrink-0 items-center gap-2 text-sm text-red-950">
              <span className="whitespace-nowrap text-xs font-medium text-red-800">
                Customer
              </span>
              <select
                value={customerFilter}
                onChange={(e) => {
                  setCustomerFilter(e.target.value);
                  setListOpen(true);
                }}
                onClick={(e) => e.stopPropagation()}
                className="max-w-[14rem] rounded-md border border-red-200 bg-white px-2 py-1.5 text-sm text-stone-800 shadow-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-700/15"
              >
                <option value={ALL_CUSTOMERS}>All customers</option>
                {customers.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {listOpen ? (
            <div id="worst-overruns-panel">
              {filteredContracts.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-stone-500">
                  No overruns for{" "}
                  {customerFilter === ALL_CUSTOMERS
                    ? "the selected filter"
                    : customerFilter}
                  .
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-stone-50 text-left text-stone-600">
                      <tr>
                        <th className="px-4 py-3 font-medium">Contract</th>
                        <th className="px-4 py-3 font-medium">Customer</th>
                        <th className="px-4 py-3 font-medium">Jobs Over</th>
                        <th className="px-4 py-3 font-medium">Estimated</th>
                        <th className="px-4 py-3 font-medium">Actual</th>
                        <th className="px-4 py-3 font-medium">Over Quote</th>
                        <th className="px-4 py-3 font-medium">Flag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredContracts.map((row) => {
                        const flag = overrunFlag(row.overrunPct);
                        return (
                          <tr
                            key={row.contractId}
                            className="border-t border-stone-100"
                          >
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelected({
                                    contractId: row.contractId,
                                  })
                                }
                                className="text-left font-medium text-green-900 underline decoration-green-700/40 underline-offset-2 hover:text-green-800 hover:decoration-green-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-700/30"
                              >
                                {row.contractTitle}
                              </button>
                            </td>
                            <td className="px-4 py-3">{row.customerName}</td>
                            <td className="px-4 py-3 tabular-nums text-stone-600">
                              {row.jobsOverQuote} / {row.jobsWithCosts}
                            </td>
                            <td className="px-4 py-3">
                              {formatCurrency(row.totalEstimated)}
                            </td>
                            <td className="px-4 py-3">
                              {formatCurrency(row.totalActual)}
                            </td>
                            <td className="px-4 py-3 font-semibold text-red-700">
                              +{formatCurrency(row.totalOverrun)}{" "}
                              <span className="font-medium text-red-600">
                                ({row.overrunPct.toFixed(0)}%)
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${flag.className}`}
                              >
                                {flag.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {detail ? (
        <OverrunDetailModal
          contract={detail.contract}
          focusJob={detail.focusJob}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </section>
  );
}

function MarginLeakedModal({
  report,
  onClose,
}: {
  report: JobCostVarianceReport;
  onClose: () => void;
}) {
  const underEstimate = Math.max(
    0,
    Math.round((report.totalActual - report.totalEstimated - report.totalOverrun) * 100) /
      100
  );
  // When every over-cost job is included, leaked ≈ actual − estimate.
  // residual can appear from rounding; show the clean equation the accountant expects.
  const equationActual = report.totalActual;
  const equationEstimate = report.totalEstimated;
  const equationLeak = report.totalOverrun;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="margin-leaked-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
              Why margin leaked
            </p>
            <h2
              id="margin-leaked-title"
              className="mt-1 text-lg font-semibold text-green-950"
            >
              Margin Leaked
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Dollars spent above the quoted estimate across costed jobs.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-stone-400 hover:bg-stone-50 hover:text-stone-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-6 py-5">
          <div className="rounded-lg border border-red-100 bg-red-50/70 p-4">
            <p className="text-sm leading-relaxed text-stone-700">
              Actual direct costs came in above the quoted estimate. That gap is
              margin leaked — profit that never made it to the bottom line.
            </p>
            <p className="mt-3 text-center text-sm font-medium tabular-nums text-stone-800">
              <span className="text-stone-600">Actual</span>{" "}
              {formatCurrency(equationActual)}
              <span className="mx-1.5 text-stone-400">−</span>
              <span className="text-stone-600">Estimate</span>{" "}
              {formatCurrency(equationEstimate)}
              <span className="mx-1.5 text-stone-400">≈</span>
              <span className="font-semibold text-red-800">
                {formatCurrency(equationLeak)} leaked
              </span>
            </p>
            {underEstimate > 0.05 ? (
              <p className="mt-2 text-center text-xs text-stone-500">
                Note: some jobs finished under estimate; leaked dollars only
                count overruns.
              </p>
            ) : null}
          </div>

          <dl className="grid gap-3 sm:grid-cols-1">
            <LeakDetailItem
              label="Total direct costs (actual)"
              value={formatCurrency(report.totalActual)}
              note="Labor, materials, and equipment on costed visits — same pool as Total Direct Costs."
            />
            <LeakDetailItem
              label="Quoted estimate"
              value={formatCurrency(report.totalEstimated)}
              note="Sum of estimated job costs for those same visits."
            />
            <LeakDetailItem
              label="Margin Leaked"
              value={formatCurrency(report.totalOverrun)}
              note="Dollars over quote across jobs that ran hot."
              emphasize
            />
            <LeakDetailItem
              label="Average overrun"
              value={`${report.avgOverrunPct.toFixed(1)}%`}
              note={`Typical % over quote when a job exceeds estimate (${report.jobsOverQuote} of ${report.jobsWithCosts} jobs).`}
            />
          </dl>

          <div className="flex justify-end border-t border-stone-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeakDetailItem({
  label,
  value,
  note,
  emphasize = false,
}: {
  label: string;
  value: string;
  note: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 ${
        emphasize
          ? "border-red-200 bg-red-50/50"
          : "border-stone-200 bg-stone-50/60"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-sm font-medium text-stone-600">{label}</dt>
        <dd
          className={`text-base font-semibold tabular-nums ${
            emphasize ? "text-red-800" : "text-green-950"
          }`}
        >
          {value}
        </dd>
      </div>
      <p className="mt-1 text-xs text-stone-500">{note}</p>
    </div>
  );
}

function OverrunDetailModal({
  contract,
  focusJob,
  onClose,
}: {
  contract: JobCostContractDetail;
  focusJob: JobCostVarianceRow | null;
  onClose: () => void;
}) {
  const focusFlag = focusJob ? overrunFlag(focusJob.variancePct) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="overrun-detail-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 px-6 py-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-red-700">
              Margin leak detail
            </p>
            <h2
              id="overrun-detail-title"
              className="mt-1 text-lg font-semibold text-green-950"
            >
              {contract.contractTitle}
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              {contract.customerName} · {contract.jobsOverQuote} of{" "}
              {contract.jobsWithCosts} costed jobs over quote
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-stone-400 hover:bg-stone-50 hover:text-stone-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MiniStat
              label="Contract overrun"
              value={`+${formatCurrency(contract.totalOverrun)}`}
              emphasis
            />
            <MiniStat
              label="Actual costs"
              value={formatCurrency(contract.totalActual)}
            />
            <MiniStat
              label="Estimated costs"
              value={formatCurrency(contract.totalEstimated)}
            />
            <MiniStat
              label="Jobs Over Quote"
              value={`${contract.jobsOverQuote}`}
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-green-950">
              Direct Cost Mix (All Costed Jobs)
            </h3>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              <CostTypeCard label="Labor" amount={contract.labor} />
              <CostTypeCard label="Materials" amount={contract.materials} />
              <CostTypeCard label="Equipment" amount={contract.equipment} />
            </div>
          </div>

          {focusJob ? (
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-red-950">
                    Selected job — {formatDate(focusJob.scheduledDate)}
                  </h3>
                  <p className="mt-0.5 text-xs capitalize text-stone-600">
                    Status: {focusJob.status.replace(/_/g, " ")}
                  </p>
                </div>
                {focusFlag ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${focusFlag.className}`}
                  >
                    {focusFlag.label}
                  </span>
                ) : null}
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <MiniStat
                  label="Estimated"
                  value={formatCurrency(focusJob.estimatedCost)}
                />
                <MiniStat
                  label="Actual"
                  value={formatCurrency(focusJob.actualCost)}
                />
                <MiniStat
                  label="Over Quote"
                  value={`+${formatCurrency(focusJob.variance)} (${focusJob.variancePct.toFixed(0)}%)`}
                  emphasis
                />
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3 text-sm">
                <p>
                  <span className="text-stone-500">Labor: </span>
                  <span className="font-medium">
                    {formatCurrency(focusJob.labor)}
                  </span>
                </p>
                <p>
                  <span className="text-stone-500">Materials: </span>
                  <span className="font-medium">
                    {formatCurrency(focusJob.materials)}
                  </span>
                </p>
                <p>
                  <span className="text-stone-500">Equipment: </span>
                  <span className="font-medium">
                    {formatCurrency(focusJob.equipment)}
                  </span>
                </p>
              </div>

              {focusJob.crewNotes?.trim() ? (
                <p className="mt-3 rounded-lg bg-white/80 px-3 py-2 text-sm text-stone-700">
                  <span className="font-medium text-stone-800">Crew notes: </span>
                  {focusJob.crewNotes}
                </p>
              ) : null}
            </div>
          ) : null}

          <div>
            <h3 className="text-sm font-semibold text-green-950">
              All Over-Quote Jobs on This Contract
            </h3>
            <div className="mt-2 overflow-hidden rounded-xl border border-stone-200">
              <table className="min-w-full text-sm">
                <thead className="bg-stone-50 text-left text-stone-600">
                  <tr>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Estimated</th>
                    <th className="px-3 py-2 font-medium">Actual</th>
                    <th className="px-3 py-2 font-medium">Over</th>
                    <th className="px-3 py-2 font-medium">Labor</th>
                    <th className="px-3 py-2 font-medium">Materials</th>
                    <th className="px-3 py-2 font-medium">Equipment</th>
                  </tr>
                </thead>
                <tbody>
                  {contract.jobs.map((job) => {
                    const isFocus = focusJob?.visitId === job.visitId;
                    return (
                      <tr
                        key={job.visitId}
                        className={`border-t border-stone-100 ${
                          isFocus ? "bg-red-50/60" : ""
                        }`}
                      >
                        <td className="px-3 py-2 whitespace-nowrap">
                          {formatDate(job.scheduledDate)}
                        </td>
                        <td className="px-3 py-2">
                          {formatCurrency(job.estimatedCost)}
                        </td>
                        <td className="px-3 py-2">
                          {formatCurrency(job.actualCost)}
                        </td>
                        <td className="px-3 py-2 font-medium text-red-700">
                          +{formatCurrency(job.variance)}
                        </td>
                        <td className="px-3 py-2">
                          {formatCurrency(job.labor)}
                        </td>
                        <td className="px-3 py-2">
                          {formatCurrency(job.materials)}
                        </td>
                        <td className="px-3 py-2">
                          {formatCurrency(job.equipment)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-stone-100 pt-4">
            <Link
              href={`/contracts/${contract.contractId}`}
              className="rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Open contract
            </Link>
            <Link
              href="/visits"
              className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Open visits workspace
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
      <p className="text-xs text-stone-500">{label}</p>
      <p
        className={`mt-0.5 text-sm font-semibold ${
          emphasis ? "text-red-800" : "text-green-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function CostTypeCard({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-3">
      <p className="text-xs font-medium text-stone-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-green-900">
        {formatCurrency(amount)}
      </p>
    </div>
  );
}
