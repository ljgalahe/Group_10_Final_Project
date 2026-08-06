"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionSearch, matchesJobSearch } from "@/components/visits/SectionSearch";
import { VisitJobDetail } from "@/components/visits/VisitJobDetail";
import { WorkDirectoryConcernAlerts } from "@/components/visits/WorkDirectoryConcernAlerts";
import { formatDate } from "@/lib/format";
import type { JobRow } from "@/lib/visit-jobs";

function CondensedJobBox({
  job,
  expanded,
  onToggle,
  organizeBy,
}: {
  job: JobRow;
  expanded: boolean;
  onToggle: () => void;
  organizeBy: "company" | "jobs" | "date";
}) {
  const isCompleted = job.status === "completed";
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onToggle}
        className={`gs-list-row w-full border p-3 text-left transition ${
          expanded
            ? "border-[var(--champagne)] bg-[var(--cream)]"
            : "border-stone-200 bg-transparent hover:border-stone-400"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            {organizeBy === "company" || organizeBy === "jobs" ? (
              <>
                <p className="text-sm font-medium text-stone-800">
                  {formatDate(job.date)}
                </p>
                <p className="mt-1 text-sm text-stone-500">{job.location}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-stone-800">
                  {job.companyName}
                </p>
                <p className="mt-1 text-sm text-stone-500">{job.jobLabel}</p>
              </>
            )}
            <p
              className={`mt-1 inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${
                isCompleted
                  ? "gs-complete-badge border"
                  : "border border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              {isCompleted ? "Completed" : "Pending"}
            </p>
          </div>
          <span className="text-xs font-medium text-green-800">
            {expanded ? "Hide" : "Details"}
          </span>
        </div>
      </button>
      {expanded ? <VisitJobDetail job={job} /> : null}
    </div>
  );
}

function groupJobsByLabel(jobs: JobRow[]) {
  const map = new Map<string, JobRow[]>();
  for (const job of jobs) {
    const list = map.get(job.jobLabel) ?? [];
    list.push(job);
    map.set(job.jobLabel, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, list]) => [
      label,
      [...list].sort((a, b) => a.date.localeCompare(b.date)),
    ] as [string, JobRow[]]);
}

function groupJobsByCompany(jobs: JobRow[]) {
  const map = new Map<string, JobRow[]>();
  for (const job of jobs) {
    const list = map.get(job.companyName) ?? [];
    list.push(job);
    map.set(job.companyName, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, list]) => [
      label,
      [...list].sort((a, b) => a.date.localeCompare(b.date)),
    ] as [string, JobRow[]]);
}

/** Under a company: nest by job type, then visit details (with photos). */
function CompanyJobGroups({
  jobs,
  focusVisitId = null,
}: {
  jobs: JobRow[];
  focusVisitId?: string | null;
}) {
  const jobGroups = useMemo(() => groupJobsByLabel(jobs), [jobs]);
  const [openJobLabel, setOpenJobLabel] = useState<string | null>(null);
  const [openJobId, setOpenJobId] = useState<string | null>(null);

  useEffect(() => {
    if (!focusVisitId) return;
    const job = jobs.find((j) => j.visitId === focusVisitId);
    if (!job) return;
    setOpenJobLabel(job.jobLabel);
    setOpenJobId(job.visitId);
  }, [focusVisitId, jobs]);

  return (
    <div className="space-y-2">
      <p className="mb-2 text-xs text-stone-500">
        Jobs for this company · click a job, then Details for pay, costs, and
        photos
      </p>
      {jobGroups.map(([jobLabel, labelJobs]) => {
        const isOpen = openJobLabel === jobLabel;
        const completed = labelJobs.filter((j) => j.status === "completed").length;
        const pending = labelJobs.length - completed;

        return (
          <div
            key={jobLabel}
            className={`rounded-lg border transition ${
              isOpen
                ? "border-green-800 bg-white"
                : "border-stone-200 bg-white hover:border-green-700"
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setOpenJobLabel((current) =>
                  current === jobLabel ? null : jobLabel
                );
                setOpenJobId(null);
              }}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <div>
                <p className="text-sm font-semibold text-green-950">
                  {jobLabel}
                </p>
                <p className="mt-0.5 text-xs text-stone-500">
                  {completed} completed · {pending} pending
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-md bg-green-100 px-2.5 py-1 text-sm font-semibold text-green-900">
                  {labelJobs.length}
                </span>
                <span className="text-xs font-medium text-green-800">
                  {isOpen ? "Hide" : "View"}
                </span>
              </div>
            </button>

            {isOpen ? (
              <div className="space-y-2 border-t border-stone-100 bg-stone-50 px-3 py-3">
                <p className="mb-1 text-xs text-stone-500">
                  Occurrences of {jobLabel} · click Details for crew, pay, and
                  photos
                </p>
                {labelJobs.map((job) => (
                  <CondensedJobBox
                    key={job.visitId}
                    job={job}
                    organizeBy="company"
                    expanded={openJobId === job.visitId}
                    onToggle={() =>
                      setOpenJobId((current) =>
                        current === job.visitId ? null : job.visitId
                      )
                    }
                  />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** Under a job type: nest by company, then visit details (with photos). */
function JobCompanyGroups({
  jobs,
  focusVisitId = null,
}: {
  jobs: JobRow[];
  focusVisitId?: string | null;
}) {
  const companyGroups = useMemo(() => groupJobsByCompany(jobs), [jobs]);
  const [openCompany, setOpenCompany] = useState<string | null>(null);
  const [openJobId, setOpenJobId] = useState<string | null>(null);

  useEffect(() => {
    if (!focusVisitId) return;
    const job = jobs.find((j) => j.visitId === focusVisitId);
    if (!job) return;
    setOpenCompany(job.companyName);
    setOpenJobId(job.visitId);
  }, [focusVisitId, jobs]);

  return (
    <div className="space-y-2">
      <p className="mb-2 text-xs text-stone-500">
        Companies for this job · click a company, then Details for pay, costs,
        and photos
      </p>
      {companyGroups.map(([companyName, companyJobs]) => {
        const isOpen = openCompany === companyName;
        const completed = companyJobs.filter(
          (j) => j.status === "completed"
        ).length;
        const pending = companyJobs.length - completed;
        const withProof = companyJobs.filter((j) => j.proof).length;

        return (
          <div
            key={companyName}
            className={`rounded-lg border transition ${
              isOpen
                ? "border-green-800 bg-white"
                : "border-stone-200 bg-white hover:border-green-700"
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setOpenCompany((current) =>
                  current === companyName ? null : companyName
                );
                setOpenJobId(null);
              }}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <div>
                <p className="text-sm font-semibold text-green-950">
                  {companyName}
                </p>
                <p className="mt-0.5 text-xs text-stone-500">
                  {completed} completed · {pending} pending
                  {withProof > 0 ? ` · ${withProof} with photos` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-md bg-green-100 px-2.5 py-1 text-sm font-semibold text-green-900">
                  {companyJobs.length}
                </span>
                <span className="text-xs font-medium text-green-800">
                  {isOpen ? "Hide" : "View"}
                </span>
              </div>
            </button>

            {isOpen ? (
              <div className="space-y-2 border-t border-stone-100 bg-stone-50 px-3 py-3">
                <p className="mb-1 text-xs text-stone-500">
                  Visits at {companyName} · click Details for crew, pay, and
                  photos
                </p>
                {companyJobs.map((job) => (
                  <CondensedJobBox
                    key={job.visitId}
                    job={job}
                    organizeBy="jobs"
                    expanded={openJobId === job.visitId}
                    onToggle={() =>
                      setOpenJobId((current) =>
                        current === job.visitId ? null : job.visitId
                      )
                    }
                  />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function OrganizedJobList({
  groups,
  emptyMessage,
  organizeBy = "company",
}: {
  groups: [string, JobRow[]][];
  emptyMessage: string;
  organizeBy?: "company" | "jobs" | "date";
}) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [openJobId, setOpenJobId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "completed" | "pending"
  >("all");

  const allJobs = useMemo(() => groups.flatMap(([, jobs]) => jobs), [groups]);

  function followVisit(visitId: string) {
    const job = allJobs.find((j) => j.visitId === visitId);
    if (!job) return;
    const groupKey =
      organizeBy === "company"
        ? job.companyName
        : organizeBy === "jobs"
          ? job.jobLabel
          : job.date;
    setOpenGroup(groupKey);
    setOpenJobId(visitId);
    setStatusFilter("all");
  }

  const filteredGroups = useMemo(() => {
    return groups
      .map(([title, jobs]) => {
        let list = jobs;
        if (statusFilter === "completed") {
          list = list.filter((j) => j.status === "completed");
        } else if (statusFilter === "pending") {
          list = list.filter((j) => j.status !== "completed");
        }
        if (query.trim()) {
          const titleMatch = title
            .toLowerCase()
            .includes(query.trim().toLowerCase());
          list = titleMatch
            ? list
            : list.filter((j) => matchesJobSearch(j, query));
        }
        return [title, list] as [string, JobRow[]];
      })
      .filter(([, jobs]) => jobs.length > 0);
  }, [groups, query, statusFilter]);

  if (groups.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-stone-500">
        {emptyMessage}
      </p>
    );
  }

  const searchPlaceholder =
    organizeBy === "company"
      ? "Search companies, jobs, or crew…"
      : organizeBy === "jobs"
        ? "Search jobs, companies, or crew…"
        : "Search by company, job, or crew…";

  return (
    <div className="space-y-3">
      <WorkDirectoryConcernAlerts
        jobs={allJobs}
        onFollowVisit={followVisit}
      />

      <div className="gs-index-bar">
        <div className="min-w-0 flex-1">
          <SectionSearch
            value={query}
            onChange={(value) => {
              setQuery(value);
              setOpenGroup(null);
              setOpenJobId(null);
            }}
            placeholder={searchPlaceholder}
            label="Search job list"
          />
        </div>
        <label className="gs-index-field sm:w-44">
          <span>Status</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(
                e.target.value as "all" | "completed" | "pending"
              );
              setOpenGroup(null);
              setOpenJobId(null);
            }}
          >
            <option value="all">All Visits</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
          </select>
        </label>
      </div>

      <div className="max-h-[36rem] space-y-0 overflow-y-auto overscroll-contain border-t border-stone-200 pr-1">
        {filteredGroups.length === 0 ? (
          <p className="border border-dashed border-stone-300 px-6 py-8 text-center">
            <span className="gs-italic-line">
              No results match this search or status filter.
            </span>
          </p>
        ) : null}

        {filteredGroups.map(([title, jobs]) => {
          const heading = organizeBy === "date" ? formatDate(title) : title;
          const isOpen = openGroup === title;
          const jobTypeCount =
            organizeBy === "company"
              ? new Set(jobs.map((j) => j.jobLabel)).size
              : null;
          const companyCount =
            organizeBy === "jobs"
              ? new Set(jobs.map((j) => j.companyName)).size
              : null;
          const proofCount = jobs.filter((j) => j.proof).length;

          return (
            <div
              key={title}
              className={`gs-list-row border-b border-stone-200 transition ${
                isOpen ? "bg-[var(--cream)]" : "bg-transparent hover:bg-white/40"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setOpenGroup((current) => (current === title ? null : title));
                  setOpenJobId(null);
                }}
                className="flex w-full items-center justify-between gap-3 px-1 py-4 text-left sm:px-2"
              >
                <div>
                  <p className="font-display text-xl font-semibold text-green-950">
                    {heading}
                  </p>
                  <p className="mt-0.5 text-sm text-stone-500">
                    {organizeBy === "company" && jobTypeCount != null
                      ? `${jobTypeCount} ${jobTypeCount === 1 ? "job" : "jobs"} · ${jobs.length} ${jobs.length === 1 ? "visit" : "visits"}`
                      : organizeBy === "jobs" && companyCount != null
                        ? `${companyCount} ${companyCount === 1 ? "company" : "companies"} · ${jobs.length} ${jobs.length === 1 ? "visit" : "visits"}`
                        : `${jobs.length} ${jobs.length === 1 ? "job" : "jobs"}`}
                    {proofCount > 0 ? ` · ${proofCount} with photos` : ""}
                  </p>
                </div>
                <span className="gs-text-link">
                  {isOpen ? "Hide" : "View"}
                  <span aria-hidden>{isOpen ? " ↑" : " →"}</span>
                </span>
              </button>

              {isOpen ? (
                <div className="border-t border-stone-200 px-1 py-4 sm:px-2">
                  {organizeBy === "company" ? (
                    <CompanyJobGroups jobs={jobs} focusVisitId={openJobId} />
                  ) : organizeBy === "jobs" ? (
                    <JobCompanyGroups jobs={jobs} focusVisitId={openJobId} />
                  ) : (
                    <div className="space-y-2">
                      <p className="mb-2 text-xs text-stone-500">
                        Visits on this date · click Details for crew, pay, and
                        photos
                      </p>
                      {jobs.map((job) => (
                        <CondensedJobBox
                          key={job.visitId}
                          job={job}
                          organizeBy={organizeBy}
                          expanded={openJobId === job.visitId}
                          onToggle={() =>
                            setOpenJobId((current) =>
                              current === job.visitId ? null : job.visitId
                            )
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
