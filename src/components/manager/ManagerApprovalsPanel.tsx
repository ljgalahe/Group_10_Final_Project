"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui";
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
  approveMemberRequest,
  denyMemberRequest,
  loadMemberSchedulingRequests,
  markMemberRequestSeen,
  requestMoreInfoMemberRequest,
  type MemberSchedulingRequest,
} from "@/components/crew-member/memberSchedulingStorage";

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

function memberStatusClass(status: MemberSchedulingRequest["status"]) {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-800";
    case "denied":
      return "bg-red-100 text-red-800";
    case "needs_info":
      return "bg-amber-100 text-amber-900";
    default:
      return "bg-amber-100 text-amber-900";
  }
}

/**
 * Manager inbox for crew-lead extra-work approvals and field exceptions.
 * Uses the same localStorage keys as the Crew Lead screens so both stay in sync.
 */
export function ManagerApprovalsPanel({
  visitLabels = {},
}: {
  /** Optional map of visit/job id -> label (customer / contract) */
  visitLabels?: Record<string, string>;
}) {
  const [extraRequests, setExtraRequests] = useState<
    ManagementExtraWorkRequest[]
  >([]);
  const [visitNotes, setVisitNotes] = useState<VisitExtraWorkItem[]>([]);
  const [exceptions, setExceptions] = useState<FieldExceptionReport[]>([]);
  const [memberRequests, setMemberRequests] = useState<
    MemberSchedulingRequest[]
  >([]);
  const [denyDrafts, setDenyDrafts] = useState<Record<string, string>>({});
  const [infoDrafts, setInfoDrafts] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<Record<string, string>>({});

  function refresh() {
    setExtraRequests(loadManagementExtraRequests());
    setVisitNotes(loadAllVisitExtraWorkNotes());
    setExceptions(loadFieldExceptions());
    setMemberRequests(loadMemberSchedulingRequests());
  }

  useEffect(() => {
    const sync = () => refresh();
    const timer = window.setTimeout(sync, 0);
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  const pendingExtraCount = useMemo(() => {
    const fromDashboard = extraRequests.filter(
      (r) => r.status === "pending_approval"
    ).length;
    const fromVisits = visitNotes.filter(
      (n) => n.status === "pending_approval" || n.status === "needed"
    ).length;
    const fromMembers = memberRequests.filter(
      (r) => r.status === "pending" || r.status === "needs_info"
    ).length;
    return fromDashboard + fromVisits + fromMembers;
  }, [extraRequests, visitNotes, memberRequests]);

  const newMemberRequestCount = useMemo(
    () =>
      memberRequests.filter(
        (r) => !r.seenByManager && r.status === "pending"
      ).length,
    [memberRequests]
  );

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

  function openMemberRequest(id: string) {
    markMemberRequestSeen(id);
    refresh();
  }

  function handleApproveMember(id: string) {
    approveMemberRequest(id);
    refresh();
  }

  function handleDenyMember(id: string) {
    const reason = (denyDrafts[id] ?? "").trim();
    if (!reason) {
      setActionError((prev) => ({
        ...prev,
        [id]: "Denial reason is required.",
      }));
      return;
    }
    setActionError((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    denyMemberRequest(id, reason);
    setDenyDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    refresh();
  }

  function handleMoreInfoMember(id: string) {
    const message = (infoDrafts[id] ?? "").trim();
    if (!message) {
      setActionError((prev) => ({
        ...prev,
        [id]: "Please describe what information is needed.",
      }));
      return;
    }
    setActionError((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    requestMoreInfoMemberRequest(id, message);
    setInfoDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    refresh();
  }

  return (
    <div className="space-y-6">
      <Card className="border-amber-200 bg-amber-50/40">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-green-950">
              Approvals & Crew Alerts
            </h2>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
            {pendingExtraCount} pending approval
            {pendingExtraCount === 1 ? "" : "s"}
          </span>
        </div>
      </Card>

      <Card>
        <h3 className="text-base font-semibold text-green-950">
          Crew Member Scheduling
        </h3>
        <p className="mt-1 text-sm text-stone-500">
          {newMemberRequestCount} new request
          {newMemberRequestCount === 1 ? "" : "s"}
        </p>

        {memberRequests.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">
            No member scheduling requests yet.
          </p>
        ) : (
          <ul className="mt-3 max-h-96 space-y-3 overflow-y-auto">
            {memberRequests.map((request) => {
              const actionable =
                request.status === "pending" || request.status === "needs_info";
              return (
                <li
                  key={request.id}
                  className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm"
                  onMouseEnter={() => {
                    if (!request.seenByManager) openMemberRequest(request.id);
                  }}
                >
                  <div className="flex gap-3">
                    <span
                      className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                        !request.seenByManager && request.status === "pending"
                          ? "bg-green-500"
                          : "bg-transparent"
                      }`}
                      title={
                        !request.seenByManager && request.status === "pending"
                          ? "New / unseen"
                          : undefined
                      }
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-green-950">
                            {request.memberName}
                          </p>
                          <p className="text-xs font-semibold text-stone-600">
                            {request.kind === "time_off"
                              ? "Time off"
                              : "Availability"}
                            {" · "}
                            {request.startDate}
                            {request.endDate !== request.startDate
                              ? ` → ${request.endDate}`
                              : ""}
                          </p>
                          {request.reason ? (
                            <p className="mt-1 text-stone-700">
                              {request.reason}
                            </p>
                          ) : null}
                          {request.availabilityNotes ? (
                            <p className="mt-1 text-stone-700">
                              {request.availabilityNotes}
                            </p>
                          ) : null}
                          {request.denialReason ? (
                            <p className="mt-1 text-xs text-red-700">
                              Denial reason: {request.denialReason}
                            </p>
                          ) : null}
                          {request.managerMessage ? (
                            <p className="mt-1 text-xs text-amber-800">
                              More info asked: {request.managerMessage}
                            </p>
                          ) : null}
                          <p className="mt-1 text-xs text-stone-500">
                            {new Date(request.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${memberStatusClass(request.status)}`}
                        >
                          {formatStatusLabel(request.status)}
                        </span>
                      </div>

                      {actionable ? (
                        <div className="mt-3 space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleApproveMember(request.id)}
                              className="rounded-md bg-green-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                            >
                              Approve
                            </button>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-xs font-medium text-stone-600">
                                Deny (reason required)
                              </label>
                              <div className="flex gap-2">
                                <input
                                  value={denyDrafts[request.id] ?? ""}
                                  onChange={(e) =>
                                    setDenyDrafts((prev) => ({
                                      ...prev,
                                      [request.id]: e.target.value,
                                    }))
                                  }
                                  placeholder="Reason for denial"
                                  className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleDenyMember(request.id)}
                                  className="shrink-0 rounded-md border border-red-700 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-50"
                                >
                                  Deny
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-stone-600">
                                Ask for more info / resubmit
                              </label>
                              <div className="flex gap-2">
                                <input
                                  value={infoDrafts[request.id] ?? ""}
                                  onChange={(e) =>
                                    setInfoDrafts((prev) => ({
                                      ...prev,
                                      [request.id]: e.target.value,
                                    }))
                                  }
                                  placeholder="What do you need?"
                                  className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleMoreInfoMember(request.id)
                                  }
                                  className="shrink-0 rounded-md border border-amber-700 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-50"
                                >
                                  Request
                                </button>
                              </div>
                            </div>
                          </div>
                          {actionError[request.id] ? (
                            <p className="text-xs text-red-700">
                              {actionError[request.id]}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="text-base font-semibold text-green-950">
            Extra Work Approvals
          </h3>

          {extraRequests.length === 0 ? (
            <p className="mt-3 text-sm text-stone-500">
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
                        {request.estimatedHours} hrs · {request.jobLocation} ·{" "}
                        {new Date(request.submittedAt).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                        request.status === "approved"
                          ? "bg-green-100 text-green-800"
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
                        className="rounded-md bg-green-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
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
          <h3 className="text-base font-semibold text-green-950">
            Visit Extra-Work Comments
          </h3>

          {visitNotes.length === 0 ? (
            <p className="mt-3 text-sm text-stone-500">
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
                      <p className="mt-1 text-stone-700">{note.description}</p>
                      <p className="mt-1 text-xs text-stone-500">
                        Visit ID: {note.jobId}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                        note.status === "approved"
                          ? "bg-green-100 text-green-800"
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
                        className="rounded-md bg-green-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
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
        </Card>
      </div>

      <Card>
        <h3 className="text-base font-semibold text-green-950">
          Field Exception Comments
        </h3>

        {exceptions.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">
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
  );
}
