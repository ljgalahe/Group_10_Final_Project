"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Card } from "@/components/ui";
import { DEMO_CREW_MEMBER } from "@/lib/types";
import {
  addMemberSchedulingRequest,
  loadMemberSchedulingRequests,
  resubmitMemberRequest,
  type MemberRequestKind,
  type MemberSchedulingRequest,
} from "@/components/crew-member/memberSchedulingStorage";
import { formatStatusLabel } from "@/components/crew-lead/visitWorkDefaults";
import { addDays } from "@/components/crew-lead/dateHelpers";

function statusBadgeClass(status: MemberSchedulingRequest["status"]) {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-800";
    case "denied":
      return "bg-red-100 text-red-800";
    case "needs_info":
      return "bg-amber-100 text-amber-900";
    default:
      return "bg-stone-100 text-stone-800";
  }
}

function monthDays(year: number, monthIndex: number) {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const startWeekday = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function isoFor(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Availability calendar + time-off requests (crew member write exception). */
export function CrewMemberAvailabilityPanel({
  today,
}: {
  today: string;
}) {
  const [requests, setRequests] = useState<MemberSchedulingRequest[]>([]);
  const [kind, setKind] = useState<MemberRequestKind>("time_off");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(addDays(today, 1));
  const [reason, setReason] = useState("");
  const [availabilityNotes, setAvailabilityNotes] = useState("");
  const [message, setMessage] = useState("");
  const [resubmitId, setResubmitId] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  const [y, m] = today.split("-").map(Number);
  const [viewYear, setViewYear] = useState(y);
  const [viewMonth, setViewMonth] = useState(m - 1);

  function refresh() {
    setRequests(loadMemberSchedulingRequests());
  }

  useEffect(() => {
    const sync = () => setRequests(loadMemberSchedulingRequests());
    const timer = window.setTimeout(sync, 0);
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  const myRequests = useMemo(
    () =>
      requests.filter((r) => r.memberDemoId === DEMO_CREW_MEMBER.id),
    [requests]
  );

  const requestDateSet = useMemo(() => {
    const set = new Set<string>();
    for (const req of myRequests) {
      let cursor = req.startDate;
      while (cursor <= req.endDate) {
        set.add(cursor);
        cursor = addDays(cursor, 1);
      }
    }
    return set;
  }, [myRequests]);

  function toggleCalendarDate(iso: string) {
    const next = selectedDates.includes(iso)
      ? selectedDates.filter((d) => d !== iso)
      : [...selectedDates, iso].sort();
    setSelectedDates(next);
    if (next.length > 0) {
      setStartDate(next[0]);
      setEndDate(next[next.length - 1]);
    }
  }

  function submitRequest(e: FormEvent) {
    e.preventDefault();
    if (!startDate || !endDate || endDate < startDate) return;
    if (kind === "time_off" && !reason.trim()) return;

    if (resubmitId) {
      resubmitMemberRequest(resubmitId, {
        startDate,
        endDate,
        reason: reason.trim(),
        availabilityNotes: availabilityNotes.trim(),
      });
      setResubmitId(null);
      setMessage("Request resubmitted to management.");
    } else {
      addMemberSchedulingRequest({
        memberDemoId: DEMO_CREW_MEMBER.id,
        memberName: DEMO_CREW_MEMBER.name,
        kind,
        startDate,
        endDate,
        reason: reason.trim(),
        availabilityNotes: availabilityNotes.trim(),
      });
      setMessage(
        kind === "time_off"
          ? "Time-off request submitted."
          : "Availability update submitted."
      );
    }

    setReason("");
    setAvailabilityNotes("");
    setSelectedDates([]);
    refresh();
    window.setTimeout(() => setMessage(""), 3000);
  }

  function beginResubmit(req: MemberSchedulingRequest) {
    setResubmitId(req.id);
    setKind(req.kind);
    setStartDate(req.startDate);
    setEndDate(req.endDate);
    setReason(req.reason);
    setAvailabilityNotes(req.availabilityNotes);
    setSelectedDates([]);
  }

  const cells = monthDays(viewYear, viewMonth);
  const monthLabel = new Date(Date.UTC(viewYear, viewMonth, 1)).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric", timeZone: "UTC" }
  );

  function shiftMonth(delta: number) {
    const d = new Date(Date.UTC(viewYear, viewMonth + delta, 1));
    setViewYear(d.getUTCFullYear());
    setViewMonth(d.getUTCMonth());
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-green-800/20 bg-stone-50">
        <h3 className="text-base font-semibold text-green-950">
          Availability Calendar
        </h3>
        <p className="mt-1 text-sm text-stone-500">
          Tap dates to fill your request range. Highlighted days already have a
          pending or decided request.
        </p>

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="rounded-md border border-stone-300 px-2 py-1 text-xs font-medium text-stone-700 hover:bg-white"
          >
            Prev
          </button>
          <p className="text-sm font-semibold text-green-950">{monthLabel}</p>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="rounded-md border border-stone-300 px-2 py-1 text-xs font-medium text-stone-700 hover:bg-white"
          >
            Next
          </button>
        </div>

        <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-stone-500">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }
            const iso = isoFor(viewYear, viewMonth, day);
            const selected = selectedDates.includes(iso);
            const hasRequest = requestDateSet.has(iso);
            const isToday = iso === today;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => toggleCalendarDate(iso)}
                className={`aspect-square rounded-md border p-0.5 text-[11px] font-semibold transition ${
                  selected
                    ? "border-green-800 bg-green-800 text-white"
                    : hasRequest
                      ? "border-amber-400 bg-amber-50 text-amber-950"
                      : isToday
                        ? "border-green-600 bg-green-50 text-green-950"
                        : "border-stone-200 bg-white text-stone-800 hover:border-green-700"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="border-green-800/20 bg-stone-50">
        <h3 className="text-base font-semibold text-green-950">
          {resubmitId ? "Resubmit Request" : "Time Off & Availability"}
        </h3>
        <p className="mt-1 text-sm text-stone-500">
          Submit time-off or availability updates for manager review.
        </p>

        <form onSubmit={submitRequest} className="mt-3 space-y-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-stone-700">Type</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as MemberRequestKind)}
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
              disabled={!!resubmitId}
            >
              <option value="time_off">Time off</option>
              <option value="availability">Availability update</option>
            </select>
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-stone-700">
                Start date
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-stone-700">
                End date
              </span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                required
              />
            </label>
          </div>
          {kind === "time_off" ? (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-stone-700">
                Reason
              </span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Why do you need time off?"
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                required
              />
            </label>
          ) : (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-stone-700">
                Availability notes
              </span>
              <textarea
                value={availabilityNotes}
                onChange={(e) => setAvailabilityNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Available mornings only, prefer Friday off..."
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                required
              />
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="rounded-md bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              {resubmitId ? "Resubmit to Manager" : "Submit Request"}
            </button>
            {resubmitId ? (
              <button
                type="button"
                onClick={() => {
                  setResubmitId(null);
                  setReason("");
                  setAvailabilityNotes("");
                }}
                className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-white"
              >
                Cancel
              </button>
            ) : null}
          </div>
          {message ? <p className="text-sm text-green-800">{message}</p> : null}
        </form>

        <div className="mt-4 border-t border-stone-200 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Your Requests
          </p>
          {myRequests.length === 0 ? (
            <p className="mt-2 text-sm text-stone-500">No requests yet.</p>
          ) : (
            <ul className="mt-2 max-h-56 space-y-2 overflow-y-auto">
              {myRequests.map((req) => (
                <li
                  key={req.id}
                  className="rounded-md border border-stone-200 bg-white p-2 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-green-950">
                        {req.kind === "time_off" ? "Time off" : "Availability"}
                      </p>
                      <p className="text-xs text-stone-600">
                        {req.startDate}
                        {req.endDate !== req.startDate ? ` → ${req.endDate}` : ""}
                      </p>
                      {req.reason ? (
                        <p className="mt-1 text-xs text-stone-600">{req.reason}</p>
                      ) : null}
                      {req.availabilityNotes ? (
                        <p className="mt-1 text-xs text-stone-600">
                          {req.availabilityNotes}
                        </p>
                      ) : null}
                      {req.status === "denied" && req.denialReason ? (
                        <p className="mt-1 text-xs text-red-700">
                          Denied: {req.denialReason}
                        </p>
                      ) : null}
                      {req.status === "needs_info" && req.managerMessage ? (
                        <p className="mt-1 text-xs text-amber-800">
                          Manager: {req.managerMessage}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadgeClass(req.status)}`}
                    >
                      {formatStatusLabel(req.status)}
                    </span>
                  </div>
                  {req.status === "needs_info" ? (
                    <button
                      type="button"
                      onClick={() => beginResubmit(req)}
                      className="mt-2 text-xs font-semibold text-green-800 hover:underline"
                    >
                      Update &amp; resubmit
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
