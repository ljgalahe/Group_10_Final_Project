/** Unit-of-production depreciation helpers for the Equipment register. */

export function depreciationPerHour(
  cost: number,
  salvage: number,
  estimatedHours: number
): number {
  if (estimatedHours <= 0) return 0;
  const depreciable = Math.max(0, cost - salvage);
  return depreciable / estimatedHours;
}

export function accumulatedDepreciation(
  cost: number,
  salvage: number,
  estimatedHours: number,
  hoursUsed: number
): number {
  const rate = depreciationPerHour(cost, salvage, estimatedHours);
  const raw = rate * Math.max(0, hoursUsed);
  const maxDep = Math.max(0, cost - salvage);
  return Math.min(raw, maxDep);
}

export function bookValue(
  cost: number,
  salvage: number,
  estimatedHours: number,
  hoursUsed: number
): number {
  const accum = accumulatedDepreciation(
    cost,
    salvage,
    estimatedHours,
    hoursUsed
  );
  return Math.max(salvage, cost - accum);
}

export function formatUsefulLife(years: number, months: number): string {
  const y = Math.max(0, years);
  const m = Math.max(0, months);
  const parts: string[] = [];
  if (y > 0) parts.push(`${y} yr${y === 1 ? "" : "s"}`);
  if (m > 0) parts.push(`${m} mo`);
  return parts.length > 0 ? parts.join(" ") : "—";
}

export function hoursRemaining(
  estimatedHours: number,
  hoursUsed: number
): number {
  return Math.max(0, estimatedHours - Math.max(0, hoursUsed));
}
