import type { Contract } from "@/lib/types";

export type RenewalStatus = "current" | "expiring" | "expired";

/**
 * Dual-approval gate: customers only see contracts once both Manager and
 * Accountant have approved (`approval_state === "approved"`), or legacy rows
 * with no approval_state set.
 */
export function isContractFullyApproved(
  contract: Pick<Contract, "approval_state">
): boolean {
  const state = contract.approval_state;
  return !state || state === "approved";
}

/** True while Ops has sent a draft for Manager + Accountant dual approval. */
export function isContractAwaitingDualApproval(
  contract: Pick<Contract, "approval_state">
): boolean {
  return contract.approval_state === "pending_approvals";
}

/**
 * Status shown in Ops / Manager / Accountant tables and detail.
 * Pending dual approval maps to Waiting For Approval (via StatusBadge Title Case).
 */
export function getContractDisplayStatus(
  contract: Pick<Contract, "status" | "approval_state">
): string {
  const state = contract.approval_state;
  if (state === "pending_approvals") return "waiting_for_approval";
  if (state === "changes_requested") return "changes_requested";
  if (state === "draft") return "draft";
  return contract.status;
}

/** Prefer renewal_date; fall back to season_end. */
export function getContractEndDate(contract: Pick<Contract, "renewal_date" | "season_end">) {
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
