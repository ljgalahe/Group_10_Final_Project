import type { ScheduleJob } from "@/components/crew-lead/schedule-types";
import {
  SCHEDULE_CREW,
  crewPayTotal,
  demoProofForCompletedVisit,
  generateDailySampleJobs,
} from "@/lib/visit-demo";
import type { JobRow } from "@/lib/visit-jobs";

/** Map crew schedule jobs into calendar JobRows (shared by lead + member views). */
export function scheduleJobsToJobRows(jobs: ScheduleJob[]): JobRow[] {
  const samples = new Map(
    generateDailySampleJobs().map((j) => [j.visitId, j] as const)
  );
  return jobs.map((job) => {
    const overlay = SCHEDULE_CREW[job.id];
    const sample = samples.get(job.id);
    const crew = overlay?.crew ?? sample?.crew ?? [];
    const jobLabel =
      overlay?.jobLabel ??
      sample?.jobLabel ??
      (job.services.length > 0
        ? job.services.join(", ")
        : job.contractTitle);
    const proof =
      sample?.proof ??
      (job.status === "completed"
        ? demoProofForCompletedVisit(job.id, job.scheduledDate, jobLabel)
        : null);
    return {
      visitId: job.id,
      companyName: job.customerName,
      location: job.address,
      jobLabel,
      date: job.scheduledDate,
      status: job.status,
      crew,
      crewPay: crew.length ? crewPayTotal(crew) : (sample?.crewPay ?? 0),
      costTotal: sample?.costTotal ?? 0,
      weather: sample?.weather ?? null,
      proof,
    };
  });
}
