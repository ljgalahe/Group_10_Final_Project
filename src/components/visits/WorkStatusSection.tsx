"use client";

import { useMemo, useState } from "react";
import { SectionSearch, matchesJobSearch } from "@/components/visits/SectionSearch";
import { WorkStatusPie } from "@/components/visits/WorkStatusPie";
import { formatCurrency } from "@/lib/format";
import type { JobRow } from "@/lib/visit-jobs";

export function WorkStatusSection({
  completed,
  pending,
}: {
  completed: JobRow[];
  pending: JobRow[];
}) {
  const [query, setQuery] = useState("");

  const filteredCompleted = useMemo(
    () => completed.filter((j) => matchesJobSearch(j, query)),
    [completed, query]
  );
  const filteredPending = useMemo(
    () => pending.filter((j) => matchesJobSearch(j, query)),
    [pending, query]
  );

  const completedPay = filteredCompleted.reduce((s, j) => s + j.crewPay, 0);
  const pendingPay = filteredPending.reduce((s, j) => s + j.crewPay, 0);

  const preview = [...filteredCompleted, ...filteredPending]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  return (
    <div>
      <SectionSearch
        value={query}
        onChange={setQuery}
        placeholder="Search completed or pending jobs…"
        label="Search work status"
      />
      <div className="mt-6">
        <WorkStatusPie
          completedCount={filteredCompleted.length}
          pendingCount={filteredPending.length}
          completedPay={completedPay}
          pendingPay={pendingPay}
        />
      </div>
      {query.trim() ? (
        <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Matching jobs ({filteredCompleted.length + filteredPending.length})
          </p>
          {preview.length === 0 ? (
            <p className="mt-2 text-sm text-stone-500">No jobs match this search.</p>
          ) : (
            <ul className="mt-2 space-y-1.5 text-sm">
              {preview.map((job) => (
                <li key={job.visitId} className="text-stone-700">
                  <span className="font-medium text-stone-900">
                    {job.companyName}
                  </span>
                  {" · "}
                  {job.jobLabel}
                  {" · "}
                  <span
                    className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold capitalize ${
                      job.status === "completed"
                        ? "gs-complete-badge border"
                        : "border border-amber-200 bg-amber-50 text-amber-800"
                    }`}
                  >
                    {job.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-stone-400">
            Pie counts update with this search ·{" "}
            {formatCurrency(completedPay + pendingPay)} crew pay in matches.
            Use the work directory filter below for completed vs pending.
          </p>
        </div>
      ) : null}
    </div>
  );
}
