import type {
  CrewEmployeeHours,
  CrewExtraWorkNote,
  FieldExceptionReport,
  VisitWorkState,
} from "@/components/crew-lead/schedule-types";

export type CrewMember = {
  id: string;
  name: string;
  role: string;
};

export type ManagementExtraWorkRequest = {
  id: string;
  customerName: string;
  jobLocation: string;
  description: string;
  estimatedHours: number;
  status: "pending_approval" | "approved" | "declined";
  submittedAt: string;
};

const VISIT_WORK_PREFIX = "greenscape-crew-visit-work:";
const ROSTER_KEY = "greenscape-crew-daily-roster";
const EXTRA_REQUESTS_KEY = "greenscape-crew-extra-approvals";

export const DEFAULT_DAILY_ROSTER: CrewMember[] = [
  { id: "crew-1", name: "Jordan Miles", role: "Crew Member" },
  { id: "crew-2", name: "Alex Rivera", role: "Crew Member" },
  { id: "crew-3", name: "Sam Patel", role: "Crew Member" },
  { id: "crew-4", name: "Casey Nguyen", role: "Equipment Operator" },
];

export function emptyVisitWorkState(): VisitWorkState {
  return {
    employees: [],
    assignedEmployees: [],
    completedTaskIds: [],
    extraWorkNotes: [],
    jobStartedAt: null,
    jobEndedAt: null,
    plannedHours: 4,
  };
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Default 2–3 assigned employees from the daily roster for a visit. */
export function defaultAssignedEmployees(
  jobId: string,
  roster: CrewMember[] = DEFAULT_DAILY_ROSTER
): CrewMember[] {
  if (roster.length === 0) return [];
  const start = hashString(jobId) % roster.length;
  const count = 2 + (hashString(jobId + "-count") % 2); // 2 or 3
  const assigned: CrewMember[] = [];
  for (let i = 0; i < count; i += 1) {
    assigned.push(roster[(start + i) % roster.length]);
  }
  return assigned;
}

export function loadDailyRoster(): CrewMember[] {
  if (typeof window === "undefined") return DEFAULT_DAILY_ROSTER;
  try {
    const raw = window.localStorage.getItem(ROSTER_KEY);
    if (!raw) return DEFAULT_DAILY_ROSTER;
    const parsed = JSON.parse(raw) as CrewMember[];
    return parsed.length > 0 ? parsed : DEFAULT_DAILY_ROSTER;
  } catch {
    return DEFAULT_DAILY_ROSTER;
  }
}

export function saveDailyRoster(roster: CrewMember[]) {
  window.localStorage.setItem(ROSTER_KEY, JSON.stringify(roster));
}

export function loadVisitWorkState(jobId: string): VisitWorkState {
  if (typeof window === "undefined") return emptyVisitWorkState();
  try {
    const raw = window.localStorage.getItem(VISIT_WORK_PREFIX + jobId);
    if (!raw) {
      const assigned = defaultAssignedEmployees(jobId, loadDailyRoster());
      return {
        ...emptyVisitWorkState(),
        assignedEmployees: assigned,
      };
    }
    const parsed = JSON.parse(raw) as VisitWorkState;
    const assigned =
      parsed.assignedEmployees && parsed.assignedEmployees.length > 0
        ? parsed.assignedEmployees
        : defaultAssignedEmployees(jobId, loadDailyRoster());
    return {
      employees: parsed.employees ?? [],
      assignedEmployees: assigned,
      completedTaskIds: parsed.completedTaskIds ?? [],
      extraWorkNotes: parsed.extraWorkNotes ?? [],
      jobStartedAt: parsed.jobStartedAt ?? null,
      jobEndedAt: parsed.jobEndedAt ?? null,
      plannedHours:
        typeof parsed.plannedHours === "number" ? parsed.plannedHours : 4,
    };
  } catch {
    return {
      ...emptyVisitWorkState(),
      assignedEmployees: defaultAssignedEmployees(jobId, loadDailyRoster()),
    };
  }
}

export function saveVisitWorkState(jobId: string, state: VisitWorkState) {
  window.localStorage.setItem(
    VISIT_WORK_PREFIX + jobId,
    JSON.stringify(state)
  );
}

export function getAssignedEmployeesForJob(jobId: string): CrewMember[] {
  return loadVisitWorkState(jobId).assignedEmployees ?? [];
}

/**
 * Fills in a completed visit so it looks fully finished:
 * all tasks checked, labor hours calculated, extra work approved.
 */
export function buildCompletedVisitState(
  jobId: string,
  taskIds: string[],
  existing?: VisitWorkState | null,
  hasContractExtraWork = false
): VisitWorkState {
  const base = existing ?? loadVisitWorkState(jobId);
  const roster = loadDailyRoster();
  const assigned =
    base.assignedEmployees.length > 0
      ? base.assignedEmployees
      : defaultAssignedEmployees(jobId, roster);

  const employees: CrewEmployeeHours[] =
    base.employees.length > 0
      ? base.employees
      : assigned.map((member, index) => ({
          id: member.id,
          name: member.name,
          hours: 3.5 + ((hashString(jobId + member.id) + index) % 5) * 0.5,
        }));

  let extraWorkNotes = (base.extraWorkNotes ?? []).map((note) => ({
    ...note,
    status: "approved" as const,
  }));

  if (extraWorkNotes.length === 0 && hasContractExtraWork) {
    // Contract extras are shown separately; keep notes empty but approved path covered.
  } else if (extraWorkNotes.length === 0) {
    extraWorkNotes = [
      {
        id: `completed-extra-${jobId}`,
        description:
          "Site conditions required minor additional cleanup; approved with completed visit.",
        status: "approved",
      },
    ];
  }

  const totalLabor = employees.reduce((sum, row) => sum + row.hours, 0);
  const plannedHours = base.plannedHours || Math.max(4, Math.round(totalLabor));
  const started =
    base.jobStartedAt ??
    new Date(Date.now() - totalLabor * 60 * 60 * 1000).toISOString();
  const ended = base.jobEndedAt ?? new Date().toISOString();

  return {
    assignedEmployees: assigned,
    employees,
    completedTaskIds: Array.from(new Set(taskIds)),
    extraWorkNotes,
    jobStartedAt: started,
    jobEndedAt: ended,
    plannedHours,
  };
}

/** Load visit state; for completed jobs, ensure a fully finished view and persist it. */
export function loadVisitWorkStateForStatus(
  jobId: string,
  status: string,
  taskIds: string[] = [],
  hasContractExtraWork = false
): VisitWorkState {
  const existing = loadVisitWorkState(jobId);
  if (status !== "completed") return existing;

  const completed = buildCompletedVisitState(
    jobId,
    taskIds,
    existing,
    hasContractExtraWork
  );
  if (typeof window !== "undefined") {
    saveVisitWorkState(jobId, completed);
  }
  return completed;
}

export function loadManagementExtraRequests(): ManagementExtraWorkRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(EXTRA_REQUESTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ManagementExtraWorkRequest[];
  } catch {
    return [];
  }
}

export function saveManagementExtraRequests(
  requests: ManagementExtraWorkRequest[]
) {
  window.localStorage.setItem(EXTRA_REQUESTS_KEY, JSON.stringify(requests));
}

export function addManagementExtraRequest(
  input: Omit<ManagementExtraWorkRequest, "id" | "submittedAt" | "status">
): ManagementExtraWorkRequest {
  const request: ManagementExtraWorkRequest = {
    ...input,
    id: crypto.randomUUID(),
    status: "pending_approval",
    submittedAt: new Date().toISOString(),
  };
  const existing = loadManagementExtraRequests();
  saveManagementExtraRequests([request, ...existing]);
  return request;
}

const EXCEPTION_KEY = "greenscape-crew-field-exceptions";

export function loadFieldExceptions(): FieldExceptionReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(EXCEPTION_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FieldExceptionReport[];
  } catch {
    return [];
  }
}

export function saveFieldExceptions(reports: FieldExceptionReport[]) {
  window.localStorage.setItem(EXCEPTION_KEY, JSON.stringify(reports));
}

export function addFieldException(
  input: Omit<FieldExceptionReport, "id" | "submittedAt" | "status">
): FieldExceptionReport {
  const report: FieldExceptionReport = {
    ...input,
    id: crypto.randomUUID(),
    submittedAt: new Date().toISOString(),
    status: "sent_to_manager",
  };
  saveFieldExceptions([report, ...loadFieldExceptions()]);
  return report;
}

export type { CrewEmployeeHours, CrewExtraWorkNote };
