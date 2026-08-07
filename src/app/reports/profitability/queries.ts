import { fetchEquipment } from "@/app/equipment/queries";
import type { FinancialStatementInputs } from "@/app/reports/profitability/lib/financial-statement-data";
import { createDataClient } from "@/lib/auth-access";
import { fetchPaymentsSummary, fetchProfitabilityReport } from "@/lib/queries";
import {
  allocatedVisitRevenue,
  estimatedVisitCost,
} from "@/lib/visit-accounting";
import { normalizeServiceName } from "@/components/crew-lead/buildCrewSchedule";

export type ContractDirectCostBreakdown = {
  contractId: string;
  title: string;
  customerName: string;
  labor: number;
  materials: number;
  equipment: number;
  total: number;
};

export type DirectCostsBreakdown = {
  labor: number;
  materials: number;
  equipment: number;
  total: number;
  byContract: ContractDirectCostBreakdown[];
};

function emptyTypeTotals() {
  return { labor: 0, materials: 0, equipment: 0 };
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function addCostType(
  bucket: { labor: number; materials: number; equipment: number },
  costType: string,
  amount: number
) {
  if (costType === "labor") bucket.labor += amount;
  else if (costType === "materials") bucket.materials += amount;
  else if (costType === "equipment") bucket.equipment += amount;
}

/** Accountant profitability: split visit direct costs by labor / materials / equipment. */
export async function fetchDirectCostsBreakdown(): Promise<DirectCostsBreakdown> {
  const supabase = await createDataClient();
  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, title, customers(name)")
    .eq("status", "active");

  if (!contracts?.length) {
    return { labor: 0, materials: 0, equipment: 0, total: 0, byContract: [] };
  }

  const contractMeta = new Map(
    contracts.map((c) => {
      const customer = c.customers as
        | { name: string }
        | { name: string }[]
        | null;
      const customerName = Array.isArray(customer)
        ? customer[0]?.name
        : customer?.name;
      return [
        c.id as string,
        {
          title: (c.title as string) ?? "",
          customerName: customerName ?? "",
        },
      ] as const;
    })
  );

  const contractIds = [...contractMeta.keys()];
  const pageSize = 1000;

  // Map visits → contracts (30 contract IDs is safe for `.in()`; thousands of
  // visit IDs are not — that is what previously returned empty/$0 totals).
  const visitToContract = new Map<string, string>();
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("service_visits")
      .select("id, contract_id")
      .in("contract_id", contractIds)
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("fetchDirectCostsBreakdown visits:", error.message);
      break;
    }
    if (!data?.length) break;
    for (const visit of data) {
      visitToContract.set(visit.id as string, visit.contract_id as string);
    }
    if (data.length < pageSize) break;
  }

  const totals = emptyTypeTotals();
  const perContract = new Map<
    string,
    { labor: number; materials: number; equipment: number }
  >();
  for (const id of contractIds) {
    perContract.set(id, emptyTypeTotals());
  }

  // Page through all visit_costs (no giant `.in(visit_id, …)` filter).
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("visit_costs")
      .select("visit_id, cost_type, amount")
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("fetchDirectCostsBreakdown visit_costs:", error.message);
      break;
    }
    if (!data?.length) break;

    for (const cost of data) {
      const contractId = visitToContract.get(cost.visit_id as string);
      if (!contractId) continue;

      const amount = Number(cost.amount);
      addCostType(totals, cost.cost_type as string, amount);
      const bucket = perContract.get(contractId);
      if (bucket) addCostType(bucket, cost.cost_type as string, amount);
    }

    if (data.length < pageSize) break;
  }

  const byContract: ContractDirectCostBreakdown[] = contractIds.map((id) => {
    const meta = contractMeta.get(id)!;
    const bucket = perContract.get(id) ?? emptyTypeTotals();
    const labor = roundMoney(bucket.labor);
    const materials = roundMoney(bucket.materials);
    const equipment = roundMoney(bucket.equipment);
    return {
      contractId: id,
      title: meta.title,
      customerName: meta.customerName,
      labor,
      materials,
      equipment,
      total: roundMoney(labor + materials + equipment),
    };
  });

  return {
    labor: roundMoney(totals.labor),
    materials: roundMoney(totals.materials),
    equipment: roundMoney(totals.equipment),
    total: roundMoney(totals.labor + totals.materials + totals.equipment),
    byContract,
  };
}

export type JobCostVarianceRow = {
  visitId: string;
  contractId: string;
  contractTitle: string;
  customerName: string;
  scheduledDate: string;
  status: string;
  crewNotes: string | null;
  estimatedCost: number;
  actualCost: number;
  labor: number;
  materials: number;
  equipment: number;
  variance: number;
  variancePct: number;
  overQuote: boolean;
};

export type JobCostContractDetail = {
  contractId: string;
  contractTitle: string;
  customerName: string;
  jobsOverQuote: number;
  jobsWithCosts: number;
  totalEstimated: number;
  totalActual: number;
  totalOverrun: number;
  /** Overrun as % of estimated costs on the contract. */
  overrunPct: number;
  labor: number;
  materials: number;
  equipment: number;
  jobs: JobCostVarianceRow[];
};

export type JobCostVarianceReport = {
  jobsWithCosts: number;
  jobsOverQuote: number;
  totalEstimated: number;
  totalActual: number;
  /** Sum of positive (actual − estimated) variances — dollars of margin leaked. */
  totalOverrun: number;
  avgOverrunPct: number;
  rows: JobCostVarianceRow[];
  /** Full overrun detail for contracts that appear in the worst-overruns table. */
  contractDetails: JobCostContractDetail[];
};

/**
 * Estimated vs actual job (visit) cost variance for active contracts.
 * Uses the same quote/estimate model as the Accountant Visits workspace.
 */
export async function fetchJobCostVariance(
  limit = 20
): Promise<JobCostVarianceReport> {
  const empty: JobCostVarianceReport = {
    jobsWithCosts: 0,
    jobsOverQuote: 0,
    totalEstimated: 0,
    totalActual: 0,
    totalOverrun: 0,
    avgOverrunPct: 0,
    rows: [],
    contractDetails: [],
  };

  const supabase = await createDataClient();
  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, title, customers(name)")
    .eq("status", "active");

  if (!contracts?.length) return empty;

  const contractMeta = new Map(
    contracts.map((c) => {
      const customer = c.customers as
        | { name: string }
        | { name: string }[]
        | null;
      const customerName = Array.isArray(customer)
        ? customer[0]?.name
        : customer?.name;
      return [
        c.id as string,
        {
          title: (c.title as string) ?? "",
          customerName: customerName ?? "",
        },
      ] as const;
    })
  );
  const contractIds = [...contractMeta.keys()];
  const pageSize = 1000;

  type VisitRow = {
    id: string;
    contract_id: string;
    scheduled_date: string;
    status: string;
    crew_notes: string | null;
  };

  const visits: VisitRow[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("service_visits")
      .select("id, contract_id, scheduled_date, status, crew_notes")
      .in("contract_id", contractIds)
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("fetchJobCostVariance visits:", error.message);
      break;
    }
    if (!data?.length) break;
    visits.push(...(data as VisitRow[]));
    if (data.length < pageSize) break;
  }

  const visitMeta = new Map(
    visits.map((v) => [
      v.id,
      {
        contractId: v.contract_id,
        scheduledDate: v.scheduled_date,
        status: v.status ?? "unknown",
        crewNotes: v.crew_notes ?? null,
      },
    ])
  );

  type CostBucket = {
    total: number;
    labor: number;
    materials: number;
    equipment: number;
  };
  const costsByVisit = new Map<string, CostBucket>();

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("visit_costs")
      .select("visit_id, cost_type, amount")
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("fetchJobCostVariance visit_costs:", error.message);
      break;
    }
    if (!data?.length) break;

    for (const cost of data) {
      const visitId = cost.visit_id as string;
      if (!visitMeta.has(visitId)) continue;
      const amount = Number(cost.amount);
      const bucket = costsByVisit.get(visitId) ?? {
        total: 0,
        labor: 0,
        materials: 0,
        equipment: 0,
      };
      bucket.total += amount;
      const type = cost.cost_type as string;
      if (type === "labor") bucket.labor += amount;
      else if (type === "materials") bucket.materials += amount;
      else if (type === "equipment") bucket.equipment += amount;
      costsByVisit.set(visitId, bucket);
    }

    if (data.length < pageSize) break;
  }

  const allRows: JobCostVarianceRow[] = [];
  let totalEstimated = 0;
  let totalActual = 0;
  let overrunPctSum = 0;
  let jobsOverQuote = 0;

  for (const [visitId, bucket] of costsByVisit) {
    const actualCost = roundMoney(bucket.total);
    if (actualCost <= 0) continue;

    const meta = visitMeta.get(visitId);
    if (!meta) continue;
    const contract = contractMeta.get(meta.contractId);
    if (!contract) continue;

    const estimatedCost = roundMoney(estimatedVisitCost(actualCost, visitId));
    const variance = roundMoney(actualCost - estimatedCost);
    const variancePct =
      estimatedCost > 0 ? (variance / estimatedCost) * 100 : 0;
    const overQuote = variance > 0;

    totalEstimated += estimatedCost;
    totalActual += actualCost;
    if (overQuote) {
      jobsOverQuote += 1;
      overrunPctSum += variancePct;
    }

    allRows.push({
      visitId,
      contractId: meta.contractId,
      contractTitle: contract.title,
      customerName: contract.customerName,
      scheduledDate: meta.scheduledDate,
      status: meta.status,
      crewNotes: meta.crewNotes,
      estimatedCost,
      actualCost,
      labor: roundMoney(bucket.labor),
      materials: roundMoney(bucket.materials),
      equipment: roundMoney(bucket.equipment),
      variance,
      variancePct,
      overQuote,
    });
  }

  allRows.sort((a, b) => b.variance - a.variance);
  const overQuoteRows = allRows.filter((r) => r.overQuote);

  const byContract = new Map<string, JobCostVarianceRow[]>();
  for (const row of allRows) {
    const list = byContract.get(row.contractId) ?? [];
    list.push(row);
    byContract.set(row.contractId, list);
  }

  const allContractDetails: JobCostContractDetail[] = [];
  for (const [contractId, contractJobs] of byContract) {
    const overJobs = contractJobs
      .filter((r) => r.overQuote)
      .sort((a, b) => b.variance - a.variance);
    if (overJobs.length === 0) continue;
    const sample = contractJobs[0]!;
    const totalEst = contractJobs.reduce((s, j) => s + j.estimatedCost, 0);
    const totalAct = contractJobs.reduce((s, j) => s + j.actualCost, 0);
    const overrun = overJobs.reduce((s, j) => s + j.variance, 0);
    const overrunPct = totalEst > 0 ? (overrun / totalEst) * 100 : 0;
    allContractDetails.push({
      contractId,
      contractTitle: sample.contractTitle,
      customerName: sample.customerName,
      jobsOverQuote: overJobs.length,
      jobsWithCosts: contractJobs.length,
      totalEstimated: roundMoney(totalEst),
      totalActual: roundMoney(totalAct),
      totalOverrun: roundMoney(overrun),
      overrunPct: Math.round(overrunPct * 10) / 10,
      labor: roundMoney(contractJobs.reduce((s, j) => s + j.labor, 0)),
      materials: roundMoney(contractJobs.reduce((s, j) => s + j.materials, 0)),
      equipment: roundMoney(contractJobs.reduce((s, j) => s + j.equipment, 0)),
      jobs: overJobs,
    });
  }

  allContractDetails.sort((a, b) => b.totalOverrun - a.totalOverrun);

  // Job-level rows kept for callers that need the worst individual jobs;
  // worst-overruns UI uses the full contract list so totals match Margin leaked.
  const rows = overQuoteRows.slice(0, limit);

  const contractOverrunTotal = allContractDetails.reduce(
    (sum, c) => sum + c.totalOverrun,
    0
  );

  return {
    jobsWithCosts: allRows.length,
    jobsOverQuote,
    totalEstimated: roundMoney(totalEstimated),
    totalActual: roundMoney(totalActual),
    // Same dollars as summing Worst overruns (all contracts).
    totalOverrun: roundMoney(contractOverrunTotal),
    avgOverrunPct:
      jobsOverQuote > 0
        ? Math.round((overrunPctSum / jobsOverQuote) * 10) / 10
        : 0,
    rows,
    contractDetails: allContractDetails,
  };
}

export type ServiceLineContractShare = {
  contractId: string;
  title: string;
  customerName: string;
  revenue: number;
  costs: number;
  margin: number;
  marginPct: number;
};

export type ServiceLineMarginRow = {
  serviceName: string;
  revenue: number;
  costs: number;
  margin: number;
  marginPct: number;
  contractCount: number;
  contracts: ServiceLineContractShare[];
};

/**
 * Gross margin by included service line.
 * Allocates each active contract's revenue and direct costs evenly across its
 * included contract_services, then rolls up by normalized service name.
 */
export async function fetchServiceLineGrossMargins(
  report: Array<{
    contractId: string;
    title: string;
    customerName: string;
    revenue: number;
    costs: number;
    margin: number;
    marginPct: number;
  }>
): Promise<ServiceLineMarginRow[]> {
  if (report.length === 0) return [];

  const supabase = await createDataClient();
  const contractIds = report.map((r) => r.contractId);
  const { data: services, error } = await supabase
    .from("contract_services")
    .select("contract_id, service_name, included")
    .in("contract_id", contractIds)
    .eq("included", true);

  if (error) {
    console.error("fetchServiceLineGrossMargins:", error.message);
    return [];
  }

  const servicesByContract = new Map<string, string[]>();
  for (const row of services ?? []) {
    const contractId = row.contract_id as string;
    const name = normalizeServiceName(String(row.service_name ?? ""));
    if (!name) continue;
    const list = servicesByContract.get(contractId) ?? [];
    if (!list.some((s) => s.toLowerCase() === name.toLowerCase())) {
      list.push(name);
    }
    servicesByContract.set(contractId, list);
  }

  type Acc = {
    serviceName: string;
    revenue: number;
    costs: number;
    contracts: Map<string, ServiceLineContractShare>;
  };

  const byService = new Map<string, Acc>();

  for (const contract of report) {
    const lines = servicesByContract.get(contract.contractId) ?? ["Other"];
    const shareCount = Math.max(lines.length, 1);
    const revenueShare = contract.revenue / shareCount;
    const costShare = contract.costs / shareCount;
    const marginShare = revenueShare - costShare;
    const marginPctShare =
      revenueShare > 0 ? (marginShare / revenueShare) * 100 : 0;

    for (const serviceName of lines) {
      const key = serviceName.toLowerCase();
      const existing = byService.get(key) ?? {
        serviceName,
        revenue: 0,
        costs: 0,
        contracts: new Map(),
      };
      existing.revenue += revenueShare;
      existing.costs += costShare;
      existing.contracts.set(contract.contractId, {
        contractId: contract.contractId,
        title: contract.title,
        customerName: contract.customerName,
        revenue: roundMoney(revenueShare),
        costs: roundMoney(costShare),
        margin: roundMoney(marginShare),
        marginPct: Math.round(marginPctShare * 10) / 10,
      });
      byService.set(key, existing);
    }
  }

  return Array.from(byService.values())
    .map((row) => {
      const revenue = roundMoney(row.revenue);
      const costs = roundMoney(row.costs);
      const margin = roundMoney(revenue - costs);
      const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;
      const contracts = Array.from(row.contracts.values()).sort(
        (a, b) => b.marginPct - a.marginPct
      );
      return {
        serviceName: row.serviceName,
        revenue,
        costs,
        margin,
        marginPct: Math.round(marginPct * 10) / 10,
        contractCount: contracts.length,
        contracts,
      };
    })
    .sort((a, b) => b.marginPct - a.marginPct);
}

export type ProfitPerCrewHourJob = {
  visitId: string;
  scheduledDate: string;
  contractId: string;
  contractTitle: string;
  customerName: string;
  serviceNames: string[];
  revenue: number;
  laborCost: number;
  materialsCost: number;
  equipmentCost: number;
  laborHours: number;
  profit: number;
  profitPerCrewHour: number;
};

export type ProfitPerCrewHourServiceLine = {
  serviceName: string;
  avgProfitPerCrewHour: number;
  jobCount: number;
  totalProfit: number;
  totalHours: number;
};

export type ProfitPerCrewHourReport = {
  overallAvg: number;
  serviceLines: ProfitPerCrewHourServiceLine[];
  jobs: ProfitPerCrewHourJob[];
};

/**
 * Profit per crew-hour by job, rolled up as averages by included service line.
 * Job profit = allocated visit revenue − labor − materials − equipment.
 */
export async function fetchProfitPerCrewHour(): Promise<ProfitPerCrewHourReport> {
  const empty: ProfitPerCrewHourReport = {
    overallAvg: 0,
    serviceLines: [],
    jobs: [],
  };

  const supabase = await createDataClient();
  const { data: contracts } = await supabase
    .from("contracts")
    .select(
      "id, title, monthly_fee, visits_per_week, customers(name), contract_services(service_name, included)"
    )
    .eq("status", "active");

  if (!contracts?.length) return empty;

  type ContractMeta = {
    title: string;
    customerName: string;
    monthlyFee: number;
    visitsPerWeek: number;
    services: string[];
  };

  const contractMeta = new Map<string, ContractMeta>();
  for (const c of contracts) {
    const customer = c.customers as
      | { name: string }
      | { name: string }[]
      | null;
    const customerName = Array.isArray(customer)
      ? customer[0]?.name
      : customer?.name;
    const servicesRaw =
      (c.contract_services as
        | { service_name: string; included: boolean }[]
        | null) ?? [];
    const services: string[] = [];
    for (const s of servicesRaw) {
      if (!s.included) continue;
      const name = normalizeServiceName(String(s.service_name ?? ""));
      if (
        name &&
        !services.some((x) => x.toLowerCase() === name.toLowerCase())
      ) {
        services.push(name);
      }
    }
    contractMeta.set(c.id as string, {
      title: (c.title as string) ?? "",
      customerName: customerName ?? "",
      monthlyFee: Number(c.monthly_fee ?? 0),
      visitsPerWeek: Number(c.visits_per_week ?? 1),
      services: services.length > 0 ? services : ["Other"],
    });
  }

  const contractIds = [...contractMeta.keys()];
  const pageSize = 1000;

  type VisitRow = {
    id: string;
    contract_id: string;
    scheduled_date: string;
  };
  const visits: VisitRow[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("service_visits")
      .select("id, contract_id, scheduled_date")
      .in("contract_id", contractIds)
      .range(from, from + pageSize - 1);
    if (error) {
      console.error("fetchProfitPerCrewHour visits:", error.message);
      break;
    }
    if (!data?.length) break;
    visits.push(...(data as VisitRow[]));
    if (data.length < pageSize) break;
  }

  const visitMeta = new Map(
    visits.map((v) => [
      v.id,
      { contractId: v.contract_id, scheduledDate: v.scheduled_date },
    ])
  );

  type CostBucket = {
    labor: number;
    materials: number;
    equipment: number;
    laborHoursFromQty: number;
  };
  const costsByVisit = new Map<string, CostBucket>();

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("visit_costs")
      .select("visit_id, cost_type, amount, quantity")
      .range(from, from + pageSize - 1);
    if (error) {
      console.error("fetchProfitPerCrewHour visit_costs:", error.message);
      break;
    }
    if (!data?.length) break;
    for (const cost of data) {
      const visitId = cost.visit_id as string;
      if (!visitMeta.has(visitId)) continue;
      const bucket = costsByVisit.get(visitId) ?? {
        labor: 0,
        materials: 0,
        equipment: 0,
        laborHoursFromQty: 0,
      };
      const amount = Number(cost.amount);
      const type = cost.cost_type as string;
      if (type === "labor") {
        bucket.labor += amount;
        const qty = Number(cost.quantity);
        if (Number.isFinite(qty) && qty > 0) bucket.laborHoursFromQty += qty;
      } else if (type === "materials") bucket.materials += amount;
      else if (type === "equipment") bucket.equipment += amount;
      costsByVisit.set(visitId, bucket);
    }
    if (data.length < pageSize) break;
  }

  const hoursByVisit = new Map<string, number>();
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("visit_labor_entries")
      .select("visit_id, hours")
      .range(from, from + pageSize - 1);
    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (
        !msg.includes("visit_labor_entries") &&
        !msg.includes("does not exist") &&
        !msg.includes("schema cache")
      ) {
        console.error("fetchProfitPerCrewHour labor entries:", error.message);
      }
      break;
    }
    if (!data?.length) break;
    for (const entry of data) {
      const visitId = entry.visit_id as string;
      if (!visitMeta.has(visitId)) continue;
      hoursByVisit.set(
        visitId,
        (hoursByVisit.get(visitId) ?? 0) + Number(entry.hours)
      );
    }
    if (data.length < pageSize) break;
  }

  const jobs: ProfitPerCrewHourJob[] = [];

  for (const [visitId, meta] of visitMeta) {
    const contract = contractMeta.get(meta.contractId);
    if (!contract) continue;
    const costs = costsByVisit.get(visitId) ?? {
      labor: 0,
      materials: 0,
      equipment: 0,
      laborHoursFromQty: 0,
    };

    let laborHours = costs.laborHoursFromQty;
    if (!(laborHours > 0)) laborHours = hoursByVisit.get(visitId) ?? 0;
    if (!(laborHours > 0)) continue;

    const revenue = allocatedVisitRevenue(
      contract.monthlyFee,
      contract.visitsPerWeek
    );
    const laborCost = roundMoney(costs.labor);
    const materialsCost = roundMoney(costs.materials);
    const equipmentCost = roundMoney(costs.equipment);
    const profit = roundMoney(
      revenue - laborCost - materialsCost - equipmentCost
    );
    const profitPerCrewHour = roundMoney(profit / laborHours);

    jobs.push({
      visitId,
      scheduledDate: meta.scheduledDate,
      contractId: meta.contractId,
      contractTitle: contract.title,
      customerName: contract.customerName,
      serviceNames: contract.services,
      revenue: roundMoney(revenue),
      laborCost,
      materialsCost,
      equipmentCost,
      laborHours: roundMoney(laborHours),
      profit,
      profitPerCrewHour,
    });
  }

  jobs.sort((a, b) => b.profitPerCrewHour - a.profitPerCrewHour);

  const byService = new Map<
    string,
    { serviceName: string; jobs: ProfitPerCrewHourJob[] }
  >();
  for (const job of jobs) {
    for (const serviceName of job.serviceNames) {
      const key = serviceName.toLowerCase();
      const existing = byService.get(key) ?? { serviceName, jobs: [] };
      existing.jobs.push(job);
      byService.set(key, existing);
    }
  }

  const serviceLines: ProfitPerCrewHourServiceLine[] = Array.from(
    byService.values()
  )
    .map(({ serviceName, jobs: lineJobs }) => {
      const totalHours = lineJobs.reduce((s, j) => s + j.laborHours, 0);
      const totalProfit = lineJobs.reduce((s, j) => s + j.profit, 0);
      const avg =
        lineJobs.length > 0
          ? lineJobs.reduce((s, j) => s + j.profitPerCrewHour, 0) /
            lineJobs.length
          : 0;
      return {
        serviceName,
        avgProfitPerCrewHour: roundMoney(avg),
        jobCount: lineJobs.length,
        totalProfit: roundMoney(totalProfit),
        totalHours: roundMoney(totalHours),
      };
    })
    .sort((a, b) => b.avgProfitPerCrewHour - a.avgProfitPerCrewHour);

  const overallAvg =
    jobs.length > 0
      ? roundMoney(
          jobs.reduce((s, j) => s + j.profitPerCrewHour, 0) / jobs.length
        )
      : 0;

  return { overallAvg, serviceLines, jobs };
}

export type RevenueSeasonMonth = {
  monthKey: string;
  label: string;
  revenue: number;
  costs: number;
  invoiceCount: number;
};

function monthLabelFromKey(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

function buildMonthKeys(startKey: string, endKey: string): string[] {
  const [sy, sm] = startKey.split("-").map(Number);
  const [ey, em] = endKey.split("-").map(Number);
  if (!sy || !sm || !ey || !em) return [];
  const keys: string[] = [];
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    keys.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return keys;
}

/**
 * Monthly billed revenue and visit costs for active contracts.
 * Uses the same invoice universe as Total Revenue (all non-void invoices on
 * those contracts) so seasonality bars sum to the KPI. Returns every month
 * from the earliest invoice through the latest invoice month.
 */
export async function fetchRevenueSeasonality(
  contractIds: string[]
): Promise<RevenueSeasonMonth[]> {
  const now = new Date();
  const currentKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const defaultStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1)
  );
  const defaultStartKey = `${defaultStart.getUTCFullYear()}-${String(defaultStart.getUTCMonth() + 1).padStart(2, "0")}`;

  if (contractIds.length === 0) {
    return buildMonthKeys(defaultStartKey, currentKey).map((monthKey) => ({
      monthKey,
      label: monthLabelFromKey(monthKey),
      revenue: 0,
      costs: 0,
      invoiceCount: 0,
    }));
  }

  const supabase = await createDataClient();
  const pageSize = 1000;

  type InvoiceAgg = { total: number; issue_date: string };
  const invoiceRows: InvoiceAgg[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("invoices")
      .select("total, status, issue_date, contract_id")
      .in("contract_id", contractIds)
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("fetchRevenueSeasonality invoices:", error.message);
      break;
    }
    if (!data?.length) break;

    for (const invoice of data) {
      // Match fetchProfitabilityReport: sum every invoice total on active contracts.
      const issueDate = String(invoice.issue_date ?? "").slice(0, 10);
      if (!issueDate) continue;
      invoiceRows.push({
        total: Number(invoice.total),
        issue_date: issueDate,
      });
    }

    if (data.length < pageSize) break;
  }

  let startKey = currentKey;
  let endKey = currentKey;
  for (const invoice of invoiceRows) {
    const key = invoice.issue_date.slice(0, 7);
    if (key < startKey) startKey = key;
    if (key > endKey) endKey = key;
  }
  if (invoiceRows.length === 0) {
    startKey = defaultStartKey;
    endKey = currentKey;
  }

  const monthKeys = buildMonthKeys(startKey, endKey);
  const months: RevenueSeasonMonth[] = monthKeys.map((monthKey) => ({
    monthKey,
    label: monthLabelFromKey(monthKey),
    revenue: 0,
    costs: 0,
    invoiceCount: 0,
  }));
  const monthIndex = new Map(months.map((m, i) => [m.monthKey, i]));

  for (const invoice of invoiceRows) {
    const key = invoice.issue_date.slice(0, 7);
    const idx = monthIndex.get(key);
    if (idx == null) continue;
    months[idx].revenue += invoice.total;
    months[idx].invoiceCount += 1;
  }

  const rangeStart = `${months[0]?.monthKey ?? defaultStartKey}-01`;
  const last = months[months.length - 1] ?? { monthKey: currentKey };
  const [ly, lm] = last.monthKey.split("-").map(Number);
  const rangeEndDate = new Date(Date.UTC(ly, lm, 0));
  const rangeEnd = rangeEndDate.toISOString().slice(0, 10);

  // Visit costs by visit scheduled_date month
  const visitToMonth = new Map<string, string>();
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("service_visits")
      .select("id, scheduled_date, contract_id")
      .in("contract_id", contractIds)
      .gte("scheduled_date", rangeStart)
      .lte("scheduled_date", rangeEnd)
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("fetchRevenueSeasonality visits:", error.message);
      break;
    }
    if (!data?.length) break;
    for (const visit of data) {
      const key = String(visit.scheduled_date ?? "").slice(0, 7);
      if (monthIndex.has(key)) {
        visitToMonth.set(visit.id as string, key);
      }
    }
    if (data.length < pageSize) break;
  }

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("visit_costs")
      .select("visit_id, amount")
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("fetchRevenueSeasonality visit_costs:", error.message);
      break;
    }
    if (!data?.length) break;
    for (const cost of data) {
      const key = visitToMonth.get(cost.visit_id as string);
      if (!key) continue;
      const idx = monthIndex.get(key);
      if (idx == null) continue;
      months[idx].costs += Number(cost.amount);
    }
    if (data.length < pageSize) break;
  }

  const rounded = months.map((m) => ({
    ...m,
    revenue: roundMoney(m.revenue),
    costs: roundMoney(m.costs),
  }));

  // Full month series from earliest invoice through current month so the
  // seasonality chart uses all billed data (no "Earlier" rollup).
  return rounded;
}

export async function fetchFinancialStatementInputs(): Promise<FinancialStatementInputs> {
  const [report, summary, equipmentReport] = await Promise.all([
    fetchProfitabilityReport(),
    fetchPaymentsSummary(),
    fetchEquipment(),
  ]);

  const totalRevenue = report.reduce((sum, row) => sum + row.revenue, 0);
  const totalCosts = report.reduce((sum, row) => sum + row.costs, 0);
  const equipmentAssetValue = equipmentReport.assets
    .filter((item) => item.status === "active")
    .reduce((sum, item) => sum + item.cost, 0);

  return {
    report: report.map((row) => ({
      title: row.title,
      customerName: row.customerName,
      revenue: row.revenue,
      costs: row.costs,
      margin: row.margin,
    })),
    totalRevenue,
    totalCosts,
    totalMargin: totalRevenue - totalCosts,
    outstandingBalance: summary.outstandingBalance,
    collectedThisMonth: summary.collectedThisMonth,
    equipmentAssetValue,
  };
}
