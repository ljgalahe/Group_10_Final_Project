"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  QuoteApprovalsInbox,
  type QuoteApprovalItem,
} from "@/components/quotes/QuoteApprovalsInbox";
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

function ApprovalDropdown({
  title,
  count,
  hint,
  defaultOpen = false,
  children,
}: {
  title: string;
  count: number;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-stone-50"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-green-950">{title}</p>
          {hint ? (
            <p className="mt-0.5 truncate text-xs text-stone-500">{hint}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[10px] font-semibold text-stone-700">
            {count}
          </span>
          <span
            className={`text-stone-500 transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          >
            ▾
          </span>
        </div>
      </button>
      {open ? (
        <div className="border-t border-stone-100 px-4 py-3">{children}</div>
      ) : null}
    </div>
  );
}

/**
 * Manager inbox for quote approvals, crew-lead extra-work, and field exceptions.
 * Crew member time-off / availability is reviewed by Operations.
 */
export function ManagerApprovalsPanel({
  visitLabels = {},
  hideIntro = false,
  pendingQuotes = [],
}: {
  visitLabels?: Record<string, string>;
  /** Hide the top summary card when the parent already provides a section title. */
  hideIntro?: boolean;
  /** Same pending quotes shown on Contracts → Quote Approvals. */
  pendingQuotes?: QuoteApprovalItem[];
}) {
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

  const pendingExtraCount = useMemo(
    () =>
      extraRequests.filter((r) => r.status === "pending_approval").length,
    [extraRequests]
  );

  const pendingVisitExtraCount = useMemo(
    () =>
      visitNotes.filter(
        (n) => n.status === "pending_approval" || n.status === "needed"
      ).length,
    [visitNotes]
  );

  const openConcernCount = useMemo(
    () =>
      fieldConcerns.filter(
        (c) => (concernDecisions[c.visitId] ?? "open") === "open"
      ).length,
    [fieldConcerns, concernDecisions]
  );

  const quoteCount = pendingQuotes.length;

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
      {hideIntro ? (
        <div className="flex flex-wrap gap-2">
          {quoteCount > 0 ? (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-900">
              {quoteCount} quote approval{quoteCount === 1 ? "" : "s"}
            </span>
          ) : null}
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
            {pendingExtraCount + pendingVisitExtraCount} pending extra work
          </span>
          {openConcernCount > 0 ? (
            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-900">
              {openConcernCount} field concern
              {openConcernCount === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 px-4 py-3">
          <h2 className="text-lg font-semibold text-green-950">
            Approvals & Crew Alerts
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Quotes, extra-work, and field exceptions. Expand a section to
            review.
          </p>
        </div>
      )}

      <ApprovalDropdown
        title="Quote Approvals"
        count={quoteCount}
        hint="Same queue as Contracts → Quote Approvals"
        defaultOpen={quoteCount > 0}
      >
        <QuoteApprovalsInbox
          pendingQuotes={pendingQuotes}
          emptyHint="No quote approvals waiting. Syncs with Contracts → Quote Approvals."
        />
        <p className="mt-3 text-xs text-stone-500">
          <a href="/contracts" className="text-green-800 hover:underline">
            Open Contracts
          </a>{" "}
          for the full Quote Approvals + portfolio view.
        </p>
      </ApprovalDropdown>

      <ApprovalDropdown
        title="Field Concerns"
        count={openConcernCount}
        hint="Photo concerns from Visits work directory"
        defaultOpen={false}
      >
        {fieldConcerns.length === 0 ? (
          <p className="text-sm text-stone-500">
            No field concerns synced yet. Open Visits → Work directory once to
            load them.
          </p>
        ) : (
          <ul className="max-h-80 space-y-3 overflow-y-auto">
            {fieldConcerns.map((concern) => {
              const decision = concernDecisions[concern.visitId] ?? "open";
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
      </ApprovalDropdown>

      <ApprovalDropdown
        title="Extra Work Approvals"
        count={pendingExtraCount}
        hint="Crew-lead cost / hours requests"
        defaultOpen={false}
      >
        {extraRequests.length === 0 ? (
          <p className="text-sm text-stone-500">
            No extra-work approval requests yet.
          </p>
        ) : (
          <ul className="max-h-80 space-y-3 overflow-y-auto">
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
                    <p className="mt-1 text-stone-700">{request.description}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      {request.estimatedHours} hrs · {request.jobLocation} ·{" "}
                      {new Date(request.submittedAt).toLocaleString()}
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
      </ApprovalDropdown>

      <ApprovalDropdown
        title="Visit Extra-Work Comments"
        count={pendingVisitExtraCount}
        hint="Notes logged on visit work panels"
        defaultOpen={false}
      >
        {visitNotes.length === 0 ? (
          <p className="text-sm text-stone-500">
            No visit-level extra-work comments yet.
          </p>
        ) : (
          <ul className="max-h-80 space-y-3 overflow-y-auto">
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
                    <p className="mt-1 text-stone-700">{note.description}</p>
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
                        setVisitNoteStatus(note.jobId, note.id, "approved")
                      }
                      className="gs-btn-approve rounded-md px-3 py-1.5 text-xs font-medium"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setVisitNoteStatus(note.jobId, note.id, "declined")
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
      </ApprovalDropdown>

      <ApprovalDropdown
        title="Field Exception Comments"
        count={exceptions.length}
        hint="Weather, access, and site exceptions from the field"
        defaultOpen={false}
      >
        {exceptions.length === 0 ? (
          <p className="text-sm text-stone-500">
            No field exception comments yet.
          </p>
        ) : (
          <ul className="max-h-80 space-y-3 overflow-y-auto">
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
      </ApprovalDropdown>
    </div>
  );
}
