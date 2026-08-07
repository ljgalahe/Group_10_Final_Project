"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { approveExtraWork, declineExtraWork } from "@/app/actions/business";
import {
  loadManagementExtraRequests,
  loadVisitWorkState,
  saveManagementExtraRequests,
  saveVisitWorkState,
  type ManagementExtraWorkRequest,
} from "@/components/crew-lead/crewLeadStorage";
import type { CrewExtraWorkNote } from "@/components/crew-lead/schedule-types";
import { formatStatusLabel } from "@/components/crew-lead/visitWorkDefaults";
import { formatCurrency } from "@/lib/format";
import type { ScopeCreepAlert } from "@/lib/contract-controls";
import {
  demoExtraDecisionKey,
  loadExtraDemoDecisions,
  saveContractLocalExtraApproval,
  saveExtraDemoDecision,
  type ExtraDemoDecision,
} from "@/lib/extra-work-approvals";

const VISIT_WORK_PREFIX = "greenscape-crew-visit-work:";

type FilterMode = "company" | "task";

type DemoDecision = ExtraDemoDecision;

type ApprovalRow = {
  key: string;
  source: "crew_request" | "visit_note" | "contract_order";
  company: string;
  job: string;
  amountLabel: string;
  detail: string;
  status: string;
  submittedLabel?: string;
  contractId?: string;
  extraWorkId?: string;
  requestId?: string;
  jobId?: string;
  noteId?: string;
};

type VisitExtraWorkItem = CrewExtraWorkNote & { jobId: string };

function loadAllVisitExtraWorkNotes(): VisitExtraWorkItem[] {
  if (typeof window === "undefined") return [];
  const items: VisitExtraWorkItem[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith(VISIT_WORK_PREFIX)) continue;
    const jobId = key.slice(VISIT_WORK_PREFIX.length);
    try {
      const state = loadVisitWorkState(jobId);
      for (const note of state.extraWorkNotes ?? []) {
        items.push({ ...note, jobId });
      }
    } catch {
      // skip bad entries
    }
  }
  return items;
}

function contractOrderRows(
  alerts: ScopeCreepAlert[],
  demoDecisions: Record<string, DemoDecision>
): ApprovalRow[] {
  return alerts.flatMap((alert) =>
    alert.items.map((item) => {
      const decisionKey = demoExtraDecisionKey(alert.contractId, item.title);
      const decided = demoDecisions[decisionKey];
      return {
        key: item.id
          ? `contract::${alert.contractId}::${item.id}`
          : decisionKey,
        source: "contract_order" as const,
        company: alert.propertyName,
        job: item.title,
        amountLabel: formatCurrency(item.amount),
        detail:
          item.reason ||
          alert.detail ||
          "Extra work outside the original agreement — awaiting manager approval before work proceeds.",
        status: decided ?? "pending_approval",
        submittedLabel: alert.windowLabel,
        contractId: alert.contractId,
        extraWorkId: item.id,
      };
    })
  );
}

function crewRequestRows(
  requests: ManagementExtraWorkRequest[],
  customerFilter?: string
): ApprovalRow[] {
  return requests
    .filter((r) =>
      customerFilter
        ? r.customerName.toLowerCase().includes(customerFilter.toLowerCase())
        : true
    )
    .map((r) => ({
      key: `crew::${r.id}`,
      source: "crew_request" as const,
      company: r.customerName,
      job: r.description,
      amountLabel:
        r.estimatedCost != null && r.estimatedCost > 0
          ? formatCurrency(r.estimatedCost)
          : `${r.estimatedHours} hrs`,
      detail: `Crew lead request · ${r.jobLocation}. Do not start this extra work until management approves.`,
      status: r.status,
      submittedLabel: new Date(r.submittedAt).toLocaleString(),
      requestId: r.id,
    }));
}

function visitNoteRows(
  notes: VisitExtraWorkItem[],
  customerFilter?: string
): ApprovalRow[] {
  return notes
    .filter((n) => {
      if (!customerFilter) return true;
      // Visit notes lack customer; keep when browsing company filter via primary list only
      return true;
    })
    .map((n) => ({
      key: `visit::${n.jobId}::${n.id}`,
      source: "visit_note" as const,
      company: customerFilter ?? "Visit extra-cost request",
      job: n.description,
      amountLabel:
        n.hours != null && n.hours > 0 ? `${n.hours} hrs` : "Cost TBD",
      detail: `Submitted from visit ${n.jobId.slice(0, 8)}… — awaiting manager approval before treating as completed work.`,
      status: n.status,
      jobId: n.jobId,
      noteId: n.id,
    }));
}

export function ExtraWorkApproval({
  alerts,
  customerFilter,
}: {
  /** Quoted / pending contract extra-work orders from the server. */
  alerts: ScopeCreepAlert[];
  /** When set (contract detail), limit crew dashboard requests to this customer. */
  customerFilter?: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<FilterMode>("company");
  const [selected, setSelected] = useState("all");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [crewRequests, setCrewRequests] = useState<ManagementExtraWorkRequest[]>(
    []
  );
  const [visitNotes, setVisitNotes] = useState<VisitExtraWorkItem[]>([]);
  const [demoDecisions, setDemoDecisions] = useState<
    Record<string, DemoDecision>
  >({});

  function refreshClient() {
    setCrewRequests(loadManagementExtraRequests());
    setVisitNotes(loadAllVisitExtraWorkNotes());
    setDemoDecisions(loadExtraDemoDecisions());
  }

  useEffect(() => {
    refreshClient();
    const onStorage = () => refreshClient();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onStorage);
    window.addEventListener("greenscape-extra-approvals-updated", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onStorage);
      window.removeEventListener(
        "greenscape-extra-approvals-updated",
        onStorage
      );
    };
  }, []);

  const rows = useMemo(() => {
    const fromContracts = contractOrderRows(alerts, demoDecisions);
    const fromCrew = crewRequestRows(crewRequests, customerFilter);
    const fromVisits = customerFilter
      ? []
      : visitNoteRows(visitNotes, customerFilter);
    return [...fromCrew, ...fromVisits, ...fromContracts].sort((a, b) => {
      const pendingRank = (s: string) =>
        s === "pending_approval" || s === "needed" || s === "quoted" ? 0 : 1;
      return pendingRank(a.status) - pendingRank(b.status);
    });
  }, [alerts, crewRequests, visitNotes, customerFilter, demoDecisions]);

  const companies = useMemo(() => {
    return [...new Set(rows.map((r) => r.company))].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [rows]);

  const tasks = useMemo(() => {
    return [...new Set(rows.map((r) => r.job))].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [rows]);

  const filtered = useMemo(() => {
    if (selected === "all") return rows;
    if (mode === "company") return rows.filter((r) => r.company === selected);
    return rows.filter((r) => r.job === selected);
  }, [rows, mode, selected]);

  const pendingCount = rows.filter(
    (r) =>
      r.status === "pending_approval" ||
      r.status === "needed" ||
      r.status === "quoted"
  ).length;

  function setCrewStatus(
    id: string,
    status: ManagementExtraWorkRequest["status"]
  ) {
    const next = loadManagementExtraRequests().map((request) =>
      request.id === id ? { ...request, status } : request
    );
    saveManagementExtraRequests(next);
    setCrewRequests(next);
    setMessage(
      status === "approved"
        ? "Extra work approved. Crew may proceed."
        : "Extra work declined."
    );
  }

  function setVisitNoteStatus(
    jobId: string,
    noteId: string,
    status: CrewExtraWorkNote["status"]
  ) {
    const state = loadVisitWorkState(jobId);
    const next = {
      ...state,
      extraWorkNotes: state.extraWorkNotes.map((note) =>
        note.id === noteId ? { ...note, status } : note
      ),
    };
    saveVisitWorkState(jobId, next);
    setVisitNotes(loadAllVisitExtraWorkNotes());
    setMessage(
      status === "approved"
        ? "Visit extra-cost request approved."
        : "Visit extra-cost request declined."
    );
  }

  function setDemoContractStatus(
    contractId: string,
    title: string,
    status: DemoDecision
  ) {
    const next = saveExtraDemoDecision(contractId, title, status);
    if (status === "approved") {
      saveContractLocalExtraApproval(contractId, title);
    }
    setDemoDecisions(next);
    setMessage(
      status === "approved"
        ? "Extra work approved. Operations can schedule if needed."
        : "Extra work declined."
    );
  }

  function isActionable(status: string) {
    return (
      status === "pending_approval" ||
      status === "needed" ||
      status === "quoted"
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-stone-600">
          Crew lead extra-cost requests appear here as alerts. Approve here —
          operations adds approved work to the schedule when needed.
        </p>
        {pendingCount > 0 ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
            {pendingCount} awaiting approval
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm text-stone-600">
          Filter by
          <select
            className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900"
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as FilterMode);
              setSelected("all");
              setOpenKey(null);
            }}
          >
            <option value="company">Customers</option>
            <option value="task">Tasks</option>
          </select>
        </label>

        <label className="block text-sm text-stone-600">
          {mode === "company" ? "Customer name" : "Task name"}
          <select
            className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900"
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setOpenKey(null);
            }}
          >
            <option value="all">
              {mode === "company" ? "All customers" : "All tasks"}
            </option>
            {(mode === "company" ? companies : tasks).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-stone-500">
          No extra-work approval alerts yet. Crew lead submissions from the
          dashboard and visit panels show up here.
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-stone-500">No items match this filter.</p>
      ) : (
        <div className="max-h-96 space-y-2 overflow-y-auto rounded-xl border border-amber-200 bg-amber-50/40 p-3 pr-2">
          {filtered.map((row) => {
            const open = openKey === row.key;
            const companyFixed = mode === "company" && selected !== "all";
            const taskFixed = mode === "task" && selected !== "all";
            const primary = companyFixed
              ? row.job
              : taskFixed
                ? row.company
                : row.company;
            const secondary = companyFixed
              ? null
              : taskFixed
                ? null
                : row.job;

            return (
              <div key={row.key} className="space-y-2">
                <button
                  type="button"
                  onClick={() =>
                    setOpenKey((current) =>
                      current === row.key ? null : row.key
                    )
                  }
                  className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                    open
                      ? "border-amber-700 bg-amber-100"
                      : isActionable(row.status)
                        ? "border-amber-300 bg-white hover:border-amber-500"
                        : "border-stone-200 bg-white hover:border-stone-300"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-amber-950">
                      {primary}
                    </p>
                    {secondary ? (
                      <p className="truncate text-sm text-stone-600">
                        {secondary}
                      </p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-amber-950">
                      {row.amountLabel}
                    </p>
                    <p
                      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${
                        isActionable(row.status)
                          ? "border border-amber-200 bg-amber-50 text-amber-800"
                          : row.status === "approved"
                            ? "gs-complete-badge border"
                            : "border border-stone-200 bg-stone-100 text-stone-600"
                      }`}
                    >
                      {formatStatusLabel(row.status)}
                    </p>
                  </div>
                </button>

                {open ? (
                  <div className="rounded-lg border border-amber-200 bg-white p-3 text-sm">
                    {companyFixed ? null : (
                      <p className="font-medium text-stone-800">{row.company}</p>
                    )}
                    {taskFixed ? null : (
                      <p
                        className={
                          companyFixed
                            ? "font-medium text-stone-800"
                            : "mt-0.5 text-stone-700"
                        }
                      >
                        {row.job}
                      </p>
                    )}
                    <p
                      className={`${companyFixed || taskFixed ? "" : "mt-2 "}text-stone-600`}
                    >
                      {row.detail}
                    </p>
                    {row.submittedLabel ? (
                      <p className="mt-1 text-xs text-stone-500">
                        {row.submittedLabel}
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {isActionable(row.status) &&
                      row.source === "crew_request" &&
                      row.requestId ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setCrewStatus(row.requestId!, "approved")
                            }
                            className="gs-btn-approve rounded-md px-3 py-1.5 text-xs font-medium"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setCrewStatus(row.requestId!, "declined")
                            }
                            className="rounded-md border border-red-700 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-50"
                          >
                            Decline
                          </button>
                        </>
                      ) : null}

                      {isActionable(row.status) &&
                      row.source === "visit_note" &&
                      row.jobId &&
                      row.noteId ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setVisitNoteStatus(
                                row.jobId!,
                                row.noteId!,
                                "approved"
                              )
                            }
                            className="gs-btn-approve rounded-md px-3 py-1.5 text-xs font-medium"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setVisitNoteStatus(
                                row.jobId!,
                                row.noteId!,
                                "declined"
                              )
                            }
                            className="rounded-md border border-red-700 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-50"
                          >
                            Decline
                          </button>
                        </>
                      ) : null}

                      {isActionable(row.status) &&
                      row.source === "contract_order" &&
                      row.extraWorkId ? (
                        <>
                          <form action={approveExtraWork}>
                            <input
                              type="hidden"
                              name="extra_work_id"
                              value={row.extraWorkId}
                            />
                            <button
                              type="submit"
                              className="gs-btn-approve rounded-md px-3 py-1.5 text-xs font-medium"
                            >
                              Approve
                            </button>
                          </form>
                          <form action={declineExtraWork}>
                            <input
                              type="hidden"
                              name="extra_work_id"
                              value={row.extraWorkId}
                            />
                            <button
                              type="submit"
                              onClick={() => {
                                if (row.contractId) {
                                  setDemoContractStatus(
                                    row.contractId,
                                    row.job,
                                    "declined"
                                  );
                                }
                              }}
                              className="rounded-md border border-red-700 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-50"
                            >
                              Decline
                            </button>
                          </form>
                        </>
                      ) : null}

                      {isActionable(row.status) &&
                      row.source === "contract_order" &&
                      !row.extraWorkId ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setDemoContractStatus(
                                row.contractId!,
                                row.job,
                                "approved"
                              )
                            }
                            className="gs-btn-approve rounded-md px-3 py-1.5 text-xs font-medium"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDemoContractStatus(
                                row.contractId!,
                                row.job,
                                "declined"
                              )
                            }
                            className="rounded-md border border-red-700 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-50"
                          >
                            Decline
                          </button>
                        </>
                      ) : null}

                      {row.contractId ? (
                        <Link
                          href={`/contracts/${row.contractId}`}
                          className="rounded-md border border-green-800 px-3 py-1.5 text-xs font-medium text-green-900 hover:bg-green-50"
                        >
                          Open contract
                        </Link>
                      ) : null}
                    </div>

                    {message ? (
                      <p className="mt-2 text-xs font-medium text-green-900">
                        {message}
                      </p>
                    ) : null}
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

/** @deprecated Use ExtraWorkApproval */
export function OutOfScopeWorkWatch(props: {
  alerts: ScopeCreepAlert[];
  customerFilter?: string;
}) {
  return <ExtraWorkApproval {...props} />;
}
