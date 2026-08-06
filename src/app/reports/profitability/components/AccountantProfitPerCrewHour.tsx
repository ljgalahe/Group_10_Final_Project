"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/format";
import type {
  ProfitPerCrewHourJob,
  ProfitPerCrewHourReport,
  ProfitPerCrewHourServiceLine,
} from "@/app/reports/profitability/queries";

function formatPerHour(value: number) {
  const abs = formatCurrency(Math.abs(value));
  return value < 0 ? `−${abs}/hr` : `${abs}/hr`;
}

/** Good ≥ $15.50; Needs attention $13.00–$15.49; Weak below $13.00. */
function healthForAvg(avg: number): { label: string; className: string } {
  if (avg >= 15.5) {
    return {
      label: "Good Crew Yield",
      className: "bg-green-100 text-green-800",
    };
  }
  if (avg >= 13) {
    return {
      label: "Needs Attention",
      className: "bg-yellow-100 text-yellow-900",
    };
  }
  return { label: "Weak Crew Yield", className: "bg-red-100 text-red-800" };
}

function summaryForLine(
  row: ProfitPerCrewHourServiceLine,
  jobs: ProfitPerCrewHourJob[]
): string {
  const best = jobs[0];
  const worst = jobs[jobs.length - 1];
  const bestBit = best
    ? ` Best job: ${best.contractTitle} at ${formatPerHour(best.profitPerCrewHour)}.`
    : "";
  const worstBit =
    worst && worst.visitId !== best?.visitId
      ? ` Weakest: ${worst.contractTitle} at ${formatPerHour(worst.profitPerCrewHour)}.`
      : "";

  if (row.avgProfitPerCrewHour >= 15.5) {
    return `${row.serviceName} averages ${formatPerHour(row.avgProfitPerCrewHour)} across ${row.jobCount} job${row.jobCount === 1 ? "" : "s"} — crew time is converting well into margin.${bestBit}${worstBit}`;
  }
  if (row.avgProfitPerCrewHour >= 13) {
    return `${row.serviceName} is soft at ${formatPerHour(row.avgProfitPerCrewHour)} average. Review labor mix and materials on lower-ranked jobs before renewal.${bestBit}${worstBit}`;
  }
  if (row.avgProfitPerCrewHour >= 0) {
    return `${row.serviceName} barely clears direct costs per crew-hour (${formatPerHour(row.avgProfitPerCrewHour)}). This is a primary productivity leak candidate.${bestBit}${worstBit}`;
  }
  return `${row.serviceName} is underwater at ${formatPerHour(row.avgProfitPerCrewHour)} — direct costs exceed allocated revenue per hour worked.${bestBit}${worstBit}`;
}

/** Accountant-only: profit per crew-hour by service line, with job drill-down popup. */
export function AccountantProfitPerCrewHour({
  report,
}: {
  report: ProfitPerCrewHourReport;
}) {
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const maxAbs = useMemo(() => {
    return Math.max(
      ...report.serviceLines.map((row) => Math.abs(row.avgProfitPerCrewHour)),
      1
    );
  }, [report.serviceLines]);

  const selectedRow =
    report.serviceLines.find((r) => r.serviceName === selectedService) ?? null;

  const filteredJobs = useMemo(() => {
    if (!selectedService) return [];
    return report.jobs
      .filter((job) =>
        job.serviceNames.some(
          (name) => name.toLowerCase() === selectedService.toLowerCase()
        )
      )
      .sort((a, b) => b.profitPerCrewHour - a.profitPerCrewHour);
  }, [report.jobs, selectedService]);

  useEffect(() => {
    if (
      selectedService &&
      !report.serviceLines.some((r) => r.serviceName === selectedService)
    ) {
      setSelectedService(null);
    }
  }, [report.serviceLines, selectedService]);

  useEffect(() => {
    if (!selectedService) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedService(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedService]);

  if (report.jobs.length === 0) {
    return (
      <section className="mb-10 space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-green-950">
            Profit per Crew-Hour
          </h2>
          <p className="text-sm text-stone-500">
            No jobs with billed labor hours yet — this view appears once crew
            hours are logged on visits.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-10 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-green-950">
            Profit per Crew-Hour
          </h2>
          <p className="text-sm text-stone-500">
            (Revenue − labor − materials − equipment) ÷ labor hours, averaged by
            service line. Click a bar to open job details for that line.
          </p>
        </div>
        <p className="text-sm text-stone-600">
          Overall avg{" "}
          <span className="font-semibold text-green-950">
            {formatPerHour(report.overallAvg)}
          </span>
          <span className="text-stone-400"> · </span>
          {report.jobs.length} jobs
        </p>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
        <ul className="space-y-3" role="list">
          {report.serviceLines.map((row) => {
            const isSelected = row.serviceName === selectedService;
            const widthPct = Math.min(
              100,
              (Math.abs(row.avgProfitPerCrewHour) / maxAbs) * 100
            );
            const positive = row.avgProfitPerCrewHour >= 0;

            return (
              <li key={row.serviceName}>
                <button
                  type="button"
                  onClick={() => setSelectedService(row.serviceName)}
                  aria-haspopup="dialog"
                  className={`group w-full rounded-lg border px-3 py-2.5 text-left transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 ${
                    isSelected
                      ? "border-green-700 bg-green-50 shadow-sm ring-2 ring-green-700/20"
                      : "border-transparent hover:border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <span className="font-medium text-green-950">
                      {row.serviceName}
                    </span>
                    <span
                      className={`shrink-0 text-sm font-semibold tabular-nums ${
                        positive ? "text-green-800" : "text-red-700"
                      }`}
                    >
                      {formatPerHour(row.avgProfitPerCrewHour)}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className={`h-full rounded-full transition-[width] duration-300 ${
                        isSelected
                          ? positive
                            ? "bg-green-800"
                            : "bg-red-600"
                          : positive
                            ? "bg-green-600 group-hover:bg-green-700"
                            : "bg-red-500 group-hover:bg-red-600"
                      }`}
                      style={{ width: `${Math.max(widthPct, 4)}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-stone-500">
                    {row.jobCount} job{row.jobCount === 1 ? "" : "s"}
                    <span className="text-stone-300"> · </span>
                    {row.totalHours.toFixed(1)} hrs
                    <span className="text-stone-300"> · </span>
                    {formatCurrency(row.totalProfit)} profit
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {selectedRow ? (
        <ServiceLineDetailModal
          row={selectedRow}
          jobs={filteredJobs}
          onClose={() => setSelectedService(null)}
        />
      ) : null}
    </section>
  );
}

function ServiceLineDetailModal({
  row,
  jobs,
  onClose,
}: {
  row: ProfitPerCrewHourServiceLine;
  jobs: ProfitPerCrewHourJob[];
  onClose: () => void;
}) {
  const status = healthForAvg(row.avgProfitPerCrewHour);
  const summary = summaryForLine(row, jobs);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ppc-detail-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Profit per Crew-Hour
            </p>
            <h3
              id="ppc-detail-title"
              className="mt-1 text-lg font-semibold text-green-950"
            >
              {row.serviceName}
            </h3>
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
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-green-950">
              Accountant Summary
            </h4>
            <div className="rounded-lg border border-stone-200 bg-stone-50/80 p-4">
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.className}`}
              >
                {status.label}
              </span>
              <p className="mt-3 text-sm leading-relaxed text-stone-700">
                {summary}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-green-950">Line Totals</h4>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <DetailItem
                label="Avg $/crew-hr"
                value={formatPerHour(row.avgProfitPerCrewHour)}
                emphasize={
                  row.avgProfitPerCrewHour >= 15.5
                    ? "positive"
                    : row.avgProfitPerCrewHour < 13
                      ? "negative"
                      : "neutral"
                }
              />
              <DetailItem label="Jobs" value={String(row.jobCount)} />
              <DetailItem
                label="Total labor hours"
                value={row.totalHours.toFixed(1)}
              />
              <DetailItem
                label="Total profit"
                value={formatCurrency(row.totalProfit)}
                emphasize={row.totalProfit >= 0 ? "positive" : "negative"}
              />
            </dl>
          </div>

          <div className="space-y-2">
            <div>
              <h4 className="text-sm font-semibold text-green-950">
                Jobs on This Line
              </h4>
              <p className="text-xs text-stone-500">
                Sorted by profit per crew-hour, highest to lowest — best and
                worst jobs are easy to spot.
              </p>
            </div>
            {jobs.length === 0 ? (
              <p className="rounded-lg border border-dashed border-stone-200 px-4 py-8 text-center text-sm text-stone-500">
                No jobs in this service line.
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-stone-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-stone-50 text-left text-stone-600">
                      <tr>
                        <th className="px-3 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium">Contract</th>
                        <th className="px-3 py-2 font-medium">Customer</th>
                        <th className="px-3 py-2 font-medium">Hours</th>
                        <th className="px-3 py-2 font-medium">Revenue</th>
                        <th className="px-3 py-2 font-medium">Labor</th>
                        <th className="px-3 py-2 font-medium">Materials</th>
                        <th className="px-3 py-2 font-medium">Equipment</th>
                        <th className="px-3 py-2 font-medium">Profit</th>
                        <th className="px-3 py-2 font-medium">$/crew-hr</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map((job) => (
                        <tr
                          key={job.visitId}
                          className="border-t border-stone-100"
                        >
                          <td className="whitespace-nowrap px-3 py-2 text-stone-600">
                            {formatDate(job.scheduledDate)}
                          </td>
                          <td className="px-3 py-2 font-medium">
                            {job.contractTitle}
                          </td>
                          <td className="px-3 py-2">
                            {job.customerName || "—"}
                          </td>
                          <td className="px-3 py-2 tabular-nums">
                            {job.laborHours.toFixed(1)}
                          </td>
                          <td className="px-3 py-2 tabular-nums">
                            {formatCurrency(job.revenue)}
                          </td>
                          <td className="px-3 py-2 tabular-nums text-stone-600">
                            {formatCurrency(job.laborCost)}
                          </td>
                          <td className="px-3 py-2 tabular-nums text-stone-600">
                            {formatCurrency(job.materialsCost)}
                          </td>
                          <td className="px-3 py-2 tabular-nums text-stone-600">
                            {formatCurrency(job.equipmentCost)}
                          </td>
                          <td
                            className={`px-3 py-2 font-medium tabular-nums ${
                              job.profit >= 0
                                ? "text-green-800"
                                : "text-red-700"
                            }`}
                          >
                            {formatCurrency(job.profit)}
                          </td>
                          <td
                            className={`px-3 py-2 font-semibold tabular-nums ${
                              job.profitPerCrewHour >= 0
                                ? "text-green-800"
                                : "text-red-700"
                            }`}
                          >
                            {formatPerHour(job.profitPerCrewHour)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

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

function DetailItem({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: "positive" | "negative" | "neutral";
}) {
  const valueClass =
    emphasize === "positive"
      ? "text-green-800"
      : emphasize === "negative"
        ? "text-red-700"
        : "text-green-950";

  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2.5">
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className={`mt-0.5 text-sm font-semibold tabular-nums ${valueClass}`}>
        {value}
      </dd>
    </div>
  );
}
