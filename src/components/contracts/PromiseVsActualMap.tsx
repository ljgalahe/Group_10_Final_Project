"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { approveExtraWork, declineExtraWork } from "@/app/actions/business";
import { normalizeServiceName } from "@/components/crew-lead/buildCrewSchedule";
import { formatDate } from "@/lib/format";
import {
  effectivePromiseStatus,
  isNotScheduledVisit,
  promiseStatusLabel,
  type ContractProgress,
  type PromiseRow,
  type PromiseRowStatus,
  type PromiseVisitDetail,
  type PromiseVisitOutcome,
} from "@/lib/contract-controls";
import {
  isExtraDemoApproved,
  isExtraDemoDeclined,
  saveContractLocalExtraApproval,
  saveContractLocalExtraDecline,
} from "@/lib/extra-work-approvals";
import { crewLeadNameForCustomer } from "@/lib/visit-demo";

type ExtraOrder = {
  id: string;
  contract_id: string;
  title: string;
  status: string;
};

type MapRow = PromiseRow & {
  contractId?: string;
  companyName?: string;
  contractTitle?: string;
};

function statusTone(status: PromiseRowStatus) {
  if (status === "complete") return "gs-complete-badge border";
  if (status === "missed") return "border border-red-200 bg-red-100 text-red-800";
  if (status === "not_scheduled")
    return "border border-stone-300 bg-stone-200 text-stone-800";
  if (status === "partially_scheduled")
    return "border border-amber-200 bg-amber-50 text-amber-950";
  if (status === "unapproved_extra")
    return "border border-amber-200 bg-amber-100 text-amber-900";
  if (status === "scheduled") return "border border-sky-200 bg-sky-100 text-sky-900";
  return "border border-stone-200 bg-stone-100 text-stone-700";
}

function outcomeTone(outcome: PromiseVisitOutcome) {
  if (outcome === "completed") return "gs-complete-badge border";
  if (outcome === "scheduled") return "border border-sky-200 bg-sky-100 text-sky-900";
  if (outcome === "extra") return "border border-amber-200 bg-amber-100 text-amber-900";
  if (outcome === "not_scheduled")
    return "border border-stone-300 bg-stone-200 text-stone-800";
  return "border border-red-200 bg-red-100 text-red-800";
}

function outcomeLabel(outcome: PromiseVisitOutcome) {
  if (outcome === "completed") return "Completed";
  if (outcome === "scheduled") return "Scheduled";
  if (outcome === "extra") return "Unapproved Extra";
  if (outcome === "not_scheduled") return "Not Scheduled";
  return "Missed After Scheduled";
}

function mergeStatus(statuses: PromiseRowStatus[]): PromiseRowStatus {
  if (statuses.every((s) => s === "complete")) return "complete";
  if (statuses.some((s) => s === "unapproved_extra")) return "unapproved_extra";
  if (statuses.every((s) => s === "not_scheduled")) return "not_scheduled";
  if (statuses.every((s) => s === "partially_scheduled"))
    return "partially_scheduled";
  if (statuses.some((s) => s === "partially_scheduled" || s === "not_scheduled"))
    return "partially_scheduled";
  if (statuses.every((s) => s === "missed")) return "missed";
  if (
    statuses.some(
      (s) => s === "missed" || s === "not_scheduled" || s === "partial"
    )
  )
    return "partial";
  if (statuses.some((s) => s === "scheduled")) return "scheduled";
  return "partial";
}

function matchExtraOrder(
  service: string,
  contractId: string | undefined,
  extras: ExtraOrder[]
) {
  const needle = service.trim().toLowerCase();
  const scoped = contractId
    ? extras.filter((e) => e.contract_id === contractId)
    : extras;
  return (
    scoped.find((o) => o.title.trim().toLowerCase() === needle) ??
    scoped.find((o) => o.title.trim().toLowerCase().includes(needle)) ??
    scoped.find((o) => needle.includes(o.title.trim().toLowerCase()))
  );
}

function rowNeedsApproval(row: MapRow, extras: ExtraOrder[]) {
  if (row.status !== "unapproved_extra" || row.completed > 0) return false;
  const contractId = row.contractId;
  if (contractId == null) return true;
  if (isExtraDemoApproved(contractId, row.service)) return false;
  if (isExtraDemoDeclined(contractId, row.service)) return false;
  const matched = matchExtraOrder(row.service, contractId, extras);
  if (matched?.status === "approved" || matched?.status === "completed")
    return false;
  if (matched?.status === "declined") return false;
  return true;
}

function aggregateRows(progressList: ContractProgress[]): MapRow[] {
  const map = new Map<
    string,
    {
      service: string;
      contracted: number | null;
      completed: number;
      scheduled: number;
      skipped: number;
      notScheduled: number;
      statuses: PromiseRowStatus[];
      anyNotIncluded: boolean;
      visits: PromiseVisitDetail[];
      contractId?: string;
      companyName?: string;
      contractTitle?: string;
    }
  >();

  for (const progress of progressList) {
    for (const row of progress.rows) {
      // Keep extras per company so Approve / Decline stay tied to one contract.
      const base = normalizeServiceName(row.service).toLowerCase();
      const key =
        row.status === "unapproved_extra"
          ? `extra::${progress.contractId}::${base}`
          : base;
      const displayName = normalizeServiceName(row.service);
      const current = map.get(key) ?? {
        service: displayName,
        contracted: 0,
        completed: 0,
        scheduled: 0,
        skipped: 0,
        notScheduled: 0,
        statuses: [] as PromiseRowStatus[],
        anyNotIncluded: false,
        visits: [] as PromiseVisitDetail[],
        contractId: progress.contractId,
        companyName: progress.customerName,
        contractTitle: progress.title,
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
      current.notScheduled += row.notScheduled ?? 0;
      current.statuses.push(row.status);
      current.visits.push(
        ...(row.visits ?? []).map((v) => ({
          ...v,
          companyName: progress.customerName,
        }))
      );
      // Prefer a single contract when still unambiguous; clear if merged.
      if (
        current.contractId &&
        current.contractId !== progress.contractId &&
        row.status !== "unapproved_extra"
      ) {
        current.contractId = undefined;
        current.contractTitle = undefined;
        current.companyName = undefined;
      }
      map.set(key, current);
    }
  }

  return [...map.values()]
    .map((value) => ({
      service: value.service,
      contractLabel:
        value.contracted == null
          ? "Not included"
          : `${value.contracted} ${value.contracted === 1 ? "visit" : "visits"}`,
      contractedCount: value.contracted,
      completed: value.completed,
      scheduled: value.scheduled,
      skipped: value.skipped,
      notScheduled: value.notScheduled,
      status: value.anyNotIncluded
        ? ("unapproved_extra" as const)
        : mergeStatus(value.statuses),
      visits: value.visits.sort((a, b) => a.date.localeCompare(b.date)),
      contractId: value.contractId,
      companyName: value.companyName,
      contractTitle: value.contractTitle,
    }))
    .sort((a, b) => a.service.localeCompare(b.service));
}

function displayDate(date: string) {
  if (date.startsWith("skipped-") || date.startsWith("not-scheduled-")) {
    return "Not on schedule";
  }
  return formatDate(date);
}

export function PromiseVsActualMap({
  progressList,
  extraWork = [],
  companyFilter,
  showCompanyFilter = true,
}: {
  progressList: ContractProgress[];
  extraWork?: ExtraOrder[];
  /** When provided with showCompanyFilter=false, uses this instead of internal state. */
  companyFilter?: string;
  showCompanyFilter?: boolean;
}) {
  const [companyInternal, setCompanyInternal] = useState("overall");
  const company = showCompanyFilter
    ? companyInternal
    : (companyFilter ?? "overall");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [selectedVisitKey, setSelectedVisitKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [decisionTick, setDecisionTick] = useState(0);

  useEffect(() => {
    const refresh = () => setDecisionTick((n) => n + 1);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("greenscape-extra-approvals-updated", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener(
        "greenscape-extra-approvals-updated",
        refresh
      );
    };
  }, []);

  const rows = useMemo((): MapRow[] => {
    void decisionTick;
    const toMapRows = (list: ContractProgress[]): MapRow[] =>
      list.flatMap((p) =>
        p.rows.map((row) => ({
          ...row,
          contractId: p.contractId,
          companyName: p.customerName,
          contractTitle: p.title,
          visits: (row.visits ?? []).map((v) => ({
            ...v,
            companyName: p.customerName,
          })),
        }))
      );

    const base =
      !showCompanyFilter
        ? company === "overall"
          ? aggregateRows(progressList)
          : toMapRows(progressList)
        : company === "overall"
          ? aggregateRows(progressList)
          : toMapRows(
              progressList.filter((p) => p.customerName === company)
            );

    return [...base].sort((a, b) => {
      const aNeeds = rowNeedsApproval(a, extraWork);
      const bNeeds = rowNeedsApproval(b, extraWork);
      if (aNeeds !== bNeeds) return aNeeds ? -1 : 1;
      return a.service.localeCompare(b.service);
    });
  }, [progressList, company, decisionTick, showCompanyFilter, extraWork]);

  function approveExtra(contractId: string, service: string) {
    saveContractLocalExtraApproval(contractId, service);
    setDecisionTick((n) => n + 1);
    setMessage(`${service} approved.`);
  }

  function declineExtra(contractId: string, service: string) {
    saveContractLocalExtraDecline(contractId, service);
    setDecisionTick((n) => n + 1);
    setMessage(`${service} declined.`);
  }

  const companies = useMemo(() => {
    return [...new Set(progressList.map((p) => p.customerName))].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [progressList]);

  return (
    <div className="mt-4 space-y-4">
      {showCompanyFilter ? (
        <label className="block text-sm text-stone-600">
          Filter by company
          <select
            className="mt-1 block w-full max-w-md rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900"
            value={companyInternal}
            onChange={(e) => {
              setCompanyInternal(e.target.value);
              setOpenKey(null);
              setSelectedVisitKey(null);
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
      ) : null}

      {message ? (
        <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
          {message}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="text-sm text-stone-500">No jobs for this filter.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200">
          <div className="max-h-[28rem] overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-900 text-left text-white">
                <tr>
                  <th className="px-4 py-3 font-medium">Job</th>
                  <th className="px-4 py-3 font-medium">Contract Visits</th>
                  <th className="px-4 py-3 font-medium">Completed Visits</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Manager Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const key = `${row.contractId ?? "x"}-${row.service}-${index}`;
                  const open = openKey === key;
                  const displayStatus = effectivePromiseStatus(row);
                  const contractId = row.contractId;
                  const decidedApproved =
                    contractId != null &&
                    isExtraDemoApproved(contractId, row.service);
                  const decidedDeclined =
                    contractId != null &&
                    isExtraDemoDeclined(contractId, row.service);
                  const matched = matchExtraOrder(
                    row.service,
                    contractId,
                    extraWork
                  );
                  const dbApproved =
                    matched?.status === "approved" ||
                    matched?.status === "completed";
                  const dbDeclined = matched?.status === "declined";
                  const needsApproval = rowNeedsApproval(row, extraWork);
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
                        onClick={() => {
                          setOpenKey((current) =>
                            current === key ? null : key
                          );
                          setSelectedVisitKey(null);
                        }}
                      >
                        <td className="px-4 py-3 font-medium text-stone-900">
                          {row.service}
                          {company === "overall" && row.companyName ? (
                            <span className="mt-0.5 block text-xs font-normal text-stone-500">
                              {row.companyName}
                            </span>
                          ) : null}
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
                            className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${
                              decidedApproved || dbApproved
                                ? "gs-complete-badge border"
                                : decidedDeclined || dbDeclined
                                  ? "border border-red-200 bg-red-100 text-red-800"
                                  : statusTone(displayStatus)
                            }`}
                          >
                            {decidedApproved || dbApproved
                              ? "Extra Approved"
                              : decidedDeclined || dbDeclined
                                ? "Extra Declined"
                                : promiseStatusLabel(displayStatus)}
                          </span>
                        </td>
                        <td
                          className="px-4 py-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {needsApproval && contractId ? (
                            <div className="flex flex-wrap gap-2">
                              {matched?.status === "quoted" ? (
                                <form action={approveExtraWork}>
                                  <input
                                    type="hidden"
                                    name="extra_work_id"
                                    value={matched.id}
                                  />
                                  <button
                                    type="submit"
                                    onClick={() =>
                                      approveExtra(contractId, row.service)
                                    }
                                    className="gs-btn-approve rounded-md px-3 py-1.5 text-xs font-medium"
                                  >
                                    Approve
                                  </button>
                                </form>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    approveExtra(contractId, row.service)
                                  }
                                  className="gs-btn-approve rounded-md px-3 py-1.5 text-xs font-medium"
                                >
                                  Approve
                                </button>
                              )}
                              {matched?.status === "quoted" ? (
                                <form action={declineExtraWork}>
                                  <input
                                    type="hidden"
                                    name="extra_work_id"
                                    value={matched.id}
                                  />
                                  <button
                                    type="submit"
                                    onClick={() =>
                                      declineExtra(contractId, row.service)
                                    }
                                    className="rounded-md border border-red-700 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-50"
                                  >
                                    Decline
                                  </button>
                                </form>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    declineExtra(contractId, row.service)
                                  }
                                  className="rounded-md border border-red-700 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-50"
                                >
                                  Decline
                                </button>
                              )}
                              <Link
                                href={`/contracts/${contractId}`}
                                className="rounded-md border border-green-800 px-3 py-1.5 text-xs font-medium text-green-900 hover:bg-green-50"
                              >
                                View contract
                              </Link>
                            </div>
                          ) : decidedApproved || dbApproved ? (
                            <span className="text-xs text-green-800">
                              Approved
                            </span>
                          ) : decidedDeclined || dbDeclined ? (
                            <span className="text-xs text-red-800">
                              Declined
                            </span>
                          ) : (
                            <span className="text-xs text-stone-400">
                              No Approval Needed
                            </span>
                          )}
                        </td>
                      </tr>
                      {open ? (
                        <tr className="bg-stone-50">
                          <td colSpan={5} className="px-4 py-3">
                            {(() => {
                              const datedVisits = visits.filter(
                                (v) => !isNotScheduledVisit(v)
                              );
                              const notScheduledCount =
                                visits.filter((v) => isNotScheduledVisit(v))
                                  .length ||
                                Number(row.notScheduled ?? 0);

                              if (
                                datedVisits.length === 0 &&
                                notScheduledCount === 0 &&
                                !needsApproval
                              ) {
                                return (
                                  <p className="text-sm text-stone-500">
                                    No visit dates on file for this job.
                                  </p>
                                );
                              }

                              return (
                                <div className="space-y-3">
                                  {needsApproval && contractId ? (
                                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                                      <p className="mr-auto text-sm text-amber-950">
                                        Extra work awaiting your approval
                                        {row.companyName
                                          ? ` · ${row.companyName}`
                                          : ""}
                                      </p>
                                      {matched?.status === "quoted" ? (
                                        <form action={approveExtraWork}>
                                          <input
                                            type="hidden"
                                            name="extra_work_id"
                                            value={matched.id}
                                          />
                                          <button
                                            type="submit"
                                            onClick={() =>
                                              approveExtra(
                                                contractId,
                                                row.service
                                              )
                                            }
                                            className="gs-btn-approve rounded-md px-3 py-1.5 text-xs font-medium"
                                          >
                                            Approve
                                          </button>
                                        </form>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            approveExtra(
                                              contractId,
                                              row.service
                                            )
                                          }
                                          className="gs-btn-approve rounded-md px-3 py-1.5 text-xs font-medium"
                                        >
                                          Approve
                                        </button>
                                      )}
                                      {matched?.status === "quoted" ? (
                                        <form action={declineExtraWork}>
                                          <input
                                            type="hidden"
                                            name="extra_work_id"
                                            value={matched.id}
                                          />
                                          <button
                                            type="submit"
                                            onClick={() =>
                                              declineExtra(
                                                contractId,
                                                row.service
                                              )
                                            }
                                            className="rounded-md border border-red-700 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-50"
                                          >
                                            Decline
                                          </button>
                                        </form>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            declineExtra(
                                              contractId,
                                              row.service
                                            )
                                          }
                                          className="rounded-md border border-red-700 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-50"
                                        >
                                          Decline
                                        </button>
                                      )}
                                      <Link
                                        href={`/contracts/${contractId}`}
                                        className="rounded-md border border-green-800 px-3 py-1.5 text-xs font-medium text-green-900 hover:bg-green-50"
                                      >
                                        View contract
                                      </Link>
                                    </div>
                                  ) : null}
                                  <ul className="space-y-2">
                                    {datedVisits.map((visit, visitIndex) => {
                                      const visitKey = `${key}-${visit.date}-${visitIndex}`;
                                      const isMissed =
                                        visit.outcome === "skipped";
                                      const selected =
                                        selectedVisitKey === visitKey;
                                      const note = visit.note?.trim() || null;
                                      const missReason =
                                        note ||
                                        "Reason not recorded — confirm with crew lead / operations.";

                                      return (
                                        <li key={visitKey}>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedVisitKey((current) =>
                                                current === visitKey
                                                  ? null
                                                  : visitKey
                                              );
                                            }}
                                            className={`flex w-full cursor-pointer flex-wrap items-start justify-between gap-2 rounded-lg border px-3 py-2 text-left transition ${
                                              isMissed
                                                ? selected
                                                  ? "border-red-400 bg-red-50"
                                                  : "border-red-200 bg-white hover:border-red-300"
                                                : selected
                                                  ? "border-stone-400 bg-stone-100"
                                                  : "border-stone-200 bg-white hover:border-stone-300"
                                            }`}
                                          >
                                            <div className="min-w-0">
                                              <p className="font-medium text-stone-900">
                                                {displayDate(visit.date)}
                                                {company === "overall" &&
                                                visit.companyName
                                                  ? ` · ${visit.companyName}`
                                                  : ""}
                                              </p>
                                            </div>
                                            <span
                                              className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${outcomeTone(visit.outcome)}`}
                                            >
                                              {outcomeLabel(visit.outcome)}
                                            </span>
                                          </button>
                                          {selected ? (
                                            <div
                                              className={`mt-1 space-y-1 rounded-lg border bg-white px-3 py-2 text-sm text-stone-700 ${
                                                isMissed
                                                  ? "border-red-200"
                                                  : "border-stone-200"
                                              }`}
                                            >
                                              {isMissed ? (
                                                <p>
                                                  <span className="font-medium text-stone-900">
                                                    Reason missed:{" "}
                                                  </span>
                                                  {missReason}
                                                </p>
                                              ) : note ? (
                                                <p>
                                                  <span className="font-medium text-stone-900">
                                                    Note:{" "}
                                                  </span>
                                                  {note}
                                                </p>
                                              ) : null}
                                              <p>
                                                <span className="font-medium text-stone-900">
                                                  Contract:{" "}
                                                </span>
                                                {contractId &&
                                                (row.contractTitle ||
                                                  row.companyName) ? (
                                                  <Link
                                                    href={`/contracts/${contractId}`}
                                                    className="text-green-800 hover:underline"
                                                    onClick={(e) =>
                                                      e.stopPropagation()
                                                    }
                                                  >
                                                    {row.contractTitle ??
                                                      row.companyName}
                                                  </Link>
                                                ) : (
                                                  <span className="text-stone-500">
                                                    —
                                                  </span>
                                                )}
                                              </p>
                                              <p>
                                                <span className="font-medium text-stone-900">
                                                  Crew leader:{" "}
                                                </span>
                                                {crewLeadNameForCustomer(
                                                  visit.companyName ??
                                                    row.companyName
                                                )}
                                              </p>
                                            </div>
                                          ) : null}
                                        </li>
                                      );
                                    })}
                                    {notScheduledCount > 0 ? (
                                      <li className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-stone-300 bg-stone-100 px-3 py-2">
                                        <div>
                                          <p className="font-medium text-stone-900">
                                            {notScheduledCount} not scheduled{" "}
                                            {notScheduledCount === 1
                                              ? "visit"
                                              : "visits"}
                                          </p>
                                          <p className="mt-0.5 text-xs text-stone-500">
                                            Promised in the contract but not yet
                                            placed on the schedule
                                          </p>
                                        </div>
                                        <span className="text-xs font-semibold text-stone-700">
                                          Not scheduled
                                        </span>
                                      </li>
                                    ) : null}
                                  </ul>
                                </div>
                              );
                            })()}
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
