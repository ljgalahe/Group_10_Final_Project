"use client";

import { Fragment, useMemo, useState } from "react";
import { formatDate } from "@/lib/format";
import {
  promiseStatusLabel,
  type ContractProgress,
  type PromiseRow,
  type PromiseRowStatus,
  type PromiseVisitDetail,
  type PromiseVisitOutcome,
} from "@/lib/contract-controls";

function statusTone(status: PromiseRowStatus) {
  if (status === "complete") return "bg-green-100 text-green-900";
  if (status === "missed") return "bg-red-100 text-red-800";
  if (status === "unapproved_extra") return "bg-amber-100 text-amber-900";
  if (status === "scheduled") return "bg-sky-100 text-sky-900";
  return "bg-stone-100 text-stone-700";
}

function outcomeTone(outcome: PromiseVisitOutcome) {
  if (outcome === "completed") return "text-green-800";
  if (outcome === "scheduled") return "text-sky-800";
  if (outcome === "extra") return "text-amber-800";
  return "text-red-700";
}

function outcomeLabel(outcome: PromiseVisitOutcome) {
  if (outcome === "completed") return "Completed";
  if (outcome === "scheduled") return "Scheduled";
  if (outcome === "extra") return "Unapproved extra";
  return "Skipped / missed";
}

function mergeStatus(statuses: PromiseRowStatus[]): PromiseRowStatus {
  if (statuses.every((s) => s === "complete")) return "complete";
  if (statuses.some((s) => s === "unapproved_extra")) return "unapproved_extra";
  if (statuses.every((s) => s === "missed")) return "missed";
  if (statuses.some((s) => s === "missed" || s === "partial")) return "partial";
  if (statuses.some((s) => s === "scheduled")) return "scheduled";
  return "partial";
}

function aggregateRows(progressList: ContractProgress[]): PromiseRow[] {
  const map = new Map<
    string,
    {
      contracted: number | null;
      completed: number;
      scheduled: number;
      skipped: number;
      statuses: PromiseRowStatus[];
      anyNotIncluded: boolean;
      visits: PromiseVisitDetail[];
    }
  >();

  for (const progress of progressList) {
    for (const row of progress.rows) {
      const current = map.get(row.service) ?? {
        contracted: 0,
        completed: 0,
        scheduled: 0,
        skipped: 0,
        statuses: [] as PromiseRowStatus[],
        anyNotIncluded: false,
        visits: [] as PromiseVisitDetail[],
      };

      if (row.contractedCount == null) {
        current.anyNotIncluded = true;
        current.contracted = null;
      } else if (!current.anyNotIncluded) {
        current.contracted = (current.contracted ?? 0) + row.contractedCount;
      }

      current.completed += row.completed;
      current.scheduled += row.scheduled;
      current.skipped += row.skipped;
      current.statuses.push(row.status);
      current.visits.push(
        ...(row.visits ?? []).map((v) => ({
          ...v,
          companyName: progress.customerName,
        }))
      );
      map.set(row.service, current);
    }
  }

  return [...map.entries()]
    .map(([service, value]) => ({
      service,
      contractLabel:
        value.contracted == null
          ? "Not included"
          : `${value.contracted} ${value.contracted === 1 ? "visit" : "visits"}`,
      contractedCount: value.contracted,
      completed: value.completed,
      scheduled: value.scheduled,
      skipped: value.skipped,
      status: value.anyNotIncluded
        ? ("unapproved_extra" as const)
        : mergeStatus(value.statuses),
      visits: value.visits.sort((a, b) => a.date.localeCompare(b.date)),
    }))
    .sort((a, b) => a.service.localeCompare(b.service));
}

function displayDate(date: string) {
  if (date.startsWith("skipped-")) return "Not scheduled";
  return formatDate(date);
}

export function PromiseVsActualMap({
  progressList,
}: {
  progressList: ContractProgress[];
}) {
  const [company, setCompany] = useState("overall");
  const [openKey, setOpenKey] = useState<string | null>(null);

  const companies = useMemo(() => {
    return [...new Set(progressList.map((p) => p.customerName))].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [progressList]);

  const rows = useMemo(() => {
    if (company === "overall") return aggregateRows(progressList);
    const selected = progressList.filter((p) => p.customerName === company);
    return selected.flatMap((p) =>
      p.rows.map((row) => ({
        ...row,
        visits: (row.visits ?? []).map((v) => ({
          ...v,
          companyName: p.customerName,
        })),
      }))
    );
  }, [progressList, company]);

  return (
    <div className="mt-4 space-y-4">
      <label className="block text-sm text-stone-600">
        Filter by company
        <select
          className="mt-1 block w-full max-w-md rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900"
          value={company}
          onChange={(e) => {
            setCompany(e.target.value);
            setOpenKey(null);
          }}
        >
          <option value="overall">Overall — all companies</option>
          {companies.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>

      {rows.length === 0 ? (
        <p className="text-sm text-stone-500">No jobs for this filter.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200">
          <div className="max-h-[28rem] overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-900 text-left text-white">
                <tr>
                  <th className="px-4 py-3 font-medium">Job</th>
                  <th className="px-4 py-3 font-medium">Contract visits</th>
                  <th className="px-4 py-3 font-medium">Completed visits</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const key = `${row.service}-${index}`;
                  const open = openKey === key;
                  const visits = [...(row.visits ?? [])].sort((a, b) =>
                    a.date.localeCompare(b.date)
                  );

                  return (
                    <Fragment key={key}>
                      <tr
                        className={`cursor-pointer transition ${
                          open
                            ? "bg-green-50"
                            : index % 2 === 0
                              ? "bg-white hover:bg-stone-50"
                              : "bg-stone-50 hover:bg-stone-100"
                        }`}
                        onClick={() =>
                          setOpenKey((current) =>
                            current === key ? null : key
                          )
                        }
                      >
                        <td className="px-4 py-3 font-medium text-stone-900">
                          {row.service}
                          <span className="mt-0.5 block text-xs font-medium text-green-800">
                            {open ? "Hide dates" : "View dates"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-stone-700">
                          {row.contractLabel}
                        </td>
                        <td className="px-4 py-3 text-stone-800">
                          {row.completed}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${statusTone(row.status)}`}
                          >
                            {promiseStatusLabel(row.status)}
                          </span>
                        </td>
                      </tr>
                      {open ? (
                        <tr className="bg-stone-50">
                          <td colSpan={4} className="px-4 py-3">
                            {visits.length === 0 ? (
                              <p className="text-sm text-stone-500">
                                No visit dates on file for this job.
                              </p>
                            ) : (
                              <ul className="space-y-2">
                                {visits.map((visit, visitIndex) => (
                                  <li
                                    key={`${key}-${visit.date}-${visitIndex}`}
                                    className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2"
                                  >
                                    <div>
                                      <p className="font-medium text-stone-900">
                                        {displayDate(visit.date)}
                                        {company === "overall" &&
                                        visit.companyName
                                          ? ` · ${visit.companyName}`
                                          : ""}
                                      </p>
                                      {visit.note ? (
                                        <p className="mt-0.5 text-xs text-stone-500">
                                          {visit.note}
                                        </p>
                                      ) : null}
                                    </div>
                                    <span
                                      className={`text-xs font-semibold ${outcomeTone(visit.outcome)}`}
                                    >
                                      {outcomeLabel(visit.outcome)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
