import type { Contract } from "@/lib/types";

export type RenewalStatus = "current" | "expiring" | "expired";

/** Customer list sort: active → approved → paused → completed, then others. */
const CUSTOMER_STATUS_SORT_ORDER = [
  "active",
  "approved",
  "paused",
  "completed",
  "scheduled",
  "needs_scheduling",
  "sent_to_customer_awaiting_approval",
  "draft",
  "cancelled",
  "canceled",
] as const;

/**
 * Customer visibility for the Ops pipeline:
 * - Proposed (`pending_customer`) — needs review & signature
 * - Signed / approved (`approved` or legacy rows)
 * Legacy Management-approved rows without signature still count as visible.
 */
export function isContractFullyApproved(
  contract: Pick<Contract, "approval_state" | "customer_signed_at">
): boolean {
  const state = contract.approval_state;
  if (state === "pending_customer") return true;
  if (contract.customer_signed_at) return true;
  return !state || state === "approved";
}

/** True while Ops has a draft awaiting customer signature. */
export function isContractPendingCustomer(
  contract: Pick<Contract, "approval_state" | "customer_signed_at">
): boolean {
  return (
    contract.approval_state === "pending_customer" &&
    !contract.customer_signed_at
  );
}

/** True while Ops has sent a draft awaiting Management approval (legacy path). */
export function isContractAwaitingApproval(
  contract: Pick<Contract, "approval_state">
): boolean {
  return contract.approval_state === "pending_approvals";
}

/** @deprecated Use isContractAwaitingApproval — dual approval is no longer required. */
export function isContractAwaitingDualApproval(
  contract: Pick<Contract, "approval_state">
): boolean {
  return isContractAwaitingApproval(contract);
}

/** True when service_paused_until is today or in the future. */
export function isContractServicePaused(
  servicePausedUntil?: string | null,
  today: Date = new Date()
): boolean {
  if (!servicePausedUntil) return false;
  const pauseEnd = new Date(`${servicePausedUntil}T00:00:00`);
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);
  return pauseEnd.getTime() >= startOfToday.getTime();
}

/**
 * Ops / Manager / Customer display status for the survey→quote→sign pipeline.
 */
export function getContractDisplayStatus(
  contract: Pick<
    Contract,
    | "status"
    | "approval_state"
    | "customer_signed_at"
    | "service_paused_until"
  > & { has_service_visit?: boolean }
): string {
  const state = contract.approval_state;
  if (state === "pending_approvals") return "waiting_for_approval";
  if (state === "changes_requested") return "changes_requested";
  if (state === "draft") return "draft";
  if (state === "pending_customer" && !contract.customer_signed_at) {
    return "sent_to_customer_awaiting_approval";
  }
  if (contract.customer_signed_at || state === "approved") {
    if (contract.status === "completed") return "completed";
    if (
      contract.status === "active" &&
      isContractServicePaused(contract.service_paused_until)
    ) {
      return "paused";
    }
    if (contract.has_service_visit || contract.status === "active") {
      // Prefer scheduled when Ops has placed service visits (caller may set flag).
      if (contract.has_service_visit) return "scheduled";
      return contract.customer_signed_at ? "approved" : contract.status;
    }
  }
  return contract.status;
}

/** Sort key for customer contracts list (lower = earlier). */
export function getCustomerContractSortRank(displayStatus: string): number {
  const key = displayStatus.trim().toLowerCase();
  const idx = CUSTOMER_STATUS_SORT_ORDER.indexOf(
    key as (typeof CUSTOMER_STATUS_SORT_ORDER)[number]
  );
  return idx === -1 ? CUSTOMER_STATUS_SORT_ORDER.length : idx;
}

/** Prefer renewal_date; fall back to season_end. */
export function getContractEndDate(
  contract: Pick<Contract, "renewal_date" | "season_end">
) {
  return contract.renewal_date || contract.season_end;
}

export function getRenewalStatus(
  contract: Pick<Contract, "renewal_date" | "season_end">,
  today: Date = new Date()
): RenewalStatus {
  const endStr = getContractEndDate(contract);
  const end = new Date(`${endStr}T00:00:00`);
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);

  const daysUntilEnd = Math.floor(
    (end.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilEnd < 0) return "expired";
  if (daysUntilEnd <= 30) return "expiring";
  return "current";
}
