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
  showCustomerNotes = true,
}: {
  job: ScheduleJob;
  extraWork: ExtraWorkItem[];
  readOnly?: boolean;
  showCustomerNotes?: boolean;
}) {
  return (
    <VisitWorkPanel
      job={job}
      contractExtraWork={extraWork.filter(
        (item) => item.contractId === job.contractId
      )}
      readOnly={readOnly}
      showCustomerNotes={showCustomerNotes}
    />
  );
}
