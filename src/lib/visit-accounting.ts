import type { CostType } from "@/lib/types";
import {
  CREW_LEADS,
  DEMO_EMPLOYEES,
  type DemoCrewId,
} from "@/lib/demo-org";
import {
  entriesToAccountantEmployees,
  laborTotals,
  parseLaborDescription,
  type VisitLaborEntry,
} from "@/lib/crew-hours";

export type VisitPriority = "Routine" | "High" | "Emergency" | "Seasonal";

const CREW_ROSTERS = (Object.keys(CREW_LEADS) as DemoCrewId[]).map((crew) => {
  const members = DEMO_EMPLOYEES.filter((e) => e.crew === crew);
  return {
    leader: CREW_LEADS[crew],
    employees: members.map((m) => m.name),
  };
});

function hashString(value: string) {
  return [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

export function sumCostsByType(
  costs: Array<{ cost_type: string; amount: number | string }>
) {
  const totals: Record<CostType, number> = {
    labor: 0,
    materials: 0,
    equipment: 0,
  };

  for (const cost of costs) {
    const type = cost.cost_type as CostType;
    if (type in totals) totals[type] += Number(cost.amount);
  }

  return totals;
}

export function allocatedVisitRevenue(
  monthlyFee: number | null | undefined,
  visitsPerWeek: number | null | undefined
) {
  const fee = Number(monthlyFee ?? 0);
  if (fee <= 0) return 0;
  const monthlyVisits = Math.max((visitsPerWeek ?? 1) * 4, 1);
  return fee / monthlyVisits;
}

export function estimatedVisitCost(actualCost: number, visitId: string) {
  if (actualCost <= 0) return 380;
  const factor = 0.82 + (hashString(visitId) % 12) / 100;
  return Math.round(actualCost * factor);
}

/** Match accountant Visits: estimate while scheduled, actual after completed. */
export function visitProfitabilityCost(
  visitId: string,
  status: string,
  actualCost: number
) {
  if (status === "completed") return actualCost;
  if (status === "cancelled") return 0;
  return estimatedVisitCost(actualCost, visitId);
}

export function crewDetailsForVisit(
  visitId: string,
  assignedCrew: string | null | undefined,
  laborQuantity: number | null | undefined,
  laborAmount: number | null | undefined,
  laborEntries?: VisitLaborEntry[] | null,
  laborDescription?: string | null
) {
  const roster = CREW_ROSTERS[hashString(visitId) % CREW_ROSTERS.length];
  const leader = assignedCrew?.startsWith("Crew")
    ? roster.leader
    : assignedCrew || roster.leader;

  const parsed =
    laborEntries && laborEntries.length > 0
      ? laborEntries
      : parseLaborDescription(visitId, laborDescription);
  const seed = hashString(visitId);

  if (parsed && parsed.length > 0) {
    const employees = entriesToAccountantEmployees(parsed);
    const totals = laborTotals(parsed);
    const actualHours = totals.hours;
    const estimatedHours = Number(
      Math.max(actualHours * (0.85 + (seed % 10) / 100), 1).toFixed(1)
    );
    const hourVariance = Number((actualHours - estimatedHours).toFixed(1));
    const totalPay =
      laborAmount && Number(laborAmount) > 0
        ? Number(laborAmount)
        : totals.amount;
    return {
      leader: employees[0]?.name ?? leader,
      employees,
      actualHours,
      estimatedHours,
      hourVariance,
      totalPay,
      fromSyncedLabor: true as const,
    };
  }

  const actualHoursTotal =
    laborQuantity && laborQuantity > 0
      ? Number(laborQuantity)
      : roster.employees.length * 3;

  const employees = roster.employees.map((name, index) => {
    const isLeader = name === roster.leader || index === 0;
    const hourShare = isLeader ? 1.1 : 0.9 + ((seed + index) % 4) / 20;
    const rawHours = (actualHoursTotal / roster.employees.length) * hourShare;
    const hours = Number(rawHours.toFixed(1));
    const payRate = isLeader ? 38 + (seed % 5) : 28 + ((seed + index) % 6);
    return {
      name,
      role: isLeader ? "Crew Leader" : "Crew Member",
      hours,
      payRate,
      pay: Number((hours * payRate).toFixed(2)),
    };
  });

  const actualHours = Number(
    employees.reduce((sum, employee) => sum + employee.hours, 0).toFixed(1)
  );
  const estimatedHours = Number(
    Math.max(actualHours * (0.85 + (seed % 10) / 100), 1).toFixed(1)
  );
  const hourVariance = Number((actualHours - estimatedHours).toFixed(1));
  const totalPay =
    laborAmount && Number(laborAmount) > 0
      ? Number(laborAmount)
      : Number(
          employees.reduce((sum, employee) => sum + employee.pay, 0).toFixed(2)
        );

  return {
    leader,
    employees,
    actualHours,
    estimatedHours,
    hourVariance,
    totalPay,
    fromSyncedLabor: false as const,
  };
}

export function visitPriority(visitId: string, notes: string | null): VisitPriority {
  const text = (notes ?? "").toLowerCase();
  if (text.includes("pond") || text.includes("storm") || text.includes("high")) {
    return "High";
  }
  if (text.includes("emergency")) return "Emergency";
  const options: VisitPriority[] = ["Routine", "High", "Emergency", "Seasonal"];
  return options[hashString(visitId) % options.length];
}

export function gpsTimes(scheduledDate: string, completedAt: string | null) {
  const seed = hashString(scheduledDate);
  const arriveHour = 7 + (seed % 3);
  const arriveMin = String((seed * 7) % 60).padStart(2, "0");
  const departHour = arriveHour + 3;
  const departMin = String((seed * 11) % 60).padStart(2, "0");

  if (completedAt) {
    const completed = new Date(completedAt);
    const timeOpts: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
    };
    const departed = completed.toLocaleTimeString("en-US", timeOpts);
    const arrivedDate = new Date(completed.getTime() - 3 * 60 * 60 * 1000);
    return {
      arrived: arrivedDate.toLocaleTimeString("en-US", timeOpts),
      departed,
    };
  }

  return {
    arrived: `${arriveHour}:${arriveMin} AM`,
    departed: `${departHour}:${departMin} AM`,
  };
}
