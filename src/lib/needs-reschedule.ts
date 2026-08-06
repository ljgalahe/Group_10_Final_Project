import type { JobRow } from "@/lib/visit-jobs";

/** Minimal visit shape for the shared needs-reschedule rule. */
export type NeedsRescheduleVisit = {
  id: string;
  status: string;
  scheduled_date: string;
  weatherSeverity?: string | null;
};

/**
 * Shared definition: visit was supposed to happen but still needs a new slot.
 * - cancelled / missed / status rescheduled
 * - scheduled (or active/pending) with date before today
 * - JobRow weather markers delayed | rescheduled (weather miss / makeup)
 */
export function visitNeedsReschedule(
  visit: NeedsRescheduleVisit,
  today: string
): boolean {
  const todayKey = today.slice(0, 10);
  const date = visit.scheduled_date.slice(0, 10);
  const status = (visit.status || "").toLowerCase();

  if (
    status === "cancelled" ||
    status === "missed" ||
    status === "rescheduled"
  ) {
    return true;
  }

  if (
    (status === "scheduled" ||
      status === "pending" ||
      status === "in_progress") &&
    date < todayKey
  ) {
    return true;
  }

  const sev = (visit.weatherSeverity || "").toLowerCase();
  if (sev === "delayed" || sev === "rescheduled") {
    return true;
  }

  return false;
}

export function jobNeedsReschedule(job: JobRow, today: string): boolean {
  return visitNeedsReschedule(
    {
      id: job.visitId,
      status: job.status,
      scheduled_date: job.date,
      weatherSeverity: job.weather?.severity ?? null,
    },
    today
  );
}

export function filterJobsNeedingReschedule(
  jobs: JobRow[],
  today: string
): JobRow[] {
  return jobs
    .filter((j) => jobNeedsReschedule(j, today))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function countJobsNeedingReschedule(
  jobs: JobRow[],
  today: string
): number {
  return jobs.filter((j) => jobNeedsReschedule(j, today)).length;
}

export function missReasonForJob(job: JobRow, today: string): string {
  const todayKey = today.slice(0, 10);
  const date = job.date.slice(0, 10);
  const status = (job.status || "").toLowerCase();
  const sev = job.weather?.severity;

  if (sev === "delayed" || sev === "rescheduled") {
    return job.weather?.label
      ? `Weather — ${job.weather.label}`
      : "Weather miss — needs rescheduling";
  }
  if (status === "cancelled") return "Cancelled — needs rescheduling";
  if (status === "missed") return "Missed — needs rescheduling";
  if (status === "rescheduled") return "Marked rescheduled — confirm new date";
  if (
    (status === "scheduled" ||
      status === "pending" ||
      status === "in_progress") &&
    date < todayKey
  ) {
    return "Missed / overdue — past scheduled date";
  }
  return "Needs Rescheduling";
}

/** Real service_visits ids vs demo-day synthetic JobRow ids. */
export function isPersistedVisitId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id
  );
}
