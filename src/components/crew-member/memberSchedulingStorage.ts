/**
 * Demo-localStorage sync for crew member availability / time-off requests.
 * Mirrors the Crew Lead extra-work approvals pattern so Manager dashboard stays in sync.
 */

export type MemberRequestKind = "availability" | "time_off";
export type MemberRequestStatus =
  | "pending"
  | "approved"
  | "denied"
  | "needs_info";

export type MemberSchedulingRequest = {
  id: string;
  memberDemoId: string;
  memberName: string;
  kind: MemberRequestKind;
  startDate: string;
  endDate: string;
  reason: string;
  availabilityNotes: string;
  status: MemberRequestStatus;
  denialReason: string | null;
  managerMessage: string | null;
  /** Green "new/unseen" indicator on manager inbox until opened/acted on. */
  seenByManager: boolean;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "greenscape-member-scheduling-requests";

export function loadMemberSchedulingRequests(): MemberSchedulingRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MemberSchedulingRequest[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMemberSchedulingRequests(
  requests: MemberSchedulingRequest[]
) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
}

export function addMemberSchedulingRequest(
  input: Omit<
    MemberSchedulingRequest,
    | "id"
    | "status"
    | "denialReason"
    | "managerMessage"
    | "seenByManager"
    | "createdAt"
    | "updatedAt"
  >
): MemberSchedulingRequest {
  const now = new Date().toISOString();
  const request: MemberSchedulingRequest = {
    ...input,
    id: crypto.randomUUID(),
    status: "pending",
    denialReason: null,
    managerMessage: null,
    seenByManager: false,
    createdAt: now,
    updatedAt: now,
  };
  saveMemberSchedulingRequests([
    request,
    ...loadMemberSchedulingRequests(),
  ]);
  return request;
}

export function updateMemberSchedulingRequest(
  id: string,
  patch: Partial<MemberSchedulingRequest>
): MemberSchedulingRequest | null {
  const list = loadMemberSchedulingRequests();
  const index = list.findIndex((row) => row.id === id);
  if (index < 0) return null;
  const next: MemberSchedulingRequest = {
    ...list[index],
    ...patch,
    id: list[index].id,
    updatedAt: new Date().toISOString(),
  };
  list[index] = next;
  saveMemberSchedulingRequests(list);
  return next;
}

export function markMemberRequestSeen(id: string) {
  updateMemberSchedulingRequest(id, { seenByManager: true });
}

export function approveMemberRequest(id: string) {
  updateMemberSchedulingRequest(id, {
    status: "approved",
    denialReason: null,
    managerMessage: null,
    seenByManager: true,
  });
}

export function denyMemberRequest(id: string, reason: string) {
  updateMemberSchedulingRequest(id, {
    status: "denied",
    denialReason: reason.trim(),
    seenByManager: true,
  });
}

export function requestMoreInfoMemberRequest(id: string, message: string) {
  updateMemberSchedulingRequest(id, {
    status: "needs_info",
    managerMessage: message.trim(),
    seenByManager: true,
  });
}

/** Crew member resubmits after manager asks for more info. */
export function resubmitMemberRequest(
  id: string,
  patch: {
    startDate: string;
    endDate: string;
    reason: string;
    availabilityNotes: string;
  }
) {
  updateMemberSchedulingRequest(id, {
    ...patch,
    status: "pending",
    denialReason: null,
    managerMessage: null,
    seenByManager: false,
  });
}
