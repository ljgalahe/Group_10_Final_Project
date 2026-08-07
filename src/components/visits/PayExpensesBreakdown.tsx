"use client";

import { useMemo, useState } from "react";
import { VisitJobDetail } from "@/components/visits/VisitJobDetail";
import { formatCurrency, formatDate } from "@/lib/format";
import type { JobRow } from "@/lib/visit-jobs";

type BreakdownMode = "company" | "job" | "date";

function modeAllLabel(mode: BreakdownMode) {
  if (mode === "company") return "All customers";
  if (mode === "job") return "All jobs";
  return "All dates";
}

function modeNameLabel(mode: BreakdownMode) {
  if (mode === "company") return "Customer name";
  if (mode === "job") return "Job name";
  return "Date";
}

function groupKey(job: JobRow, mode: BreakdownMode) {
  if (mode === "company") return job.companyName;
  if (mode === "job") return job.jobLabel;
  return job.date;
}

function displayKey(key: string, mode: BreakdownMode) {
  return mode === "date" ? formatDate(key) : key;
}

function totalsFor(jobs: JobRow[]) {
  const crewPay = jobs.reduce((s, j) => s + j.crewPay, 0);
  const costs = jobs.reduce((s, j) => s + j.costTotal, 0);
  return {
    crewPay,
    costs,
    total: crewPay + costs,
    count: jobs.length,
  };
}

function VisitRows({
  jobs,
  mode,
  openJobId,
  onToggleJob,
}: {
  jobs: JobRow[];
  mode: BreakdownMode;
  openJobId: string | null;
  onToggleJob: (visitId: string) => void;
}) {
  return (
    <div className="space-y-2">
      {jobs.map((job) => {
        const open = openJobId === job.visitId;
        const jobTotal = job.crewPay + job.costTotal;

        const title =
          mode === "company"
            ? job.jobLabel
            : mode === "job"
              ? job.companyName
              : `${job.companyName} · ${job.jobLabel}`;

        return (
          <div key={job.visitId} className="space-y-2">
            <button
              type="button"
              onClick={() => onToggleJob(job.visitId)}
              className={`w-full rounded-lg border p-3 text-left transition ${
                open
                  ? "border-green-800 bg-green-50"
                  : "border-stone-200 bg-white hover:border-green-700"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-stone-900">{title}</p>
                  <p className="mt-0.5 text-sm text-stone-500">
                    {formatDate(job.date)}
                    {mode === "date" ? null : ` · ${job.status}`}
                    {job.proof ? " · Photos on file" : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-900">
                    {formatCurrency(jobTotal)}
                  </p>
                  <p className="text-xs font-medium text-green-800">
                    {open ? "Hide" : "Details"}
                  </p>
                </div>
              </div>
            </button>

            {open ? <VisitJobDetail job={job} /> : null}
          </div>
        );
      })}
    </div>
  );
}

export function PayExpensesBreakdown({ jobs }: { jobs: JobRow[] }) {
  const [mode, setMode] = useState<BreakdownMode>("company");
  const [selectedName, setSelectedName] = useState("all");
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [openJobId, setOpenJobId] = useState<string | null>(null);

  const nameOptions = useMemo(() => {
    const keys = [...new Set(jobs.map((j) => groupKey(j, mode)))];
    return keys.sort((a, b) => a.localeCompare(b));
  }, [jobs, mode]);

  const filteredJobs = useMemo(() => {
    if (selectedName === "all") return jobs;
    return jobs.filter((j) => groupKey(j, mode) === selectedName);
  }, [jobs, mode, selectedName]);

  const overall = totalsFor(filteredJobs);
  const focused = selectedName !== "all";

  const groups = useMemo(() => {
    const map = new Map<string, JobRow[]>();
    for (const job of filteredJobs) {
      const key = groupKey(job, mode);
      const list = map.get(key) ?? [];
      list.push(job);
      map.set(key, list);
    }
    return [...map.entries()]
      .map(([key, list]) => ({
        key,
        jobs: [...list].sort((a, b) => a.date.localeCompare(b.date)),
        total: totalsFor(list).total,
        count: list.length,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredJobs, mode]);

  if (jobs.length === 0) {
    return (
      <p className="mt-4 text-sm text-stone-400">
        No pay or expenses in this time range.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm text-stone-600">
          Break down by
          <select
            className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900"
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as BreakdownMode);
              setSelectedName("all");
              setOpenGroup(null);
              setOpenJobId(null);
            }}
          >
            <option value="company">Customers</option>
            <option value="job">Jobs</option>
            <option value="date">Dates</option>
          </select>
        </label>

        <label className="block text-sm text-stone-600">
          {modeNameLabel(mode)}
          <select
            className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900"
            value={selectedName}
            onChange={(e) => {
              setSelectedName(e.target.value);
              setOpenGroup(null);
              setOpenJobId(null);
            }}
          >
            <option value="all">{modeAllLabel(mode)}</option>
            {nameOptions.map((name) => (
              <option key={name} value={name}>
                {displayKey(name, mode)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded-xl border border-green-800 bg-gradient-to-br from-green-50 to-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-green-800">
              {focused ? displayKey(selectedName, mode) : "Period Total"}
            </p>
            <p className="mt-2 gs-metric-value text-4xl text-green-950">
              {formatCurrency(overall.total)}
            </p>
          </div>
          <div className="text-right text-sm text-stone-600">
            <p>
              Crew{" "}
              <span className="font-semibold text-green-900">
                {formatCurrency(overall.crewPay)}
              </span>
            </p>
            <p className="mt-1">
              Costs{" "}
              <span className="font-semibold text-green-900">
                {formatCurrency(overall.costs)}
              </span>
            </p>
            <p className="mt-1 text-xs text-stone-500">
              {overall.count} {overall.count === 1 ? "visit" : "visits"}
            </p>
          </div>
        </div>
      </div>

      {focused ? (
        <div className="space-y-2">
          <p className="text-xs text-stone-500">
            Visits for this filter · click Details for crew, pay, costs, and
            photos
          </p>
          {filteredJobs.length === 0 ? (
            <p className="rounded-lg border border-dashed border-stone-300 bg-white p-4 text-center text-sm text-stone-500">
              No visits for this filter.
            </p>
          ) : (
            <VisitRows
              jobs={[...filteredJobs].sort((a, b) =>
                a.date.localeCompare(b.date)
              )}
              mode={mode}
              openJobId={openJobId}
              onToggleJob={(id) =>
                setOpenJobId((current) => (current === id ? null : id))
              }
            />
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-stone-500">
            Click a group, then Details for pay, costs, and photos
          </p>
          {groups.map((group) => {
            const isOpen = openGroup === group.key;
            return (
              <div
                key={group.key}
                className={`rounded-xl border shadow-sm transition ${
                  isOpen
                    ? "border-green-800 bg-white"
                    : "border-stone-200 bg-white hover:border-green-700"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setOpenGroup((current) =>
                      current === group.key ? null : group.key
                    );
                    setOpenJobId(null);
                  }}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <div>
                    <p className="text-base font-semibold text-green-950">
                      {displayKey(group.key, mode)}
                    </p>
                    <p className="mt-0.5 text-sm text-stone-500">
                      {group.count} {group.count === 1 ? "visit" : "visits"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-900">
                      {formatCurrency(group.total)}
                    </p>
                    <p className="text-xs font-medium text-green-800">
                      {isOpen ? "Hide" : "View"}
                    </p>
                  </div>
                </button>

                {isOpen ? (
                  <div className="border-t border-stone-100 bg-stone-50 px-4 py-4">
                    <VisitRows
                      jobs={group.jobs}
                      mode={mode}
                      openJobId={openJobId}
                      onToggleJob={(id) =>
                        setOpenJobId((current) =>
                          current === id ? null : id
                        )
                      }
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
