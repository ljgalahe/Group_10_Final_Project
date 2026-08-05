import {
  defaultAssignedEmployees,
  DEFAULT_DAILY_ROSTER,
  type CrewMember,
} from "@/components/crew-lead/crewLeadStorage";
import type { VisitWorkState } from "@/components/crew-lead/schedule-types";
import { DEMO_CREW_MEMBER } from "@/lib/types";

/** Internal labor cost rates used for accountant hourly billing (not customer T&M). */
export const HOURLY_RATES_BY_ROLE: Record<string, number> = {
  "Crew Lead": 38,
  "Crew Leader": 38,
  "Crew Member": 28,
  "Equipment Operator": 32,
};

export const DEFAULT_MEMBER_HOURLY_RATE = 28;

export type VisitLaborEntry = {
  id?: string;
  visit_id: string;
  member_demo_id: string;
  member_name: string;
  member_role: string;
  hours: number;
  hourly_rate: number;
  started_at?: string | null;
  ended_at?: string | null;
};

export type VisitHoursRow = {
  visitId: string;
  scheduledDate: string;
  customerName: string;
  contractTitle: string;
  status: string;
  hours: number;
  hourlyRate: number;
  laborCost: number;
};

const LABOR_V1_PREFIX = "LABOR_V1";

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function hourlyRateForRole(role: string): number {
  return HOURLY_RATES_BY_ROLE[role] ?? DEFAULT_MEMBER_HOURLY_RATE;
}

/** Deterministic completed-visit hours for a roster member (mirrors VisitWorkPanel). */
export function completedHoursForMember(
  visitId: string,
  member: CrewMember
): number {
  const assigned = defaultAssignedEmployees(visitId, DEFAULT_DAILY_ROSTER);
  const index = assigned.findIndex((row) => row.id === member.id);
  if (index < 0) return 0;
  return 3.5 + ((hashString(visitId + member.id) + index) % 5) * 0.5;
}

export function buildLaborEntriesFromState(
  visitId: string,
  state: Pick<
    VisitWorkState,
    "employees" | "assignedEmployees" | "jobStartedAt" | "jobEndedAt"
  >,
  status?: string
): VisitLaborEntry[] {
  const assigned =
    state.assignedEmployees.length > 0
      ? state.assignedEmployees
      : defaultAssignedEmployees(visitId);

  let employees = state.employees;
  if (employees.length === 0 && status === "completed") {
    employees = assigned.map((member, index) => ({
      id: member.id,
      name: member.name,
      hours: 3.5 + ((hashString(visitId + member.id) + index) % 5) * 0.5,
    }));
  }

  return employees.map((employee) => {
    const rosterMatch =
      assigned.find((row) => row.id === employee.id) ??
      assigned.find((row) => row.name === employee.name) ??
      DEFAULT_DAILY_ROSTER.find((row) => row.id === employee.id) ??
      DEFAULT_DAILY_ROSTER.find((row) => row.name === employee.name);
    const role = rosterMatch?.role ?? "Crew Member";
    return {
      visit_id: visitId,
      member_demo_id: employee.id,
      member_name: employee.name,
      member_role: role,
      hours: Number(employee.hours) || 0,
      hourly_rate: hourlyRateForRole(role),
      started_at: state.jobStartedAt,
      ended_at: state.jobEndedAt,
    };
  });
}

export function encodeLaborDescription(entries: VisitLaborEntry[]): string {
  const body = entries
    .map(
      (entry) =>
        `${entry.member_demo_id}:${entry.member_name}:${entry.member_role}:${entry.hours}:${entry.hourly_rate}`
    )
    .join("|");
  return `${LABOR_V1_PREFIX}|${body}`;
}

export function parseLaborDescription(
  visitId: string,
  description: string | null | undefined
): VisitLaborEntry[] | null {
  if (!description?.startsWith(`${LABOR_V1_PREFIX}|`)) return null;
  const parts = description.slice(LABOR_V1_PREFIX.length + 1).split("|");
  const entries: VisitLaborEntry[] = [];
  for (const part of parts) {
    const [member_demo_id, member_name, member_role, hoursRaw, rateRaw] =
      part.split(":");
    if (!member_demo_id || !member_name) continue;
    entries.push({
      visit_id: visitId,
      member_demo_id,
      member_name,
      member_role: member_role || "Crew Member",
      hours: Number(hoursRaw) || 0,
      hourly_rate: Number(rateRaw) || DEFAULT_MEMBER_HOURLY_RATE,
    });
  }
  return entries.length > 0 ? entries : null;
}

export function laborTotals(entries: VisitLaborEntry[]) {
  const hours = entries.reduce((sum, row) => sum + Number(row.hours), 0);
  const amount = entries.reduce(
    (sum, row) => sum + Number(row.hours) * Number(row.hourly_rate),
    0
  );
  return {
    hours: Number(hours.toFixed(2)),
    amount: Number(amount.toFixed(2)),
  };
}

export function startOfWeekSunday(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - day);
  return date.toISOString().slice(0, 10);
}

export function endOfWeekSaturday(isoDate: string): string {
  const [y, m, d] = startOfWeekSunday(isoDate).split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + 6));
  return date.toISOString().slice(0, 10);
}

export function resolveMemberHours(input: {
  visitId: string;
  status: string;
  memberId?: string;
  localState?: VisitWorkState | null;
  dbEntries?: VisitLaborEntry[] | null;
  laborQuantity?: number | null;
  laborDescription?: string | null;
}): number {
  const memberId = input.memberId ?? DEMO_CREW_MEMBER.id;
  const local = input.localState?.employees.find((row) => row.id === memberId);
  if (local && local.hours > 0) return Number(local.hours);

  const fromDb = (input.dbEntries ?? []).find(
    (row) => row.member_demo_id === memberId
  );
  if (fromDb && fromDb.hours > 0) return Number(fromDb.hours);

  const fromDescription = parseLaborDescription(
    input.visitId,
    input.laborDescription
  )?.find((row) => row.member_demo_id === memberId);
  if (fromDescription && fromDescription.hours > 0) {
    return Number(fromDescription.hours);
  }

  if (input.status === "completed") {
    const member =
      DEFAULT_DAILY_ROSTER.find((row) => row.id === memberId) ?? {
        id: DEMO_CREW_MEMBER.id,
        name: DEMO_CREW_MEMBER.name,
        role: DEMO_CREW_MEMBER.roleTitle,
      };
    const completed = completedHoursForMember(input.visitId, member);
    if (completed > 0) return completed;

    const assigned = defaultAssignedEmployees(input.visitId);
    if (
      assigned.some((row) => row.id === memberId) &&
      input.laborQuantity &&
      input.laborQuantity > 0
    ) {
      return Number((input.laborQuantity / assigned.length).toFixed(2));
    }
  }

  return 0;
}

export function rollupHours(
  rows: VisitHoursRow[],
  today: string
): { todayHours: number; weekHours: number; visitCountWithHours: number } {
  const weekStart = startOfWeekSunday(today);
  const weekEnd = endOfWeekSaturday(today);
  let todayHours = 0;
  let weekHours = 0;
  let visitCountWithHours = 0;

  for (const row of rows) {
    if (row.hours <= 0) continue;
    visitCountWithHours += 1;
    if (row.scheduledDate === today) todayHours += row.hours;
    if (row.scheduledDate >= weekStart && row.scheduledDate <= weekEnd) {
      weekHours += row.hours;
    }
  }

  return {
    todayHours: Number(todayHours.toFixed(2)),
    weekHours: Number(weekHours.toFixed(2)),
    visitCountWithHours,
  };
}

export function entriesToAccountantEmployees(entries: VisitLaborEntry[]) {
  return entries.map((entry) => ({
    name: entry.member_name,
    role: entry.member_role,
    hours: Number(entry.hours),
    payRate: Number(entry.hourly_rate),
    pay: Number((Number(entry.hours) * Number(entry.hourly_rate)).toFixed(2)),
  }));
}
