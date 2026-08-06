export const EQUIPMENT_CATEGORIES = [
  "Mowers",
  "Trucks",
  "Trailers",
  "Tractors",
  "Skid steers",
  "Irrigation tools",
  "Hand/power tools",
  "Other",
] as const;

export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number];

/** Categories that do not take unit-of-production depreciation. */
export const NON_DEPRECIABLE_CATEGORIES: readonly EquipmentCategory[] = [
  "Hand/power tools",
  "Other",
];

export function categoryIsDepreciable(category: EquipmentCategory): boolean {
  return !NON_DEPRECIABLE_CATEGORIES.includes(category);
}

/** Hand/power tools have no useful life, salvage, or estimated life hours. */
export function categoryTracksUsefulLife(category: EquipmentCategory): boolean {
  return category !== "Hand/power tools";
}

export type EquipmentStatus = "active" | "retired";

export type EquipmentContractRevenue = {
  contract_id: string;
  contract_title: string;
  customer_name: string;
  hours: number;
  revenue: number;
  jobs: number;
};

export type EquipmentJobPiece = {
  equipment_id: string;
  hours: number;
  allocated_revenue: number;
};

/** One service visit (job) with revenue already split across equipment on it. */
export type EquipmentJobRevenue = {
  visit_id: string;
  visit_date: string;
  job_revenue: number;
  contract_id: string;
  contract_title: string;
  customer_name: string;
  pieces: EquipmentJobPiece[];
};

export type EquipmentRow = {
  id: string;
  name: string;
  category: EquipmentCategory;
  purchase_date: string;
  cost: number;
  salvage_value: number;
  useful_life_years: number;
  useful_life_months: number;
  estimated_total_hours: number;
  status: EquipmentStatus;
  retired_at: string | null;
  notes: string | null;
  hours_used: number;
  /** Filled client-side from job allocations + date filter. */
  revenue_produced: number;
  jobs_count: number;
  avg_revenue_per_job: number;
  /** allocated revenue ÷ purchase price */
  revenue_per_cost: number;
  contracts_worked: EquipmentContractRevenue[];
};

export type EquipmentReportData = {
  assets: EquipmentRow[];
  jobs: EquipmentJobRevenue[];
  /** Sum of all invoice totals — equipment allocations never exceed this. */
  companyRevenue: number;
};

export type EquipmentUsageRow = {
  id: string;
  equipment_id: string;
  equipment_name: string;
  visit_id: string;
  hours: number;
  used_on: string;
  notes: string | null;
  visit_date: string;
  contract_title: string;
  customer_name: string;
};

export type CompletedVisitOption = {
  id: string;
  scheduled_date: string;
  label: string;
};

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * Split a job's revenue across equipment on that job.
 * Hours when any hours > 0; otherwise even across pieces.
 */
export function splitJobRevenue(
  jobRevenue: number,
  pieces: Array<{ equipment_id: string; hours: number }>
): EquipmentJobPiece[] {
  if (pieces.length === 0 || !(jobRevenue > 0)) return [];
  const totalHours = pieces.reduce(
    (sum, p) => sum + Math.max(0, Number(p.hours) || 0),
    0
  );
  if (totalHours > 0) {
    return pieces.map((p) => {
      const hours = Math.max(0, Number(p.hours) || 0);
      return {
        equipment_id: p.equipment_id,
        hours,
        allocated_revenue: roundMoney(jobRevenue * (hours / totalHours)),
      };
    });
  }
  const each = roundMoney(jobRevenue / pieces.length);
  // Fix pennies on the last piece so the visit still sums to jobRevenue.
  const allocated: EquipmentJobPiece[] = pieces.map((p, index) => ({
    equipment_id: p.equipment_id,
    hours: 0,
    allocated_revenue:
      index === pieces.length - 1
        ? roundMoney(jobRevenue - each * (pieces.length - 1))
        : each,
  }));
  return allocated;
}

/** Aggregate job allocations into per-asset revenue metrics. */
export function aggregateEquipmentRevenue(
  assets: EquipmentRow[],
  jobs: EquipmentJobRevenue[]
): EquipmentRow[] {
  const byId = new Map<
    string,
    {
      revenue: number;
      jobs: Set<string>;
      contracts: Map<
        string,
        {
          contract_id: string;
          contract_title: string;
          customer_name: string;
          hours: number;
          revenue: number;
          jobs: Set<string>;
        }
      >;
    }
  >();

  for (const asset of assets) {
    byId.set(asset.id, {
      revenue: 0,
      jobs: new Set(),
      contracts: new Map(),
    });
  }

  for (const job of jobs) {
    for (const piece of job.pieces) {
      let bucket = byId.get(piece.equipment_id);
      if (!bucket) {
        bucket = { revenue: 0, jobs: new Set(), contracts: new Map() };
        byId.set(piece.equipment_id, bucket);
      }
      bucket.revenue += piece.allocated_revenue;
      bucket.jobs.add(job.visit_id);

      let contract = bucket.contracts.get(job.contract_id);
      if (!contract) {
        contract = {
          contract_id: job.contract_id,
          contract_title: job.contract_title,
          customer_name: job.customer_name,
          hours: 0,
          revenue: 0,
          jobs: new Set(),
        };
        bucket.contracts.set(job.contract_id, contract);
      }
      contract.hours += piece.hours;
      contract.revenue += piece.allocated_revenue;
      contract.jobs.add(job.visit_id);
    }
  }

  return assets
    .map((asset) => {
      const bucket = byId.get(asset.id);
      const revenue_produced = roundMoney(bucket?.revenue ?? 0);
      const jobs_count = bucket?.jobs.size ?? 0;
      const avg_revenue_per_job =
        jobs_count > 0 ? roundMoney(revenue_produced / jobs_count) : 0;
      const revenue_per_cost =
        asset.cost > 0
          ? Math.round((revenue_produced / asset.cost) * 100) / 100
          : 0;
      const contracts_worked = Array.from(bucket?.contracts.values() ?? [])
        .map((c) => ({
          contract_id: c.contract_id,
          contract_title: c.contract_title,
          customer_name: c.customer_name,
          hours: roundMoney(c.hours),
          revenue: roundMoney(c.revenue),
          jobs: c.jobs.size,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      return {
        ...asset,
        revenue_produced,
        jobs_count,
        avg_revenue_per_job,
        revenue_per_cost,
        contracts_worked,
      };
    })
    .sort((a, b) => b.revenue_produced - a.revenue_produced);
}
