/**
 * Shared display labels for statuses across tabs.
 * Storage keys stay snake_case; UI shows Title Case (or uppercase via StatusBadge CSS).
 */

/** Normalize raw status strings to a canonical color/lookup key. */
export function normalizeStatusKey(status: string): string {
  const key = status.trim().toLowerCase().replaceAll(" ", "_");
  if (key === "complete") return "completed";
  if (key === "cancelled") return "canceled";
  if (key === "overdue") return "past_due";
  if (key === "service_hold") return "on_hold";
  if (key === "in_progress") return "in progress";
  return key;
}

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  retired: "Retired",
  draft: "Draft",
  sent: "Sent",
  upcoming: "Upcoming",
  paid: "Paid",
  past_due: "Past Due",
  partially_paid: "Partially Paid",
  partial: "In Progress",
  canceled: "Canceled",
  voided: "Voided",
  applied: "Applied",
  unapplied: "Unapplied",
  void: "Void",
  disputed: "Disputed",
  open: "Open",
  "in progress": "In Progress",
  in_progress: "In Progress",
  due_now: "Due Now",
  resolved: "Resolved",
  scheduled: "Scheduled",
  on_hold: "On Hold",
  completed: "Completed",
  rescheduled: "Rescheduled",
  closed: "Closed",
  approved: "Approved",
  quoted: "Quoted",
  routine: "Routine",
  high: "High",
  emergency: "Emergency",
  seasonal: "Seasonal",
  pending: "Pending",
  current: "Current",
  expiring: "Expiring",
  expired: "Expired",
  controls_breached: "Controls Breached",
  unprofitable: "Unprofitable",
  ready: "Ready",
  posted: "Posted",
  pending_approval: "Pending Approval",
  pending_manager_approval: "Pending Manager Approval",
  pending_customer: "Pending Customer",
  needs_review_and_signature: "Needs Review And Signature",
  sent_to_customer_awaiting_approval: "Sent To Customer — Awaiting Approval",
  needs_scheduling: "Needs Scheduling",
  survey_scheduled: "Survey Scheduled",
  budgeted: "Budgeted",
  new: "New",
  billable: "Billable",
  missing_labor: "Missing Labor Entry",
};

/** Title Case label for chips, filters, and tables. */
export function formatStatusLabel(status: string): string {
  const key = normalizeStatusKey(status);
  if (STATUS_LABELS[key]) return STATUS_LABELS[key];
  return key
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
