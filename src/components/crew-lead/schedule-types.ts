export type ScheduleJob = {
  id: string;
  contractId: string;
  scheduledDate: string;
  status: string;
  customerId: string;
  customerName: string;
  customerIdShort: string;
  address: string;
  contractTitle: string;
  services: string[];
  /** Customer notes (dogs, parking, access) for this property */
  customerNotes: string[];
  lat: number;
  lng: number;
  source: "visit" | "projected";
  /** True when the customer is on automatic Service Hold (credit hold). */
  serviceHold?: boolean;
};

export type ExtraWorkItem = {
  id: string;
  contractId: string;
  title: string;
  description: string | null;
  quotedAmount: number;
  status: string;
};

export type CrewEmployeeHours = {
  id: string;
  name: string;
  hours: number;
};

export type CrewExtraWorkNote = {
  id: string;
  description: string;
  status: "needed" | "pending_approval" | "approved" | "declined";
  /** Estimated or logged hours for this extra work (schedule focus). */
  hours?: number;
};

export type VisitWorkState = {
  employees: CrewEmployeeHours[];
  assignedEmployees: { id: string; name: string; role: string }[];
  completedTaskIds: string[];
  extraWorkNotes: CrewExtraWorkNote[];
  /** Notes taken by the crew lead during / after the visit (not customer notes). */
  crewAdditionalNotes: string;
  /** ISO timestamp when crew started the job */
  jobStartedAt: string | null;
  /** ISO timestamp when crew ended the job */
  jobEndedAt: string | null;
  /** Planned hours for this visit (for vs actual comparison) */
  plannedHours: number;
};

export type FieldExceptionType =
  | "could_not_access"
  | "dog_loose"
  | "equipment_failure"
  | "other";

export type FieldExceptionReport = {
  id: string;
  jobId: string;
  customerName: string;
  address: string;
  type: FieldExceptionType;
  details: string;
  submittedAt: string;
  status: "sent_to_manager";
};
