/**
 * Manager dashboard Company Performance Leaderboard.
 * Scores are derived from existing contracts, visits, costs, equipment,
 * invoices, payments, and profitability — never hard-coded fixed ranks.
 */

export type PerformanceBadge =
  | "Excellent"
  | "Strong"
  | "Monitor"
  | "Needs Attention";

export type PerformanceCategory =
  | "crew"
  | "equipment"
  | "customer"
  | "contract";

export type PerformanceMetric = {
  label: string;
  value: string;
  estimated?: boolean;
};

export type PerformanceEntry = {
  id: string;
  name: string;
  score: number;
  badge: PerformanceBadge;
  headlineMetric: string;
  why: string;
  metrics: PerformanceMetric[];
  estimated: boolean;
};

export type CategoryLeaderboard = {
  category: PerformanceCategory;
  title: string;
  description: string;
  /** Short explanation of how scores are calculated for this category. */
  scoreGuide: string;
  entries: PerformanceEntry[];
  top: PerformanceEntry | null;
  needsAttention: PerformanceEntry | null;
};

/** Shared badge bands used across categories (score-based rankings). */
export const PERFORMANCE_BADGE_GUIDE =
  "Excellent 85+, Strong 70–84, Monitor 50–69, Needs Attention under 50. Customer ratings also use payment-speed thresholds.";

type ContractInput = {
  id: string;
  title: string;
  status: string;
  assigned_crew: string | null;
  customer_id: string;
  visits_per_week?: number | null;
};

type VisitInput = {
  id: string;
  contract_id: string;
  status: string;
  scheduled_date: string;
  crew_notes?: string | null;
  completed_at?: string | null;
};

type VisitCostInput = {
  visit_id: string;
  cost_type: string;
  amount: number;
  quantity?: number | null;
  description?: string | null;
};

type EquipmentInput = {
  id: string;
  name: string;
  status: string;
  cost: number;
  salvage_value: number;
  estimated_total_hours: number;
  hours_used: number;
};

type EquipmentUsageInput = {
  equipment_id: string;
  visit_id: string;
  hours: number;
};

type InvoiceInput = {
  id: string;
  customer_id: string;
  contract_id?: string | null;
  total: number;
  amount_paid: number;
  status: string;
  due_date: string;
  issue_date?: string | null;
  customers?: { name: string } | null;
};

type ProfitabilityInput = {
  contractId: string;
  title: string;
  customerName: string;
  revenue: number;
  costs: number;
  margin: number;
  marginPct: number;
};

type CustomerRiskInput = {
  customerId: string;
  customerName: string;
  risk: "high" | "medium" | "low";
  outstandingBalance: number;
  overdueInvoiceCount: number;
  averageDaysToPay: number | null;
  riskScore: number;
};

export type CompanyPerformanceInput = {
  contracts: ContractInput[];
  visits: VisitInput[];
  visitCosts: VisitCostInput[];
  equipment: EquipmentInput[];
  equipmentUsage: EquipmentUsageInput[];
  invoices: InvoiceInput[];
  profitability: ProfitabilityInput[];
  customerRisk: CustomerRiskInput[];
  /** Customer IDs currently on automatic Service Hold (credit hold). */
  heldCustomerIds?: string[];
};

/** Fixed scores so badge bands stay intuitive and sortable. */
const CUSTOMER_BADGE_SCORE: Record<PerformanceBadge, number> = {
  Excellent: 92,
  Strong: 78,
  Monitor: 55,
  "Needs Attention": 28,
};

function rateCustomerPerformance(options: {
  averageDaysToPay: number | null;
  overdueInvoiceCount: number;
  onServiceHold: boolean;
}): { badge: PerformanceBadge; why: string } {
  const { averageDaysToPay, overdueInvoiceCount, onServiceHold } = options;
  const days = averageDaysToPay;

  if (
    onServiceHold ||
    overdueInvoiceCount >= 2 ||
    (days != null && days >= 46)
  ) {
    return {
      badge: "Needs Attention",
      why: "Repeated late payments or overdue invoices require follow-up.",
    };
  }

  if (overdueInvoiceCount === 1 || (days != null && days >= 31 && days <= 45)) {
    return {
      badge: "Monitor",
      why: "Payment time exceeds company goal.",
    };
  }

  // No overdue invoices from here down.
  if (days != null && days <= 15) {
    return {
      badge: "Excellent",
      why: "Pays invoices quickly and has no overdue balance.",
    };
  }

  if (days != null && days >= 16 && days <= 30) {
    return {
      badge: "Strong",
      why: "Pays on time with healthy account status.",
    };
  }

  // Limited payment-speed history, but account is current.
  return {
    badge: "Strong",
    why: "Pays on time with healthy account status.",
  };
}

function clamp(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, n));
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function badgeFromScore(score: number): PerformanceBadge {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 50) return "Monitor";
  return "Needs Attention";
}

function outsideCrewControl(notes: string | null | undefined): boolean {
  if (!notes) return false;
  return /weather|rain|storm|flood|snow|ice|equipment.?break|breakdown|machine.?down|broken.?mower|fleet.?down/i.test(
    notes
  );
}

function sortBestFirst(entries: PerformanceEntry[]) {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.name.localeCompare(b.name);
  });
}

function wrapCategory(
  category: PerformanceCategory,
  title: string,
  description: string,
  scoreGuide: string,
  entries: PerformanceEntry[]
): CategoryLeaderboard {
  const ranked = sortBestFirst(entries);
  return {
    category,
    title,
    description,
    scoreGuide,
    entries: ranked,
    top: ranked[0] ?? null,
    needsAttention:
      ranked.length > 1
        ? ranked[ranked.length - 1]
        : ranked[0]?.badge === "Needs Attention"
          ? ranked[0]
          : null,
  };
}

function buildCrewLeaderboard(
  contracts: ContractInput[],
  visits: VisitInput[],
  visitCosts: VisitCostInput[]
): CategoryLeaderboard {
  const activeContracts = contracts.filter((c) => c.status === "active");
  const crewNames = Array.from(
    new Set(
      activeContracts
        .map((c) => c.assigned_crew?.trim())
        .filter((name): name is string => Boolean(name))
    )
  );

  const costsByVisit = new Map<string, VisitCostInput[]>();
  for (const cost of visitCosts) {
    const list = costsByVisit.get(cost.visit_id) ?? [];
    list.push(cost);
    costsByVisit.set(cost.visit_id, list);
  }

  const entries: PerformanceEntry[] = crewNames.map((crew) => {
    const crewContractIds = new Set(
      activeContracts
        .filter((c) => c.assigned_crew?.trim() === crew)
        .map((c) => c.id)
    );
    const crewVisits = visits.filter((v) =>
      crewContractIds.has(v.contract_id)
    );

    let completed = 0;
    let scheduled = 0;
    let excludedDelays = 0;
    let laborHours = 0;
    let laborCost = 0;
    let materialCost = 0;
    const completedDates: string[] = [];

    for (const visit of crewVisits) {
      const excluded = outsideCrewControl(visit.crew_notes);
      if (visit.status === "completed") {
        completed += 1;
        completedDates.push(visit.scheduled_date);
      } else if (visit.status === "scheduled") {
        if (excluded) excludedDelays += 1;
        else scheduled += 1;
      } else if (visit.status === "cancelled" && excluded) {
        excludedDelays += 1;
      }

      for (const cost of costsByVisit.get(visit.id) ?? []) {
        if (cost.cost_type === "labor") {
          laborCost += Number(cost.amount);
          laborHours += Number(cost.quantity ?? 0);
        }
        if (cost.cost_type === "materials") {
          materialCost += Number(cost.amount);
        }
      }
    }

    // Dense revisits on the same contract within 3 days ≈ possible rework.
    const byContractDates = new Map<string, string[]>();
    for (const visit of crewVisits) {
      if (visit.status !== "completed") continue;
      const list = byContractDates.get(visit.contract_id) ?? [];
      list.push(visit.scheduled_date);
      byContractDates.set(visit.contract_id, list);
    }
    let repeatVisits = 0;
    for (const dates of byContractDates.values()) {
      const sorted = [...dates].sort();
      for (let i = 1; i < sorted.length; i += 1) {
        const a = new Date(sorted[i - 1] + "T00:00:00").getTime();
        const b = new Date(sorted[i] + "T00:00:00").getTime();
        const days = (b - a) / (1000 * 60 * 60 * 24);
        if (days > 0 && days <= 3) repeatVisits += 1;
      }
    }

    const denom = completed + scheduled;
    const completionRate = denom > 0 ? (completed / denom) * 100 : 0;
    const hoursPerCompleted =
      completed > 0 && laborHours > 0 ? laborHours / completed : null;
    const materialPerCompleted =
      completed > 0 ? materialCost / completed : null;

    // Adjusted efficiency: completion rewarded; rework & high labor/material drag score.
    // Weather/equipment-noted delays are excluded from the scheduled penalty bucket.
    let score = completionRate * 0.55;
    if (hoursPerCompleted != null) {
      // Peer-ish: 2–5 hrs/visit is healthy; outside that range costs points.
      const hourPenalty = Math.abs(hoursPerCompleted - 3.5) * 4;
      score += clamp(30 - hourPenalty, 0, 30);
    } else {
      score += 12; // limited labor data
    }
    if (repeatVisits > 0) score -= Math.min(20, repeatVisits * 6);
    if (materialPerCompleted != null && materialPerCompleted > 80) {
      score -= Math.min(12, (materialPerCompleted - 80) / 20);
    }
    score = clamp(round1(score));

    const estimated = laborHours === 0 || excludedDelays > 0 || repeatVisits > 0;
    const whyParts = [
      `${round1(completionRate)}% completion on controllable visits`,
    ];
    if (excludedDelays > 0) {
      whyParts.push(
        `${excludedDelays} weather/equipment delay(s) excluded from scoring`
      );
    }
    if (repeatVisits > 0) {
      whyParts.push(
        `${repeatVisits} possible rework revisit(s) estimated from dense visit cadence`
      );
    }
    if (hoursPerCompleted != null) {
      whyParts.push(
        `${round1(hoursPerCompleted)} labor hrs/completed visit`
      );
    }

    return {
      id: `crew-${crew}`,
      name: crew,
      score,
      badge: badgeFromScore(score),
      headlineMetric: `${round1(completionRate)}% completion`,
      why: whyParts.join(". ") + ".",
      estimated,
      metrics: [
        {
          label: "Completion rate (adjusted)",
          value: `${round1(completionRate)}%`,
        },
        {
          label: "Completed visits",
          value: String(completed),
        },
        {
          label: "Open scheduled (controllable)",
          value: String(scheduled),
        },
        {
          label: "Excluded weather/equipment delays",
          value: String(excludedDelays),
          estimated: excludedDelays > 0,
        },
        {
          label: "Labor hours logged",
          value:
            laborHours > 0 ? `${round1(laborHours)} hrs` : "Limited data",
          estimated: laborHours === 0,
        },
        {
          label: "Labor cost",
          value:
            laborCost > 0
              ? `$${laborCost.toFixed(0)}`
              : "Limited data",
          estimated: laborCost === 0,
        },
        {
          label: "Material cost",
          value: `$${materialCost.toFixed(0)}`,
        },
        {
          label: "Possible rework revisits",
          value: String(repeatVisits),
          estimated: true,
        },
      ],
    };
  });

  return wrapCategory(
    "crew",
    "Crew Performance",
    "Completion rate, labor intensity, and rework signals by assigned crew.",
    "Score blends visit completion (55%), labor hours per job, material intensity, and possible rework revisits. Weather or equipment delays noted in visit comments are excluded. Some metrics are estimated from available cost data.",
    entries
  );
}

function buildEquipmentLeaderboard(
  equipment: EquipmentInput[],
  usage: EquipmentUsageInput[],
  visitCosts: VisitCostInput[]
): CategoryLeaderboard {
  const visitsByEquipment = new Map<string, Set<string>>();
  const hoursByEquipment = new Map<string, number>();
  for (const row of usage) {
    const set = visitsByEquipment.get(row.equipment_id) ?? new Set();
    set.add(row.visit_id);
    visitsByEquipment.set(row.equipment_id, set);
    hoursByEquipment.set(
      row.equipment_id,
      (hoursByEquipment.get(row.equipment_id) ?? 0) + Number(row.hours)
    );
  }

  const equipmentCostByVisit = new Map<string, number>();
  for (const cost of visitCosts) {
    if (cost.cost_type !== "equipment") continue;
    equipmentCostByVisit.set(
      cost.visit_id,
      (equipmentCostByVisit.get(cost.visit_id) ?? 0) + Number(cost.amount)
    );
  }

  const entries: PerformanceEntry[] = equipment.map((asset) => {
    const hours =
      hoursByEquipment.get(asset.id) ?? Number(asset.hours_used) ?? 0;
    const visitCount = visitsByEquipment.get(asset.id)?.size ?? 0;
    const lifePct =
      asset.estimated_total_hours > 0
        ? (hours / asset.estimated_total_hours) * 100
        : 0;
    let repairProxy = 0;
    for (const visitId of visitsByEquipment.get(asset.id) ?? []) {
      repairProxy += equipmentCostByVisit.get(visitId) ?? 0;
    }
    const costPerVisit = visitCount > 0 ? repairProxy / visitCount : null;
    const remainingPct = clamp(100 - lifePct);

    let score = 55;
    // Healthy utilization band ~10–70% of life hours used.
    if (lifePct >= 10 && lifePct <= 70) score += 25;
    else if (lifePct < 10) score += 8;
    else if (lifePct <= 85) score += 10;
    else score -= 15;

    if (visitCount >= 3) score += 10;
    else if (visitCount >= 1) score += 5;

    if (asset.status === "active") score += 8;
    else if (asset.status === "maintenance") score -= 20;
    else if (asset.status === "retired") score -= 35;

    if (costPerVisit != null && costPerVisit > 40) {
      score -= Math.min(15, costPerVisit / 10);
    }

    score = clamp(round1(score));
    const estimated = visitCount === 0 || costPerVisit == null;

    const why =
      asset.status !== "active"
        ? `${asset.name} is marked ${asset.status}, which lowers the performance score.`
        : lifePct > 85
          ? `High life-hour usage (${round1(lifePct)}% of estimate) suggests replacement planning.`
          : visitCount === 0
            ? "Little or no visit usage logged yet — score is an estimated insight from asset status and life hours."
            : `Supports ${visitCount} visit(s) with ${round1(hours)} logged hours and ${round1(remainingPct)}% estimated life remaining.`;

    return {
      id: asset.id,
      name: asset.name,
      score,
      badge: badgeFromScore(score),
      headlineMetric:
        hours > 0 ? `${round1(hours)} hrs used` : asset.status,
      why,
      estimated,
      metrics: [
        { label: "Status", value: asset.status },
        {
          label: "Usage hours",
          value: `${round1(hours)} hrs`,
        },
        {
          label: "Life hours used",
          value:
            asset.estimated_total_hours > 0
              ? `${round1(lifePct)}%`
              : "—",
        },
        {
          label: "Visits supported",
          value: String(visitCount),
        },
        {
          label: "Equipment cost on linked visits",
          value: `$${repairProxy.toFixed(0)}`,
          estimated: repairProxy === 0,
        },
        {
          label: "Cost per supported visit",
          value:
            costPerVisit == null
              ? "Not enough usage data"
              : `$${costPerVisit.toFixed(0)}`,
          estimated: costPerVisit == null,
        },
        {
          label: "Asset cost",
          value: `$${Number(asset.cost).toFixed(0)}`,
        },
      ],
    };
  });

  return wrapCategory(
    "equipment",
    "Equipment Performance",
    "Usage, remaining life, and downtime across the fleet.",
    "Score reflects utilization band, visits supported, asset status (active / maintenance / retired), and equipment costs on linked visits. Assets with little usage data are labeled as estimated insights.",
    entries
  );
}

function buildCustomerLeaderboard(
  customerRisk: CustomerRiskInput[],
  invoices: InvoiceInput[],
  heldCustomerIds: Set<string> = new Set()
): CategoryLeaderboard {
  const revenueByCustomer = new Map<string, number>();
  for (const invoice of invoices) {
    if (invoice.status === "canceled" || invoice.status === "voided") continue;
    revenueByCustomer.set(
      invoice.customer_id,
      (revenueByCustomer.get(invoice.customer_id) ?? 0) +
        Number(invoice.total)
    );
  }

  const entries: PerformanceEntry[] = customerRisk.map((row) => {
    const revenue = revenueByCustomer.get(row.customerId) ?? 0;
    const onServiceHold = heldCustomerIds.has(row.customerId);
    const { badge, why } = rateCustomerPerformance({
      averageDaysToPay: row.averageDaysToPay,
      overdueInvoiceCount: row.overdueInvoiceCount,
      onServiceHold,
    });
    const score = CUSTOMER_BADGE_SCORE[badge];

    return {
      id: row.customerId,
      name: row.customerName,
      score,
      badge,
      headlineMetric:
        row.averageDaysToPay == null
          ? `$${row.outstandingBalance.toFixed(0)} outstanding`
          : `${row.averageDaysToPay}d avg to pay`,
      why: onServiceHold
        ? "Account is on Service Hold for invoices 30 or more days overdue."
        : why,
      estimated: row.averageDaysToPay == null,
      metrics: [
        {
          label: "Billed revenue",
          value: `$${revenue.toFixed(0)}`,
        },
        {
          label: "Outstanding balance",
          value: `$${row.outstandingBalance.toFixed(0)}`,
        },
        {
          label: "Overdue invoices",
          value: String(row.overdueInvoiceCount),
        },
        {
          label: "Avg days to pay",
          value:
            row.averageDaysToPay == null
              ? "Limited data"
              : `${row.averageDaysToPay} days`,
          estimated: row.averageDaysToPay == null,
        },
        {
          label: "Service Hold",
          value: onServiceHold ? "Yes" : "No",
        },
        {
          label: "Collection risk",
          value: row.risk,
        },
      ],
    };
  });

  // Include customers with revenue but missing from risk list (no open AR).
  const riskIds = new Set(customerRisk.map((r) => r.customerId));
  const names = new Map(
    invoices.map((inv) => [
      inv.customer_id,
      inv.customers?.name ?? "Customer",
    ])
  );
  for (const [customerId, revenue] of revenueByCustomer) {
    if (riskIds.has(customerId) || revenue <= 0) continue;
    const onServiceHold = heldCustomerIds.has(customerId);
    const { badge, why } = rateCustomerPerformance({
      averageDaysToPay: null,
      overdueInvoiceCount: 0,
      onServiceHold,
    });
    entries.push({
      id: customerId,
      name: names.get(customerId) ?? "Customer",
      score: CUSTOMER_BADGE_SCORE[badge],
      badge,
      headlineMetric: `$${revenue.toFixed(0)} billed`,
      why: onServiceHold
        ? "Account is on Service Hold for invoices 30 or more days overdue."
        : why,
      estimated: true,
      metrics: [
        { label: "Billed revenue", value: `$${revenue.toFixed(0)}` },
        { label: "Outstanding balance", value: "$0" },
        { label: "Overdue invoices", value: "0" },
        { label: "Service Hold", value: onServiceHold ? "Yes" : "No" },
        { label: "Collection risk", value: "low" },
      ],
    });
  }

  return wrapCategory(
    "customer",
    "Customer Performance",
    "Payment speed, overdue invoices, and Service Hold status.",
    "Excellent: 0–15 days to pay, no overdue. Strong: 16–30 days, no overdue. Monitor: 31–45 days or one overdue invoice. Needs Attention: 46+ days, multiple overdue, or Service Hold. Display scores map to those bands.",
    entries
  );
}

function buildContractLeaderboard(
  profitability: ProfitabilityInput[],
  visits: VisitInput[],
  invoices: InvoiceInput[]
): CategoryLeaderboard {
  const visitsByContract = new Map<string, VisitInput[]>();
  for (const visit of visits) {
    const list = visitsByContract.get(visit.contract_id) ?? [];
    list.push(visit);
    visitsByContract.set(visit.contract_id, list);
  }

  const arByContract = new Map<string, number>();
  for (const invoice of invoices) {
    if (!invoice.contract_id) continue;
    if (invoice.status === "canceled" || invoice.status === "voided") continue;
    const balance =
      Math.round(
        (Number(invoice.total) - Number(invoice.amount_paid)) * 100
      ) / 100;
    if (balance > 0) {
      arByContract.set(
        invoice.contract_id,
        (arByContract.get(invoice.contract_id) ?? 0) + balance
      );
    }
  }

  const entries: PerformanceEntry[] = profitability.map((row) => {
    const contractVisits = visitsByContract.get(row.contractId) ?? [];
    const completed = contractVisits.filter((v) => v.status === "completed")
      .length;
    const scheduled = contractVisits.filter((v) => v.status === "scheduled")
      .length;
    const cancelled = contractVisits.filter((v) => v.status === "cancelled")
      .length;
    const serviceDenom = completed + scheduled + cancelled;
    const completionRate =
      serviceDenom > 0 ? (completed / serviceDenom) * 100 : 0;

    const dates = contractVisits
      .filter((v) => v.status === "completed")
      .map((v) => v.scheduled_date)
      .sort();
    let repeatVisits = 0;
    for (let i = 1; i < dates.length; i += 1) {
      const a = new Date(dates[i - 1] + "T00:00:00").getTime();
      const b = new Date(dates[i] + "T00:00:00").getTime();
      const days = (b - a) / (1000 * 60 * 60 * 24);
      if (days > 0 && days <= 3) repeatVisits += 1;
    }

    const outstanding = arByContract.get(row.contractId) ?? 0;
    let score = clamp(row.marginPct);
    score = score * 0.7 + completionRate * 0.25;
    if (repeatVisits > 0) score -= Math.min(12, repeatVisits * 4);
    if (outstanding > 1000) score -= Math.min(15, outstanding / 500);
    score = clamp(round1(score));

    const why =
      row.marginPct >= 40 && outstanding === 0
        ? `Strong ${round1(row.marginPct)}% margin with no outstanding AR on this contract.`
        : row.marginPct < 25 || outstanding > 1000
          ? `Margin is ${round1(row.marginPct)}% with $${outstanding.toFixed(0)} outstanding AR — watch pricing, service intensity, and collections.`
          : `${round1(row.marginPct)}% margin and ${round1(completionRate)}% visit completion from available service history.`;

    return {
      id: row.contractId,
      name: row.title,
      score,
      badge: badgeFromScore(score),
      headlineMetric: `${round1(row.marginPct)}% margin`,
      why,
      estimated: repeatVisits > 0 || serviceDenom === 0,
      metrics: [
        {
          label: "Customer",
          value: row.customerName || "—",
        },
        {
          label: "Margin %",
          value: `${round1(row.marginPct)}%`,
        },
        {
          label: "Profit",
          value: `$${row.margin.toFixed(0)}`,
        },
        {
          label: "Revenue billed",
          value: `$${row.revenue.toFixed(0)}`,
        },
        {
          label: "Direct costs",
          value: `$${row.costs.toFixed(0)}`,
        },
        {
          label: "Service completion",
          value:
            serviceDenom === 0
              ? "Limited visit data"
              : `${round1(completionRate)}%`,
          estimated: serviceDenom === 0,
        },
        {
          label: "Missed / cancelled visits",
          value: String(cancelled),
        },
        {
          label: "Possible repeat visits",
          value: String(repeatVisits),
          estimated: true,
        },
        {
          label: "Outstanding AR",
          value: `$${outstanding.toFixed(0)}`,
        },
      ],
    };
  });

  return wrapCategory(
    "contract",
    "Contract / Property Performance",
    "Margin, visit completion, and outstanding AR by contract.",
    "Score weights margin % (~70%) and visit completion (~25%), then reduces for possible rework revisits and high outstanding AR. Sparse visit history may produce estimated insights.",
    entries
  );
}

export function buildCompanyPerformanceLeaderboard(
  input: CompanyPerformanceInput
): CategoryLeaderboard[] {
  return [
    buildCrewLeaderboard(input.contracts, input.visits, input.visitCosts),
    buildEquipmentLeaderboard(
      input.equipment,
      input.equipmentUsage,
      input.visitCosts
    ),
    buildCustomerLeaderboard(
      input.customerRisk,
      input.invoices,
      new Set(input.heldCustomerIds ?? [])
    ),
    buildContractLeaderboard(
      input.profitability,
      input.visits,
      input.invoices
    ),
  ];
}
