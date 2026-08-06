"use client";

import { useEffect, useState } from "react";
import { syncMemberSelfClockLabor } from "@/app/actions/labor";
import {
  loadVisitWorkState,
  saveVisitWorkState,
} from "@/components/crew-lead/crewLeadStorage";
import type { ScheduleJob } from "@/components/crew-lead/schedule-types";
import {
  formatClockDuration,
  loadMemberClock,
  memberClockElapsedMs,
  memberClockHours,
  saveMemberClock,
  type MemberClockState,
} from "@/components/crew-member/memberClockStorage";
import { DEMO_CREW_MEMBER } from "@/lib/types";

function applyMemberHoursToVisitWork(
  visitId: string,
  hours: number,
  session: { startedAt: string | null; endedAt: string | null }
) {
  const state = loadVisitWorkState(visitId);
  const memberId = DEMO_CREW_MEMBER.id;
  const employees = state.employees.filter((row) => row.id !== memberId);
  employees.push({
    id: memberId,
    name: DEMO_CREW_MEMBER.name,
    hours,
  });

  const assigned = state.assignedEmployees.some((row) => row.id === memberId)
    ? state.assignedEmployees
    : [
        ...state.assignedEmployees,
        {
          id: memberId,
          name: DEMO_CREW_MEMBER.name,
          role: DEMO_CREW_MEMBER.roleTitle,
        },
      ];

  const next = {
    ...state,
    employees,
    assignedEmployees: assigned,
  };
  saveVisitWorkState(visitId, next);

  void syncMemberSelfClockLabor({
    visitId,
    memberId,
    memberName: DEMO_CREW_MEMBER.name,
    memberRole: DEMO_CREW_MEMBER.roleTitle,
    hours,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
  });

  return hours;
}

/** Per-job Clock In / Out with a live timer for the demo crew member. */
export function CrewMemberJobClock({
  job,
  onHoursChange,
}: {
  job: ScheduleJob;
  onHoursChange?: (hours: number) => void;
}) {
  const [clock, setClock] = useState<MemberClockState>(() =>
    loadMemberClock(job.id, DEMO_CREW_MEMBER.id)
  );
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setClock(loadMemberClock(job.id, DEMO_CREW_MEMBER.id));
    setNowMs(Date.now());
  }, [job.id]);

  const isClockedIn = !!clock.clockedInAt;

  useEffect(() => {
    if (!isClockedIn) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [isClockedIn]);

  const elapsedMs = memberClockElapsedMs(clock, nowMs);
  const liveHours = memberClockHours(clock, nowMs);

  useEffect(() => {
    if (!isClockedIn) return;
    onHoursChange?.(liveHours);
    // Parent may pass an inline callback; only re-notify when hours tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally omit onHoursChange
  }, [isClockedIn, liveHours]);
  const canClock =
    job.source !== "projected" &&
    job.status !== "completed" &&
    job.status !== "cancelled";

  function clockIn() {
    if (!canClock || clock.clockedInAt) return;
    const next: MemberClockState = {
      ...clock,
      clockedInAt: new Date().toISOString(),
    };
    saveMemberClock(next);
    setClock(next);
    setNowMs(Date.now());
  }

  function clockOut() {
    if (!canClock || !clock.clockedInAt) return;
    const endedAt = new Date().toISOString();
    const startedAt = clock.clockedInAt;
    const sessionMs = Math.max(
      0,
      new Date(endedAt).getTime() - new Date(startedAt).getTime()
    );
    const next: MemberClockState = {
      ...clock,
      clockedInAt: null,
      accumulatedMs: clock.accumulatedMs + sessionMs,
      lastClockedOutAt: endedAt,
    };
    saveMemberClock(next);
    setClock(next);
    setNowMs(Date.now());

    const hours = memberClockHours(next);
    applyMemberHoursToVisitWork(job.id, hours, {
      startedAt,
      endedAt,
    });
    onHoursChange?.(hours);
  }

  return (
    <div className="mt-3 rounded-md border border-stone-200 bg-stone-50 px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-stone-500">Your time clock</p>
          <p
            className={`mt-0.5 font-mono text-lg font-semibold tracking-tight ${
              isClockedIn ? "text-green-800" : "text-green-950"
            }`}
            aria-live="polite"
          >
            {formatClockDuration(elapsedMs)}
          </p>
          <p className="text-xs text-stone-500">
            {isClockedIn
              ? `Clocked in · ${liveHours.toFixed(2)} hrs`
              : liveHours > 0
                ? `${liveHours.toFixed(2)} hrs logged today`
                : "Not clocked in"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={clockIn}
            disabled={!canClock || isClockedIn}
            className="rounded-md bg-green-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clock In
          </button>
          <button
            type="button"
            onClick={clockOut}
            disabled={!canClock || !isClockedIn}
            className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-800 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clock Out
          </button>
        </div>
      </div>
      {!canClock ? (
        <p className="mt-2 text-xs text-stone-500">
          Clocking is unavailable for {job.status} visits.
        </p>
      ) : null}
    </div>
  );
}
