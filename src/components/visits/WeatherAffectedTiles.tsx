"use client";

import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/ui";
import { SectionSearch, matchesJobSearch } from "@/components/visits/SectionSearch";
import { ViewAllToggle } from "@/components/visits/ViewAllToggle";
import { formatCurrency, formatDate } from "@/lib/format";
import type { JobRow } from "@/lib/visit-jobs";

export function WeatherAffectedTiles({ jobs }: { jobs: JobRow[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [viewAll, setViewAll] = useState(false);

  const searchableJobs = useMemo(
    () => jobs.filter((j) => matchesJobSearch(j, query)),
    [jobs, query]
  );

  const categories = useMemo(() => {
    const map = new Map<string, JobRow[]>();
    for (const job of searchableJobs) {
      const label = job.weather?.label ?? "Other weather";
      const list = map.get(label) ?? [];
      list.push(job);
      map.set(label, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [searchableJobs]);

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
      <SectionSearch
        value={query}
        onChange={(value) => {
          setQuery(value);
          setSelected(null);
          setViewAll(false);
        }}
        placeholder="Search weather jobs by company, job, or crew…"
        label="Search weather affected"
      />

      {categories.length === 0 ? (
        <p className="text-sm text-stone-500">No weather jobs match this search.</p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {categories.map(([label, group]) => {
          const isActive = selected === label;
          return (
            <button
              key={label}
              type="button"
              onClick={() => {
                setSelected(isActive ? null : label);
                setViewAll(false);
              }}
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
        <div className="rounded-xl border border-sky-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-green-950">
              {selected} — company details
            </p>
            <ViewAllToggle
              viewAll={viewAll}
              onToggle={() => setViewAll((v) => !v)}
              count={selectedJobs.length}
            />
          </div>
          <ul
            className={
              viewAll
                ? "mt-3 space-y-3"
                : "mt-3 max-h-80 space-y-3 overflow-y-auto pr-2"
            }
          >
            {selectedJobs.map((job) => (
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
                    <p className="mt-1 text-stone-500">
                      {formatDate(job.date)}
                    </p>
                  </div>
                  <StatusBadge status={job.status} />
                </div>

                <p className="mt-2 text-stone-600">{job.weather?.detail}</p>

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
                      Pay / cost
                    </p>
                    <p className="mt-1 text-stone-700">
                      Crew pay:{" "}
                      <span className="font-medium text-green-900">
                        {formatCurrency(job.crewPay)}
                      </span>
                    </p>
                    <p className="mt-1 text-stone-700">
                      Job costs:{" "}
                      <span className="font-medium text-green-900">
                        {formatCurrency(job.costTotal)}
                      </span>
                    </p>
                    {job.proof ? (
                      <p className="mt-2 text-xs text-emerald-800">
                        Photo proof on file
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-stone-500">
          Click a weather category square to see companies and full job details.
        </p>
      )}
    </div>
  );
}
