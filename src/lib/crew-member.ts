import {
  defaultAssignedEmployees,
  DEFAULT_DAILY_ROSTER,
  type CrewMember,
} from "@/components/crew-lead/crewLeadStorage";
import { DEMO_CREW_LEAD_NAME, DEMO_CREW_MEMBER } from "@/lib/types";

export { DEMO_CREW_LEAD_NAME, DEMO_CREW_MEMBER };

/** Stable assigned crew for a job (works on server + client; mirrors localStorage defaults). */
export function assignedCrewForJob(
  jobId: string,
  roster: CrewMember[] = DEFAULT_DAILY_ROSTER
): CrewMember[] {
  return defaultAssignedEmployees(jobId, roster);
}

export function jobIncludesCrewMember(
  jobId: string,
  memberId: string = DEMO_CREW_MEMBER.id
): boolean {
  return assignedCrewForJob(jobId).some((m) => m.id === memberId);
}

/** Filter schedule/visit jobs to those assigned to the demo (or given) crew member. */
export function filterJobsForCrewMember<T extends { id: string }>(
  jobs: T[],
  memberId: string = DEMO_CREW_MEMBER.id
): T[] {
  return jobs.filter((job) => jobIncludesCrewMember(job.id, memberId));
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Deterministic scheduled arrival label for a visit (demo). */
export function scheduledArrivalForJob(jobId: string): string {
  const minutesPastEight = (hashString(jobId) % 10) * 30;
  const hour = 8 + Math.floor(minutesPastEight / 60);
  const minute = minutesPastEight % 60;
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = ((hour + 11) % 12) + 1;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
}

/** Estimated duration in hours (demo). */
export function estimatedDurationHours(jobId: string, plannedHours = 4): number {
  const bump = hashString(jobId + "-duration") % 3;
  return plannedHours + bump * 0.5;
}

export function mapsDirectionsUrl(address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

export function coworkerNamesForJob(
  jobId: string,
  selfId: string = DEMO_CREW_MEMBER.id
): string[] {
  return assignedCrewForJob(jobId)
    .filter((m) => m.id !== selfId)
    .map((m) => m.name);
}

export function crewLeadNameForJob(): string {
  return DEMO_CREW_LEAD_NAME;
}
