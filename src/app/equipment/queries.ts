import { createDataClient } from "@/lib/auth-access";
import type {
  CompletedVisitOption,
  EquipmentCategory,
  EquipmentJobRevenue,
  EquipmentReportData,
  EquipmentRow,
  EquipmentUsageRow,
} from "./equipment-types";
import { roundMoney, splitJobRevenue, aggregateEquipmentRevenue } from "./equipment-types";

const PAGE_SIZE = 1000;
const IN_CHUNK = 200;
/** How many range pages to request at once after the first page. */
const PAGE_WAVE = 4;

type RawEquipment = {
  id: string;
  name: string;
  category: string;
  purchase_date: string;
  cost: number;
  salvage_value: number;
  useful_life_years: number;
  useful_life_months: number;
  estimated_total_hours: number;
  status: string;
  retired_at: string | null;
  notes: string | null;
};

type LeanUsage = {
  id: string;
  equipment_id: string;
  visit_id: string;
  hours: number | null;
  used_on: string;
  notes: string | null;
};

type LeanVisit = {
  id: string;
  contract_id: string | null;
  scheduled_date: string;
};

type ContractInfo = {
  id: string;
  title: string;
  customer_name: string;
};

/** Map legacy DB labels if a remote has not run rename migrations yet. */
function normalizeCategory(raw: string): EquipmentCategory {
  if (raw === "Trucks/Trailers") return "Trucks";
  if (raw === "Tractors/skid steers") return "Tractors";
  return raw as EquipmentCategory;
}

/**
 * Page through PostgREST results, fetching later pages in parallel waves.
 * Preserves ascending page order so ordered queries stay stable.
 */
async function pageAllParallel<T>(
  fetchPage: (
    from: number,
    to: number
  ) => Promise<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const first = await fetchPage(0, PAGE_SIZE - 1);
  if (first.error) {
    console.error(first.error.message);
    return [];
  }
  if (!first.data?.length) return [];
  if (first.data.length < PAGE_SIZE) return first.data;

  const rows: T[] = [...first.data];
  let nextFrom = PAGE_SIZE;

  for (;;) {
    const starts = Array.from(
      { length: PAGE_WAVE },
      (_, i) => nextFrom + i * PAGE_SIZE
    );
    const pages = await Promise.all(
      starts.map((from) => fetchPage(from, from + PAGE_SIZE - 1))
    );

    let done = false;
    for (const page of pages) {
      if (page.error) {
        console.error(page.error.message);
        done = true;
        break;
      }
      const data = page.data ?? [];
      if (!data.length) {
        done = true;
        break;
      }
      rows.push(...data);
      if (data.length < PAGE_SIZE) {
        done = true;
        break;
      }
    }
    if (done) break;
    nextFrom += PAGE_WAVE * PAGE_SIZE;
  }

  return rows;
}

function one<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

async function fetchContractInfoById(
  supabase: Awaited<ReturnType<typeof createDataClient>>,
  contractIds: string[]
): Promise<Map<string, ContractInfo>> {
  const map = new Map<string, ContractInfo>();
  const unique = [...new Set(contractIds.filter(Boolean))];
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += IN_CHUNK) {
    chunks.push(unique.slice(i, i + IN_CHUNK));
  }

  const results = await Promise.all(
    chunks.map((chunk) =>
      supabase
        .from("contracts")
        .select("id, title, customers(name)")
        .in("id", chunk)
    )
  );

  for (const { data, error } of results) {
    if (error) {
      console.error("fetchContractInfoById", error.message);
      continue;
    }
    for (const row of data ?? []) {
      const cust = one(
        row.customers as { name: string } | { name: string }[] | null
      );
      map.set(row.id, {
        id: row.id,
        title: row.title,
        customer_name: cust?.name ?? "—",
      });
    }
  }
  return map;
}

async function fetchLeanUsage(
  supabase: Awaited<ReturnType<typeof createDataClient>>
): Promise<LeanUsage[]> {
  return pageAllParallel<LeanUsage>(async (from, to) => {
    const result = await supabase
      .from("equipment_usage")
      .select("id, equipment_id, visit_id, hours, used_on, notes")
      .order("used_on", { ascending: false })
      .order("id", { ascending: true })
      .range(from, to);
    return result;
  });
}

/** All visits with date + contract — one pass for counts and job metadata. */
async function fetchLeanVisits(
  supabase: Awaited<ReturnType<typeof createDataClient>>
): Promise<LeanVisit[]> {
  return pageAllParallel<LeanVisit>(async (from, to) => {
    const result = await supabase
      .from("service_visits")
      .select("id, contract_id, scheduled_date")
      .order("id", { ascending: true })
      .range(from, to);
    return result;
  });
}

async function fetchInvoiceTotals(
  supabase: Awaited<ReturnType<typeof createDataClient>>
): Promise<Array<{ contract_id: string; total: number }>> {
  return pageAllParallel(async (from, to) => {
    const result = await supabase
      .from("invoices")
      .select("contract_id, total")
      .range(from, to);
    return result;
  });
}

function buildReportFromLean(args: {
  assets: RawEquipment[] | null;
  usage: LeanUsage[];
  visits: LeanVisit[];
  invoices: Array<{ contract_id: string; total: number }>;
  contracts: Map<string, ContractInfo>;
}): EquipmentReportData {
  const empty: EquipmentReportData = {
    assets: [],
    jobs: [],
    companyRevenue: 0,
  };
  if (!args.assets) return empty;

  let companyRevenue = 0;
  const billedByContract = new Map<string, number>();
  for (const invoice of args.invoices) {
    const contractId = invoice.contract_id;
    if (!contractId) continue;
    const total = Number(invoice.total);
    companyRevenue += total;
    billedByContract.set(
      contractId,
      (billedByContract.get(contractId) ?? 0) + total
    );
  }
  companyRevenue = roundMoney(companyRevenue);

  const visitMeta = new Map<
    string,
    { date: string; contract: ContractInfo | null }
  >();
  const visitsPerContract = new Map<string, number>();

  for (const visit of args.visits) {
    const info = visit.contract_id
      ? (args.contracts.get(visit.contract_id) ?? null)
      : null;
    visitMeta.set(visit.id, {
      date: visit.scheduled_date,
      contract: info,
    });
    if (visit.contract_id) {
      visitsPerContract.set(
        visit.contract_id,
        (visitsPerContract.get(visit.contract_id) ?? 0) + 1
      );
    }
  }

  const hoursById = new Map<string, number>();
  const piecesByVisit = new Map<
    string,
    Array<{ equipment_id: string; hours: number }>
  >();

  for (const row of args.usage) {
    const hours = Number(row.hours);
    const safeHours = Number.isFinite(hours) ? hours : 0;
    hoursById.set(
      row.equipment_id,
      (hoursById.get(row.equipment_id) ?? 0) + Math.max(0, safeHours)
    );

    const list = piecesByVisit.get(row.visit_id) ?? [];
    list.push({
      equipment_id: row.equipment_id,
      hours: Math.max(0, safeHours),
    });
    piecesByVisit.set(row.visit_id, list);
  }

  const jobs: EquipmentJobRevenue[] = [];
  let allocatedTotal = 0;

  for (const [visitId, pieces] of piecesByVisit) {
    const meta = visitMeta.get(visitId);
    if (!meta?.contract) continue;

    const visitCount = visitsPerContract.get(meta.contract.id) ?? 0;
    const billed = billedByContract.get(meta.contract.id) ?? 0;
    const jobRevenue =
      visitCount > 0 && billed > 0 ? roundMoney(billed / visitCount) : 0;
    if (!(jobRevenue > 0) || pieces.length === 0) continue;

    const split = splitJobRevenue(jobRevenue, pieces);
    allocatedTotal += split.reduce((s, p) => s + p.allocated_revenue, 0);

    jobs.push({
      visit_id: visitId,
      visit_date: meta.date,
      job_revenue: jobRevenue,
      contract_id: meta.contract.id,
      contract_title: meta.contract.title,
      customer_name: meta.contract.customer_name,
      pieces: split,
    });
  }

  // Guard: never attribute more than company billed revenue (penny drift).
  if (
    allocatedTotal > companyRevenue &&
    allocatedTotal > 0 &&
    companyRevenue > 0
  ) {
    const scale = companyRevenue / allocatedTotal;
    for (const job of jobs) {
      job.job_revenue = roundMoney(job.job_revenue * scale);
      for (const piece of job.pieces) {
        piece.allocated_revenue = roundMoney(piece.allocated_revenue * scale);
      }
    }
  }

  const assetRows: EquipmentRow[] = args.assets.map((a) => ({
    id: a.id,
    name: a.name,
    category: normalizeCategory(a.category),
    purchase_date: a.purchase_date,
    cost: Number(a.cost),
    salvage_value: Number(a.salvage_value),
    useful_life_years: Number(a.useful_life_years),
    useful_life_months: Number(a.useful_life_months),
    estimated_total_hours: Number(a.estimated_total_hours),
    status: a.status as EquipmentRow["status"],
    retired_at: a.retired_at,
    notes: a.notes,
    hours_used: hoursById.get(a.id) ?? 0,
    revenue_produced: 0,
    jobs_count: 0,
    avg_revenue_per_job: 0,
    revenue_per_cost: 0,
    contracts_worked: [],
  }));

  return {
    assets: assetRows,
    jobs,
    companyRevenue,
  };
}

function buildUsageRows(args: {
  usage: LeanUsage[];
  equipmentNameById: Map<string, string>;
  visits: LeanVisit[];
  contracts: Map<string, ContractInfo>;
}): EquipmentUsageRow[] {
  const visitById = new Map(args.visits.map((v) => [v.id, v]));
  return args.usage.map((row) => {
    const visit = visitById.get(row.visit_id);
    const contract = visit?.contract_id
      ? args.contracts.get(visit.contract_id)
      : undefined;
    return {
      id: row.id,
      equipment_id: row.equipment_id,
      equipment_name:
        args.equipmentNameById.get(row.equipment_id) ?? "Unknown",
      visit_id: row.visit_id,
      hours: Number(row.hours),
      used_on: row.used_on,
      notes: row.notes,
      visit_date: visit?.scheduled_date ?? row.used_on,
      contract_title: contract?.title ?? "Visit",
      customer_name: contract?.customer_name ?? "—",
    };
  });
}

/**
 * Load equipment register plus per-job revenue splits.
 * Each job gets a share of its contract's billed invoices; that job revenue is
 * split across equipment by hours (or evenly if no hours). Allocations never
 * exceed company invoice revenue.
 */
export async function fetchEquipment(): Promise<EquipmentReportData> {
  const supabase = await createDataClient();
  const empty: EquipmentReportData = {
    assets: [],
    jobs: [],
    companyRevenue: 0,
  };

  const [assetsResult, usage, invoices, visits] = await Promise.all([
    supabase.from("equipment").select("*").order("name", { ascending: true }),
    fetchLeanUsage(supabase),
    fetchInvoiceTotals(supabase),
    fetchLeanVisits(supabase),
  ]);

  if (assetsResult.error) {
    console.error("fetchEquipment", assetsResult.error);
    return empty;
  }

  const usageVisitIds = new Set(usage.map((u) => u.visit_id));
  const contractIds = [
    ...new Set(
      visits
        .filter((v) => usageVisitIds.has(v.id) && v.contract_id)
        .map((v) => v.contract_id as string)
    ),
  ];
  const contracts = await fetchContractInfoById(supabase, contractIds);

  return buildReportFromLean({
    assets: (assetsResult.data ?? []) as RawEquipment[],
    usage,
    visits,
    invoices,
    contracts,
  });
}

export async function fetchEquipmentUsage(): Promise<EquipmentUsageRow[]> {
  const supabase = await createDataClient();

  const [usage, equipmentResult, visits] = await Promise.all([
    fetchLeanUsage(supabase),
    supabase.from("equipment").select("id, name"),
    fetchLeanVisits(supabase),
  ]);

  if (equipmentResult.error) {
    console.error("fetchEquipmentUsage", equipmentResult.error);
  }

  const equipmentNameById = new Map(
    (equipmentResult.data ?? []).map((e) => [e.id as string, e.name as string])
  );

  // Preserve prior PostgREST default display cap (1000 most recent).
  const displayUsage = usage.slice(0, 1000);
  const displayVisitIds = new Set(displayUsage.map((u) => u.visit_id));
  const usageContractIds = [
    ...new Set(
      visits
        .filter((v) => displayVisitIds.has(v.id) && v.contract_id)
        .map((v) => v.contract_id as string)
    ),
  ];
  const contracts = await fetchContractInfoById(supabase, usageContractIds);

  return buildUsageRows({
    usage: displayUsage,
    equipmentNameById,
    visits,
    contracts,
  });
}

export async function fetchCompletedVisitsForEquipment(): Promise<
  CompletedVisitOption[]
> {
  const supabase = await createDataClient();
  // Same practical cap as the prior unpaged PostgREST default (1000 rows).
  const { data, error } = await supabase
    .from("service_visits")
    .select("id, scheduled_date, contract_id")
    .eq("status", "completed")
    .order("scheduled_date", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("fetchCompletedVisitsForEquipment", error);
    return [];
  }

  const rows = data ?? [];
  const contractIds = [
    ...new Set(
      rows
        .map((v) => v.contract_id as string | null)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const contracts = await fetchContractInfoById(supabase, contractIds);

  return rows.map((v) => {
    const contract = v.contract_id
      ? contracts.get(v.contract_id as string)
      : undefined;
    const label = `${v.scheduled_date} · ${contract?.customer_name ?? "Customer"} · ${contract?.title ?? "Visit"}`;
    return {
      id: v.id,
      scheduled_date: v.scheduled_date,
      label,
    };
  });
}

/**
 * Single coordinated load for the Equipment page — avoids re-fetching usage
 * and visits three times while returning the same report shapes.
 *
 * Date filters are applied on the server so the client does not need the full
 * jobs array (thousands of rows) in the RSC payload.
 */
export async function loadEquipmentPageData(options?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<{
  report: EquipmentReportData;
  usage: EquipmentUsageRow[];
  visits: CompletedVisitOption[];
  companyRevenueInView: number;
}> {
  const dateFrom = options?.dateFrom ?? "";
  const dateTo = options?.dateTo ?? "";
  const supabase = await createDataClient();
  const emptyReport: EquipmentReportData = {
    assets: [],
    jobs: [],
    companyRevenue: 0,
  };

  const [assetsResult, usage, invoices, visits, completedResult] =
    await Promise.all([
      supabase.from("equipment").select("*").order("name", { ascending: true }),
      fetchLeanUsage(supabase),
      fetchInvoiceTotals(supabase),
      fetchLeanVisits(supabase),
      supabase
        .from("service_visits")
        .select("id, scheduled_date, contract_id")
        .eq("status", "completed")
        .order("scheduled_date", { ascending: false })
        .limit(1000),
    ]);

  if (assetsResult.error) {
    console.error("loadEquipmentPageData", assetsResult.error);
  }
  if (completedResult.error) {
    console.error(
      "loadEquipmentPageData completed visits",
      completedResult.error
    );
  }

  const assets = (assetsResult.data ?? []) as RawEquipment[];
  const usageVisitIds = new Set(usage.map((u) => u.visit_id));
  const contractIds = [
    ...new Set(
      [
        ...visits
          .filter((v) => usageVisitIds.has(v.id) && v.contract_id)
          .map((v) => v.contract_id as string),
        ...(completedResult.data ?? [])
          .map((v) => v.contract_id as string | null)
          .filter((id): id is string => Boolean(id)),
      ]
    ),
  ];
  const contracts = await fetchContractInfoById(supabase, contractIds);

  const fullReport = buildReportFromLean({
    assets,
    usage,
    visits,
    invoices,
    contracts,
  });

  const jobsInRange = fullReport.jobs.filter((job) => {
    if (dateFrom && job.visit_date < dateFrom) return false;
    if (dateTo && job.visit_date > dateTo) return false;
    return true;
  });

  const companyRevenueInView = roundMoney(
    jobsInRange.reduce((sum, job) => sum + job.job_revenue, 0)
  );

  const aggregatedAssets = aggregateEquipmentRevenue(
    fullReport.assets,
    jobsInRange
  );

  const equipmentNameById = new Map(assets.map((a) => [a.id, a.name]));
  // Usage log UI previously relied on PostgREST's 1000-row default; keep that
  // display cap while revenue math still uses the full usage set above.
  const usageRows = buildUsageRows({
    usage: usage.slice(0, 1000),
    equipmentNameById,
    visits,
    contracts,
  });

  const completedVisits: CompletedVisitOption[] = (
    completedResult.data ?? []
  ).map((v) => {
    const contract = v.contract_id
      ? contracts.get(v.contract_id as string)
      : undefined;
    const label = `${v.scheduled_date} · ${contract?.customer_name ?? "Customer"} · ${contract?.title ?? "Visit"}`;
    return {
      id: v.id,
      scheduled_date: v.scheduled_date,
      label,
    };
  });

  return {
    report: assetsResult.error
      ? emptyReport
      : {
          assets: aggregatedAssets,
          // Jobs stay server-side; client uses pre-aggregated assets.
          jobs: [],
          companyRevenue: fullReport.companyRevenue,
        },
    usage: usageRows,
    visits: completedVisits,
    companyRevenueInView,
  };
}
