import { cookies } from "next/headers";
import type { UserRole } from "@/lib/types";
import { DEMO_CUSTOMER_ID } from "@/lib/types";

export const VIEW_ROLE_COOKIE = "greenscape_view_role";
export const VIEW_CUSTOMER_COOKIE = "greenscape_view_customer_id";

export async function getViewRole(): Promise<UserRole> {
  const cookieStore = await cookies();
  const role = cookieStore.get(VIEW_ROLE_COOKIE)?.value as UserRole | undefined;
  return role ?? "manager";
}

export async function getViewCustomerId(): Promise<string | null> {
  const cookieStore = await cookies();
  const customerId = cookieStore.get(VIEW_CUSTOMER_COOKIE)?.value;
  if (customerId) return customerId;
  const role = await getViewRole();
  return role === "customer" ? DEMO_CUSTOMER_ID : null;
}

export function roleCanManageBilling(role: UserRole) {
  return role === "manager" || role === "accountant";
}

export function roleCanEditContractDetails(role: UserRole) {
  return role === "accountant";
}

/** Operations drafts contracts; Accountant edits billing details on active contracts. */
export function roleCanDraftContracts(role: UserRole) {
  return role === "operations";
}

export function roleCanApproveContracts(role: UserRole) {
  return role === "manager" || role === "accountant";
}

export function roleCanManageQuotes(role: UserRole) {
  return role === "operations";
}

export function roleCanManageCompanySchedule(role: UserRole) {
  return role === "operations";
}

export function roleCanReviewMemberScheduling(role: UserRole) {
  return role === "operations";
}

export function roleCanManageVisits(role: UserRole) {
  return (
    role === "manager" ||
    role === "crew_lead" ||
    role === "accountant" ||
    role === "operations"
  );
}

export function roleCanViewReports(role: UserRole) {
  return role === "manager" || role === "accountant";
}

export function roleCanViewEquipment(role: UserRole) {
  return role === "accountant";
}

/** Crew Lead or Crew Member field portals (schedule / assigned visits). */
export function roleCanAccessCrewSchedule(role: UserRole) {
  return role === "crew_lead" || role === "crew_member";
}

/** Company scheduling board (Operations) or field execution schedule. */
export function roleCanAccessSchedule(role: UserRole) {
  return roleCanAccessCrewSchedule(role) || roleCanManageCompanySchedule(role);
}

/**
 * Crew members are read-only on visits/schedules, with write exceptions for
 * own scheduling / time-off requests and self clock-in/out labor sync.
 */
export function roleIsReadOnlyCrew(role: UserRole) {
  return role === "crew_member";
}

/** Hourly rates / labor pay totals — managers & accountants only. */
export function roleCanViewLaborPay(role: UserRole) {
  return role === "manager" || role === "accountant";
}
