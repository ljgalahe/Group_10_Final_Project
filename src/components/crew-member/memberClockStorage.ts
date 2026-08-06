/**
 * Per-crew-member visit clock (Clock In / Out).
 * Scoped by member so Crew Lead jobStartedAt / jobEndedAt stay untouched.
 */

export type MemberClockState = {
  visitId: string;
  memberId: string;
  /** ISO timestamp when currently clocked in; null when clocked out. */
  clockedInAt: string | null;
  /** Completed session milliseconds for this visit (excludes active session). */
  accumulatedMs: number;
  lastClockedOutAt: string | null;
};

const STORAGE_PREFIX = "greenscape-member-clock:";

function storageKey(visitId: string, memberId: string) {
  return `${STORAGE_PREFIX}${memberId}:${visitId}`;
}

export function emptyMemberClock(
  visitId: string,
  memberId: string
): MemberClockState {
  return {
    visitId,
    memberId,
    clockedInAt: null,
    accumulatedMs: 0,
    lastClockedOutAt: null,
  };
}

export function loadMemberClock(
  visitId: string,
  memberId: string
): MemberClockState {
  if (typeof window === "undefined") {
    return emptyMemberClock(visitId, memberId);
  }
  try {
    const raw = window.localStorage.getItem(storageKey(visitId, memberId));
    if (!raw) return emptyMemberClock(visitId, memberId);
    const parsed = JSON.parse(raw) as Partial<MemberClockState>;
    return {
      visitId,
      memberId,
      clockedInAt:
        typeof parsed.clockedInAt === "string" ? parsed.clockedInAt : null,
      accumulatedMs:
        typeof parsed.accumulatedMs === "number" && parsed.accumulatedMs >= 0
          ? parsed.accumulatedMs
          : 0,
      lastClockedOutAt:
        typeof parsed.lastClockedOutAt === "string"
          ? parsed.lastClockedOutAt
          : null,
    };
  } catch {
    return emptyMemberClock(visitId, memberId);
  }
}

export function saveMemberClock(state: MemberClockState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    storageKey(state.visitId, state.memberId),
    JSON.stringify(state)
  );
}

/** Total elapsed ms including an active session. */
export function memberClockElapsedMs(
  state: MemberClockState,
  nowMs: number = Date.now()
): number {
  let total = state.accumulatedMs;
  if (state.clockedInAt) {
    const started = new Date(state.clockedInAt).getTime();
    if (!Number.isNaN(started)) {
      total += Math.max(0, nowMs - started);
    }
  }
  return total;
}

export function memberClockHours(state: MemberClockState, nowMs?: number) {
  return Number((memberClockElapsedMs(state, nowMs) / (1000 * 60 * 60)).toFixed(2));
}

/** Display as H:MM:SS (hours may exceed 24). */
export function formatClockDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
