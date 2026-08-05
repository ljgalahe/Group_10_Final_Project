import type { Contract } from "@/lib/types";

export type RenewalStatus = "current" | "expiring" | "expired";

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
