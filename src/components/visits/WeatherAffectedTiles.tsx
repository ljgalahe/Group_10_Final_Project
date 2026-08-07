"use client";

import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/ui";
import { SectionSearch, matchesJobSearch } from "@/components/visits/SectionSearch";
import { ViewAllToggle } from "@/components/visits/ViewAllToggle";
import { formatCurrency, formatDate } from "@/lib/format";
import type { JobRow } from "@/lib/visit-jobs";

function weatherCostBreakdown(job: JobRow) {
  const weather = job.weather;
  if (!weather) {
    return {
      plannedTotal: 0,
      actualTotal: job.crewPay + job.costTotal,
      overage: 0,
      crewOverage: 0,
      costOverage: 0,
    };
  }
  const plannedTotal = weather.plannedCrewPay + weather.plannedCost;
  const actualTotal = job.crewPay + job.costTotal;
  const crewOverage = Math.max(0, job.crewPay - weather.plannedCrewPay);
  const costOverage = Math.max(0, job.costTotal - weather.plannedCost);
  const overage = Math.max(0, actualTotal - plannedTotal);
  return { plannedTotal, actualTotal, overage, crewOverage, costOverage };
}

function WeatherCategoryJobs({
  label,
  jobs,
}: {
  label: string;
  jobs: JobRow[];
}) {
  const [query, setQuery] = useState("");
  const [viewAll, setViewAll] = useState(false);

  const filteredJobs = useMemo(
    () => jobs.filter((job) => matchesJobSearch(job, query)),
    [jobs, query]
  );

  return (
    <div className="rounded-xl border border-sky-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-green-950">
          {label} — customer details
        </p>
        <ViewAllToggle
          viewAll={viewAll}
          onToggle={() => setViewAll((v) => !v)}
          count={filteredJobs.length}
        />
      </div>

      <div className="mt-3">
        <SectionSearch
          value={query}
          onChange={(value) => {
            setQuery(value);
            setViewAll(false);
          }}
          placeholder={`Search ${label.toLowerCase()} by customer, job, or crew…`}
          label={`Search ${label}`}
        />
      </div>

      {filteredJobs.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">
          No jobs match this search.
        </p>
      ) : (
        <ul
          className={
            viewAll
              ? "mt-3 space-y-3"
              : "mt-3 max-h-80 space-y-3 overflow-y-auto pr-2"
          }
        >
          {filteredJobs.map((job) => {
            const weather = job.weather;
            const costs = weatherCostBreakdown(job);
            const originalDate = weather?.originalDate ?? job.date;
            const rescheduledDate = weather?.rescheduledDate ?? null;

            return (
              <li
                key={job.visitId}
                className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-stone-900">
                      {job.companyName}
                    </p>
                    <p className="mt-1 text-stone-700">{job.jobLabel}</p>
                  </div>
                  <StatusBadge status={job.status} />
                </div>

                <p className="mt-2 text-stone-600">{weather?.detail}</p>

                <div className="mt-3 grid gap-2 rounded-lg border border-sky-100 bg-sky-50/70 px-3 py-2 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-sky-800">
                      Original planned date
                    </p>
                    <p className="mt-0.5 font-medium text-stone-900">
                      {formatDate(originalDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-sky-800">
                      Rescheduled date
                    </p>
                    <p className="mt-0.5 font-medium text-stone-900">
                      {rescheduledDate
                        ? formatDate(rescheduledDate)
                        : "Not rescheduled yet"}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                      Crew
                    </p>
                    {job.crew.length === 0 ? (
                      <p className="mt-1 text-stone-400">No crew listed</p>
                    ) : (
                      <ul className="mt-1 space-y-1 text-stone-700">
                        {job.crew.map((m) => (
                          <li key={`${job.visitId}-${m.name}`}>
                            {m.name} · {m.role} · {m.hours}h @{" "}
                            {formatCurrency(m.payRate)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                      Pay / cost vs original plan
                    </p>
                    <p className="mt-1 text-stone-700">
                      Planned total:{" "}
                      <span className="font-medium text-stone-900">
                        {formatCurrency(costs.plannedTotal)}
                      </span>
                    </p>
                    <p className="mt-1 text-stone-700">
                      Actual total:{" "}
                      <span className="font-medium text-green-900">
                        {formatCurrency(costs.actualTotal)}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      Crew {formatCurrency(job.crewPay)}
                      {weather
                        ? ` (plan ${formatCurrency(weather.plannedCrewPay)})`
                        : ""}{" "}
                      · Costs {formatCurrency(job.costTotal)}
                      {weather
                        ? ` (plan ${formatCurrency(weather.plannedCost)})`
                        : ""}
                    </p>
                    {costs.overage > 0 ? (
                      <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-amber-900">
                        <span className="font-semibold">
                          {formatCurrency(costs.overage)} over plan
                        </span>
                        {(costs.crewOverage > 0 || costs.costOverage > 0) && (
                          <span className="mt-0.5 block text-xs text-amber-800">
                            {[
                              costs.crewOverage > 0
                                ? `${formatCurrency(costs.crewOverage)} extra crew pay`
                                : null,
                              costs.costOverage > 0
                                ? `${formatCurrency(costs.costOverage)} extra expenses`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-emerald-800">
                        No extra cost beyond the original plan
                      </p>
                    )}
                    {job.proof ? (
                      <p className="mt-2 text-xs text-emerald-800">
                        Photo proof on file
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function WeatherAffectedTiles({ jobs }: { jobs: JobRow[] }) {
  const [selected, setSelected] = useState<string | null>(null);

  const categories = useMemo(() => {
    const map = new Map<string, JobRow[]>();
    for (const job of jobs) {
      const label = job.weather?.label ?? "Other weather";
      const list = map.get(label) ?? [];
      list.push(job);
      map.set(label, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [jobs]);

  const selectedJobs = selected
    ? (categories.find(([label]) => label === selected)?.[1] ?? [])
    : [];

  if (jobs.length === 0) {
    return (
      <p className="mt-4 text-sm text-stone-400">
        No weather events in this range.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {categories.map(([label, group]) => {
          const isActive = selected === label;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setSelected(isActive ? null : label)}
              className={`aspect-square rounded-xl border p-3 text-left transition ${
                isActive
                  ? "border-sky-700 bg-sky-700 text-white shadow-md"
                  : "border-sky-200 bg-sky-50 text-sky-950 hover:border-sky-500 hover:bg-sky-100"
              }`}
            >
              <p className="text-sm font-semibold leading-snug">{label}</p>
              <p
                className={`mt-2 text-2xl font-bold ${
                  isActive ? "text-white" : "text-sky-900"
                }`}
              >
                {group.length}
              </p>
              <p
                className={`mt-1 text-xs ${
                  isActive ? "text-sky-100" : "text-sky-700"
                }`}
              >
                {group.length === 1 ? "job" : "jobs"}
              </p>
            </button>
          );
        })}
      </div>

      {selected ? (
        <WeatherCategoryJobs
          key={selected}
          label={selected}
          jobs={selectedJobs}
        />
      ) : (
        <p className="text-sm text-stone-500">
          Click a weather category square to see customers and full job details.
        </p>
      )}
    </div>
  );
}
