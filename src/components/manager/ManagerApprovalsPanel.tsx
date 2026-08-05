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

/**
 * Manager inbox for crew-lead extra-work approvals and field exceptions.
 * Crew member time-off / availability is reviewed by Operations.
 */
export function ManagerApprovalsPanel({
  visitLabels = {},
}: {
  visitLabels?: Record<string, string>;
}) {
  const [extraRequests, setExtraRequests] = useState<
    ManagementExtraWorkRequest[]
  >([]);
  const [visitNotes, setVisitNotes] = useState<VisitExtraWorkItem[]>([]);
  const [exceptions, setExceptions] = useState<FieldExceptionReport[]>([]);

  function refresh() {
    setExtraRequests(loadManagementExtraRequests());
    setVisitNotes(loadAllVisitExtraWorkNotes());
    setExceptions(loadFieldExceptions());
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
    return fromDashboard + fromVisits;
  }, [extraRequests, visitNotes]);

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

  return (
    <div className="space-y-6">
      <Card className="border-amber-200 bg-amber-50/40">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-green-950">
              Approvals & Crew Alerts
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              Extra-work and field exceptions. Crew member time-off is handled by
              Operations.
            </p>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
            {pendingExtraCount} pending approval
            {pendingExtraCount === 1 ? "" : "s"}
          </span>
        </div>
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
