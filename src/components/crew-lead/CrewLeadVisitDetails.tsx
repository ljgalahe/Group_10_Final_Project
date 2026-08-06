"use client";

import { VisitWorkPanel } from "@/components/crew-lead/VisitWorkPanel";
import type {
  ExtraWorkItem,
  ScheduleJob,
} from "@/components/crew-lead/schedule-types";

/** Crew-lead visit details block for the Visits tab. */
export function CrewLeadVisitDetails({
  job,
  extraWork,
  readOnly = false,
}: {
  job: ScheduleJob;
  extraWork: ExtraWorkItem[];
  readOnly?: boolean;
}) {
  return (
    <VisitWorkPanel
      job={job}
      contractExtraWork={extraWork.filter(
        (item) => item.contractId === job.contractId
      )}
      readOnly={readOnly}
    />
  );
}
