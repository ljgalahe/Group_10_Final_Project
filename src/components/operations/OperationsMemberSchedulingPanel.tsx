"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui";
import { formatStatusLabel } from "@/components/crew-lead/visitWorkDefaults";
import {
  approveMemberRequest,
  denyMemberRequest,
  loadMemberSchedulingRequests,
  markMemberRequestSeen,
  requestMoreInfoMemberRequest,
  type MemberSchedulingRequest,
} from "@/components/crew-member/memberSchedulingStorage";

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

/** Operations inbox for crew member availability / time-off requests. */
export function OperationsMemberSchedulingPanel() {
  const [memberRequests, setMemberRequests] = useState<
    MemberSchedulingRequest[]
  >([]);
  const [denyDrafts, setDenyDrafts] = useState<Record<string, string>>({});
  const [infoDrafts, setInfoDrafts] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<Record<string, string>>({});

  function refresh() {
    setMemberRequests(loadMemberSchedulingRequests());
  }

  useEffect(() => {
    refresh();
    const onStorage = () => refresh();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const newMemberRequestCount = useMemo(
    () =>
      memberRequests.filter(
        (r) => r.status === "pending" && !r.seenByManager
      ).length,
    [memberRequests]
  );

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
        [id]: "Describe what information you need.",
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
    <Card>
      <h2 className="text-lg font-semibold text-green-950">
        Crew Member Scheduling
      </h2>
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
                          <p className="mt-1 text-stone-700">{request.reason}</p>
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
                        <button
                          type="button"
                          onClick={() => handleApproveMember(request.id)}
                          className="rounded-md bg-green-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                        >
                          Approve
                        </button>
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
  );
}
