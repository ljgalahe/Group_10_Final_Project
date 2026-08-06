"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Card } from "@/components/ui";
import {
  QuotesPendingApprovalSection,
  type PendingQuote,
} from "@/components/QuotesPendingApprovalSection";
import {
  loadFieldExceptions,
  loadManagementExtraRequests,
  loadVisitWorkState,
  saveManagementExtraRequests,
  saveVisitWorkState,
  type ManagementExtraWorkRequest,
} from "@/components/crew-lead/crewLeadStorage";
import type {
  CrewExtraWorkNote,
  FieldExceptionReport,
} from "@/components/crew-lead/schedule-types";
import { formatStatusLabel } from "@/components/crew-lead/visitWorkDefaults";
import {
  decisionLabel,
  loadConcernDecisions,
  loadFieldConcerns,
  saveConcernDecision,
  type ConcernDecision,
  type FieldConcernRecord,
} from "@/lib/concern-decisions";
import { chatHrefForCrewLead } from "@/lib/chat-demo";
import { formatDate } from "@/lib/format";

const VISIT_WORK_PREFIX = "greenscape-crew-visit-work:";

type VisitExtraWorkItem = CrewExtraWorkNote & {
  jobId: string;
};

type OpenPanel = "quotes" | "concerns" | null;

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
  return items.sort((a, b) => a.jobId.localeCompare(b.jobId));
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-stone-500 transition-transform duration-200 ${
        open ? "rotate-180" : ""
      }`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SummaryCard({
  title,
  countLabel,
  description,
  accent,
  selected,
  open,
  onToggle,
}: {
  title: string;
  countLabel: string;
  description: string;
  accent: "amber" | "rose";
  selected: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const accentClasses =
    accent === "amber"
      ? {
          bar: "bg-amber-500",
          badge: "bg-amber-100 text-amber-900",
          selected:
            "border-amber-400 ring-2 ring-amber-200/80 bg-amber-50/50",
          idle: "border-stone-200 bg-white hover:border-amber-300 hover:bg-amber-50/30",
        }
      : {
          bar: "bg-rose-500",
          badge: "bg-rose-100 text-rose-900",
          selected:
            "border-rose-400 ring-2 ring-rose-200/80 bg-rose-50/50",
          idle: "border-stone-200 bg-white hover:border-rose-300 hover:bg-rose-50/30",
        };

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={`group relative flex w-full flex-col rounded-xl border px-4 py-3.5 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-800/40 focus-visible:ring-offset-2 ${
        selected ? accentClasses.selected : accentClasses.idle
      }`}
    >
      <span
        className={`absolute inset-y-3 left-0 w-1 rounded-r-full ${accentClasses.bar}`}
        aria-hidden
      />
      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-green-950">{title}</h3>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${accentClasses.badge}`}
            >
              {countLabel}
            </span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-stone-500">
            {description}
          </p>
        </div>
        <Chevron open={open} />
      </div>
      <span className="mt-2 pl-2 text-[11px] font-medium text-stone-400 group-hover:text-stone-600">
        {open ? "Click to collapse" : "Click to review"}
      </span>
    </button>
  );
}

function DetailPanel({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
      aria-hidden={!open}
    >
      <div
        className={`min-h-0 overflow-hidden ${open ? "" : "pointer-events-none"}`}
      >
        {open ? (
          <div className="mt-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            {children}
          </div>
        ) : (
          <div className="mt-0" />
        )}
      </div>
    </div>
  );
}

/**
 * Progressive-disclosure inbox for manager Approvals & Crew Alerts:
 * summary cards first, then quote / field-concern details on demand.
 */
export function ManagerApprovalsAlertsInbox({
  pendingQuotes,
  visitLabels = {},
}: {
  pendingQuotes: PendingQuote[];
  visitLabels?: Record<string, string>;
}) {
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [extraRequests, setExtraRequests] = useState<
    ManagementExtraWorkRequest[]
  >([]);
  const [visitNotes, setVisitNotes] = useState<VisitExtraWorkItem[]>([]);
  const [exceptions, setExceptions] = useState<FieldExceptionReport[]>([]);
  const [fieldConcerns, setFieldConcerns] = useState<FieldConcernRecord[]>([]);
  const [concernDecisions, setConcernDecisions] = useState<
    Record<string, ConcernDecision>
  >({});

  function refresh() {
    setExtraRequests(loadManagementExtraRequests());
    setVisitNotes(loadAllVisitExtraWorkNotes());
    setExceptions(loadFieldExceptions());
    setFieldConcerns(loadFieldConcerns());
    setConcernDecisions(loadConcernDecisions());
  }

  useEffect(() => {
    refresh();
    const onStorage = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onStorage);
    window.addEventListener("greenscape-concerns-updated", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onStorage);
      window.removeEventListener("greenscape-concerns-updated", onStorage);
    };
  }, []);

  const openConcernCount = useMemo(
    () =>
      fieldConcerns.filter(
        (c) => (concernDecisions[c.visitId] ?? "open") === "open"
      ).length,
    [fieldConcerns, concernDecisions]
  );

  const quoteCount = pendingQuotes.length;

  function togglePanel(panel: Exclude<OpenPanel, null>) {
    setOpenPanel((current) => (current === panel ? null : panel));
  }

  function setExtraRequestStatus(
    id: string,
    status: ManagementExtraWorkRequest["status"]
  ) {
    const next = loadManagementExtraRequests().map((request) =>
      request.id === id ? { ...request, status } : request
    );
    saveManagementExtraRequests(next);
    setExtraRequests(next);
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
  }

  function setConcernStatus(visitId: string, decision: ConcernDecision) {
    saveConcernDecision(visitId, decision);
    setConcernDecisions(loadConcernDecisions());
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryCard
          title="Quotes Pending Approval"
          countLabel={`${quoteCount} awaiting`}
          description="Review and approve submitted customer quotes."
          accent="amber"
          selected={openPanel === "quotes"}
          open={openPanel === "quotes"}
          onToggle={() => togglePanel("quotes")}
        />
        <SummaryCard
          title="Field Concerns"
          countLabel={`${openConcernCount} active`}
          description="Review crew-reported issues requiring manager attention."
          accent="rose"
          selected={openPanel === "concerns"}
          open={openPanel === "concerns"}
          onToggle={() => togglePanel("concerns")}
        />
      </div>

      <DetailPanel open={openPanel === "quotes"}>
        <QuotesPendingApprovalSection quotes={pendingQuotes} listOnly />
      </DetailPanel>

      <DetailPanel open={openPanel === "concerns"}>
        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-green-950">
              Field Concerns
            </h3>
            {fieldConcerns.length === 0 ? (
              <p className="mt-2 text-sm text-stone-500">
                No field concerns synced yet. Open Visits → Work directory once
                to load them.
              </p>
            ) : (
              <ul className="mt-3 max-h-96 space-y-3 overflow-y-auto">
                {fieldConcerns.map((concern) => {
                  const decision =
                    concernDecisions[concern.visitId] ?? "open";
                  return (
                    <li
                      key={concern.visitId}
                      className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-green-950">
                            {concern.companyName}
                          </p>
                          <p className="mt-1 text-stone-700">
                            {concern.concernLabel}
                          </p>
                          <p className="mt-1 text-xs text-stone-500">
                            {concern.jobLabel} · {formatDate(concern.date)} ·{" "}
                            {concern.location}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                            decision === "approved"
                              ? "gs-complete-badge"
                              : decision === "on_hold"
                                ? "bg-amber-100 text-amber-900"
                                : "bg-rose-100 text-rose-900"
                          }`}
                        >
                          {decisionLabel(decision)}
                        </span>
                      </div>
                      {concern.concernImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={concern.concernImage}
                          alt={concern.concernLabel}
                          className="mt-3 h-32 w-full rounded-md border border-stone-200 object-cover"
                        />
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setConcernStatus(concern.visitId, "approved")
                          }
                          className="gs-btn-approve rounded-md px-3 py-1.5 text-xs font-medium"
                        >
                          Approve & clear
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setConcernStatus(concern.visitId, "on_hold")
                          }
                          className="rounded-md border border-amber-700 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-50"
                        >
                          Place on hold
                        </button>
                        {concern.crewLeadName ? (
                          <a
                            href={chatHrefForCrewLead({
                              crewLeadName: concern.crewLeadName,
                              visitId: concern.visitId,
                              jobLabel: concern.jobLabel,
                              companyName: concern.companyName,
                              concernLabel: concern.concernLabel,
                            })}
                            className="rounded-md border border-sky-700 px-3 py-1.5 text-xs font-medium text-sky-900 hover:bg-sky-50"
                          >
                            Contact crew leader ({concern.crewLeadName})
                          </a>
                        ) : null}
                        {decision !== "open" ? (
                          <button
                            type="button"
                            onClick={() =>
                              setConcernStatus(concern.visitId, "open")
                            }
                            className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-white"
                          >
                            Reopen
                          </button>
                        ) : null}
                        <a
                          href="/visits"
                          className="rounded-md border border-green-800 px-3 py-1.5 text-xs font-medium text-green-900 hover:bg-green-50"
                        >
                          Open Visits
                        </a>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h3 className="text-sm font-semibold text-green-950">
                Extra Work Approvals
              </h3>
              {extraRequests.length === 0 ? (
                <p className="mt-2 text-sm text-stone-500">
                  No extra-work approval requests yet.
                </p>
              ) : (
                <ul className="mt-3 max-h-80 space-y-3 overflow-y-auto">
                  {extraRequests.map((request) => (
                    <li
                      key={request.id}
                      className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-green-950">
                            {request.customerName}
                          </p>
                          <p className="mt-1 text-stone-700">
                            {request.description}
                          </p>
                          <p className="mt-1 text-xs text-stone-500">
                            {request.estimatedHours} hrs · {request.jobLocation}{" "}
                            · {new Date(request.submittedAt).toLocaleString()}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                            request.status === "approved"
                              ? "gs-complete-badge"
                              : request.status === "declined"
                                ? "bg-red-100 text-red-800"
                                : "bg-amber-100 text-amber-900"
                          }`}
                        >
                          {formatStatusLabel(request.status)}
                        </span>
                      </div>
                      {request.status === "pending_approval" ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setExtraRequestStatus(request.id, "approved")
                            }
                            className="gs-btn-approve rounded-md px-3 py-1.5 text-xs font-medium"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setExtraRequestStatus(request.id, "declined")
                            }
                            className="rounded-md border border-red-700 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-50"
                          >
                            Decline
                          </button>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <h3 className="text-sm font-semibold text-green-950">
                Visit Extra-Work Comments
              </h3>
              {visitNotes.length === 0 ? (
                <p className="mt-2 text-sm text-stone-500">
                  No visit-level extra-work comments yet.
                </p>
              ) : (
                <ul className="mt-3 max-h-80 space-y-3 overflow-y-auto">
                  {visitNotes.map((note) => (
                    <li
                      key={`${note.jobId}-${note.id}`}
                      className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-green-950">
                            {visitLabels[note.jobId] ??
                              `Visit ${note.jobId.slice(0, 8)}…`}
                          </p>
                          <p className="mt-1 text-stone-700">
                            {note.description}
                          </p>
                          <p className="mt-1 text-xs text-stone-500">
                            Visit ID: {note.jobId}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                            note.status === "approved"
                              ? "gs-complete-badge"
                              : note.status === "declined"
                                ? "bg-red-100 text-red-800"
                                : "bg-amber-100 text-amber-900"
                          }`}
                        >
                          {formatStatusLabel(note.status)}
                        </span>
                      </div>
                      {note.status === "pending_approval" ||
                      note.status === "needed" ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setVisitNoteStatus(
                                note.jobId,
                                note.id,
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
                                note.jobId,
                                note.id,
                                "declined"
                              )
                            }
                            className="rounded-md border border-red-700 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-50"
                          >
                            Decline
                          </button>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card>
            <h3 className="text-sm font-semibold text-green-950">
              Field Exception Comments
            </h3>
            {exceptions.length === 0 ? (
              <p className="mt-2 text-sm text-stone-500">
                No field exception comments yet.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {exceptions.map((report) => (
                  <li
                    key={report.id}
                    className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-green-950">
                          {report.customerName}
                        </p>
                        <p className="text-xs font-semibold text-amber-900">
                          {formatStatusLabel(report.type)}
                        </p>
                        <p className="mt-1 text-stone-700">{report.details}</p>
                        <p className="mt-1 text-xs text-stone-500">
                          {report.address}
                          {visitLabels[report.jobId]
                            ? ` · ${visitLabels[report.jobId]}`
                            : ""}
                          {" · "}
                          Visit ID: {report.jobId}
                          {" · "}
                          {new Date(report.submittedAt).toLocaleString()}
                        </p>
                      </div>
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-900">
                        Sent to Manager
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </DetailPanel>
    </div>
  );
}
