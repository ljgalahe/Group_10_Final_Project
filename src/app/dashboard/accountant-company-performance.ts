import { createDataClient } from "@/lib/auth-access";
import { allocatedVisitRevenue } from "@/lib/visit-accounting";

export type CostSlice = {
  key: "labor" | "materials" | "equipment";
  label: string;
  amount: number;
};

export type ServiceProfitBar = {
  serviceName: string;
  profit: number;
  cost: number;
  revenue: number;
  visitShare: number;
};

export type MonthlyProfitPoint = {
  month: string;
  monthIndex: number;
  revenue: number;
  cost: number;
  profit: number;
};

export type BillingEligibility = {
  completed: number;
  readyToInvoice: number;
  pendingApproval: number;
  alreadyInvoiced: number;
};

export type AccountantCompanyPerformance = {
  costDistribution: CostSlice[];
  averageRevenuePerVisit: number;
  averageCostPerVisit: number;
  averageProfitPerVisit: number;
  completedVisitCount: number;
  profitByService: ServiceProfitBar[];
  averageDaysToInvoice: number | null;
  averageCrewHours: number | null;
  billingEligibility: BillingEligibility;
  profitTrend: MonthlyProfitPoint[];
  trendYear: number;
};

const PAGE = 1000;
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const COST_LABELS: Record<CostSlice["key"], string> = {
  labor: "Labor",
  materials: "Materials",
  equipment: "Equipment",
};

const ISSUED_INVOICE_STATUSES = new Set([
  "sent",
  "paid",
  "partially_paid",
  "past_due",
  "overdue",
]);

/** Map raw contract service names onto visit-type buckets used in the demo. */
function serviceBucket(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (!s) return "General Service";
  if (
    s.includes("mow") ||
    s.includes("edg") ||
    s.includes("lawn")
  ) {
    return "Lawn Maintenance";
  }
  if (s.includes("trimm") || s.includes("tree") || s.includes("bush")) {
    return "Tree Work";
  }
  if (s.includes("mulch") || s.includes("landscape bed")) return "Mulching";
  if (
    s.includes("irrigat") ||
    s.includes("sprinkler") ||
    s.includes("watering")
  ) {
    return "Irrigation";
  }
  if (s.includes("fertil")) return "Fertilization";
  if (s.includes("flower") || s.includes("seasonal plant")) {
    return "Seasonal Color";
  }
  if (s.includes("snow") || s.includes("ice")) return "Snow & Ice";
  if (s.includes("leaf") || s.includes("debris")) return "Leaf & Debris";
  if (
    s.includes("sidewalk") ||
    s.includes("parking") ||
    s.includes("cleanup") ||
    s.includes("clean up") ||
    s.includes("clean-up")
  ) {
    return "Cleanup";
  }
  if (s.includes("install") || s.includes("landscape")) {
    return "Landscape Install";
  }
  if (s.includes("pond")) return "Pond Maintenance";
  if (s.includes("weed")) return "Lawn Maintenance";
  return raw
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function parseDateOnly(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return Date.UTC(y, m - 1, d);
}

export async function fetchAccountantCompanyPerformance(): Promise<AccountantCompanyPerformance> {
  const supabase = await createDataClient();
  const fallbackYear = new Date().getUTCFullYear();

  const costTotals: Record<CostSlice["key"], number> = {
    labor: 0,
    materials: 0,
    equipment: 0,
  };
  const costsByVisit = new Map<string, number>();
  const laborQtyByVisit = new Map<string, number>();

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("visit_costs")
      .select("visit_id, cost_type, amount, quantity")
      .range(from, from + PAGE - 1);
    if (error) break;
    if (!data?.length) break;
    for (const row of data) {
      const amount = Number(row.amount) || 0;
      const type = row.cost_type as CostSlice["key"];
      if (type in costTotals) costTotals[type] += amount;
      const visitId = row.visit_id as string;
      costsByVisit.set(visitId, (costsByVisit.get(visitId) ?? 0) + amount);
      if (type === "labor") {
        const qty = Number(row.quantity);
        if (Number.isFinite(qty) && qty > 0) {
          laborQtyByVisit.set(
            visitId,
            (laborQtyByVisit.get(visitId) ?? 0) + qty
          );
        }
      }
    }
    if (data.length < PAGE) break;
  }

  const laborFromEntries = new Map<string, number>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("visit_labor_entries")
      .select("visit_id, hours")
      .range(from, from + PAGE - 1);
    if (error) break;
    if (!data?.length) break;
    for (const row of data) {
      const visitId = row.visit_id as string;
      laborFromEntries.set(
        visitId,
        (laborFromEntries.get(visitId) ?? 0) + (Number(row.hours) || 0)
      );
    }
    if (data.length < PAGE) break;
  }

  const finalLaborHours = new Map<string, number>();
  for (const [visitId, hours] of laborFromEntries) {
    if (hours > 0) finalLaborHours.set(visitId, hours);
  }
  for (const [visitId, hours] of laborQtyByVisit) {
    if (!finalLaborHours.has(visitId) && hours > 0) {
      finalLaborHours.set(visitId, hours);
    }
  }

  type VisitRow = {
    id: string;
    contract_id: string;
    scheduled_date: string;
    completed_at: string | null;
  };
  const completedVisits: VisitRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("service_visits")
      .select("id, contract_id, scheduled_date, completed_at")
      .eq("status", "completed")
      .range(from, from + PAGE - 1);
    if (error) break;
    if (!data?.length) break;
    completedVisits.push(...(data as VisitRow[]));
    if (data.length < PAGE) break;
  }

  const contractIds = [
    ...new Set(completedVisits.map((v) => v.contract_id).filter(Boolean)),
  ];

  type ContractMeta = {
    monthlyFee: number;
    visitsPerWeek: number;
    services: string[];
  };
  const contracts = new Map<string, ContractMeta>();

  for (let i = 0; i < contractIds.length; i += 200) {
    const chunk = contractIds.slice(i, i + 200);
    const { data } = await supabase
      .from("contracts")
      .select(
        "id, monthly_fee, visits_per_week, contract_services(service_name, included)"
      )
      .in("id", chunk);
    for (const row of data ?? []) {
      const servicesRaw = (row.contract_services ?? []) as Array<{
        service_name: string;
        included: boolean | null;
      }>;
      const services = [
        ...new Set(
          servicesRaw
            .filter((s) => s.included !== false)
            .map((s) => serviceBucket(s.service_name))
        ),
      ];
      contracts.set(row.id as string, {
        monthlyFee: Number(row.monthly_fee ?? 0),
        visitsPerWeek: Number(row.visits_per_week ?? 1),
        services: services.length > 0 ? services : ["General Service"],
      });
    }
  }

  type InvoiceRow = {
    contract_id: string;
    status: string;
    issue_date: string;
  };
  const invoices: InvoiceRow[] = [];
  for (let i = 0; i < contractIds.length; i += 200) {
    const chunk = contractIds.slice(i, i + 200);
    const { data } = await supabase
      .from("invoices")
      .select("contract_id, status, issue_date")
      .in("contract_id", chunk);
    invoices.push(...((data ?? []) as InvoiceRow[]));
  }

  type ContractInvoiceFlags = {
    hasIssued: boolean;
    hasPending: boolean;
    issueDates: number[];
  };
  const invoiceFlags = new Map<string, ContractInvoiceFlags>();
  for (const inv of invoices) {
    if (inv.status === "voided" || inv.status === "canceled") continue;
    const flags = invoiceFlags.get(inv.contract_id) ?? {
      hasIssued: false,
      hasPending: false,
      issueDates: [],
    };
    if (ISSUED_INVOICE_STATUSES.has(inv.status)) flags.hasIssued = true;
    if (inv.status === "draft" || inv.status === "approved") {
      flags.hasPending = true;
    }
    const ts = parseDateOnly(inv.issue_date);
    if (ts != null) flags.issueDates.push(ts);
    invoiceFlags.set(inv.contract_id, flags);
  }

  let totalCost = 0;
  let totalProfit = 0;
  let totalRevenue = 0;
  let counted = 0;
  let laborHoursSum = 0;
  let laborHoursVisits = 0;
  let turnaroundDaysSum = 0;
  let turnaroundCount = 0;
  let readyToInvoice = 0;
  let pendingApproval = 0;
  let alreadyInvoiced = 0;

  const byService = new Map<
    string,
    { profit: number; cost: number; revenue: number; visitShare: number }
  >();

  let lastCompletedTs = 0;
  for (const visit of completedVisits) {
    const doneTs =
      parseDateOnly(visit.completed_at ?? "") ??
      parseDateOnly(visit.scheduled_date);
    if (doneTs != null && doneTs > lastCompletedTs) lastCompletedTs = doneTs;
  }

  const trendYear =
    lastCompletedTs > 0
      ? new Date(lastCompletedTs).getUTCFullYear()
      : fallbackYear;
  const lastMonthInclusive =
    lastCompletedTs > 0 ? new Date(lastCompletedTs).getUTCMonth() + 1 : 1;

  const monthly = MONTH_LABELS.slice(0, lastMonthInclusive).map(
    (month, monthIndex) => ({
      month,
      monthIndex: monthIndex + 1,
      revenue: 0,
      cost: 0,
      profit: 0,
    })
  );

  for (const visit of completedVisits) {
    const cost = costsByVisit.get(visit.id) ?? 0;
    const contract = contracts.get(visit.contract_id);
    if (!contract) continue;
    const revenue = allocatedVisitRevenue(
      contract.monthlyFee,
      contract.visitsPerWeek
    );
    const profit = revenue - cost;
    totalCost += cost;
    totalProfit += profit;
    totalRevenue += revenue;
    counted += 1;

    const hours = finalLaborHours.get(visit.id) ?? 0;
    if (hours > 0) {
      laborHoursSum += hours;
      laborHoursVisits += 1;
    }

    const flags = invoiceFlags.get(visit.contract_id);
    if (!flags || (!flags.hasIssued && !flags.hasPending)) {
      readyToInvoice += 1;
    } else if (flags.hasIssued) {
      alreadyInvoiced += 1;
    } else {
      pendingApproval += 1;
    }

    const doneTs =
      parseDateOnly(visit.completed_at ?? "") ??
      parseDateOnly(visit.scheduled_date);
    if (doneTs != null && flags?.issueDates.length) {
      let best: number | null = null;
      for (const issueTs of flags.issueDates) {
        const days = Math.round((issueTs - doneTs) / 86_400_000);
        if (days < -7) continue;
        if (best == null || Math.abs(days) < Math.abs(best)) best = days;
      }
      if (best != null) {
        turnaroundDaysSum += Math.max(0, best);
        turnaroundCount += 1;
      }
    }

    const doneDate = visit.completed_at ?? visit.scheduled_date;
    const y = Number(doneDate.slice(0, 4));
    const m = Number(doneDate.slice(5, 7));
    if (y === trendYear && m >= 1 && m <= lastMonthInclusive) {
      const bucket = monthly[m - 1];
      if (bucket) {
        bucket.revenue += revenue;
        bucket.cost += cost;
        bucket.profit += profit;
      }
    }

    const share = 1 / contract.services.length;
    for (const serviceName of contract.services) {
      const row = byService.get(serviceName) ?? {
        profit: 0,
        cost: 0,
        revenue: 0,
        visitShare: 0,
      };
      row.profit += profit * share;
      row.cost += cost * share;
      row.revenue += revenue * share;
      row.visitShare += share;
      byService.set(serviceName, row);
    }
  }

  const costDistribution: CostSlice[] = (
    ["labor", "materials", "equipment"] as const
  ).map((key) => ({
    key,
    label: COST_LABELS[key],
    amount: roundMoney(costTotals[key]),
  }));

  const profitByService: ServiceProfitBar[] = [...byService.entries()]
    .map(([serviceName, row]) => ({
      serviceName,
      profit: roundMoney(row.profit),
      cost: roundMoney(row.cost),
      revenue: roundMoney(row.revenue),
      visitShare: roundMoney(row.visitShare),
    }))
    .sort((a, b) => b.profit - a.profit);

  const profitTrend: MonthlyProfitPoint[] = monthly.map((row) => ({
    month: row.month,
    monthIndex: row.monthIndex,
    revenue: roundMoney(row.revenue),
    cost: roundMoney(row.cost),
    profit: roundMoney(row.profit),
  }));

  return {
    costDistribution,
    averageRevenuePerVisit: counted > 0 ? roundMoney(totalRevenue / counted) : 0,
    averageCostPerVisit: counted > 0 ? roundMoney(totalCost / counted) : 0,
    averageProfitPerVisit: counted > 0 ? roundMoney(totalProfit / counted) : 0,
    completedVisitCount: counted,
    profitByService,
    averageDaysToInvoice:
      turnaroundCount > 0 ? round1(turnaroundDaysSum / turnaroundCount) : null,
    averageCrewHours:
      laborHoursVisits > 0 ? round1(laborHoursSum / laborHoursVisits) : null,
    billingEligibility: {
      completed: counted,
      readyToInvoice,
      pendingApproval,
      alreadyInvoiced,
    },
    profitTrend,
    trendYear,
  };
}
