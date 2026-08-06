import { createDataClient } from "@/lib/auth-access";
import type {
  CompletedVisitOption,
  EquipmentCategory,
  EquipmentJobRevenue,
  EquipmentReportData,
  EquipmentRow,
  EquipmentUsageRow,
} from "./equipment-types";
import { roundMoney, splitJobRevenue } from "./equipment-types";

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

/** Map legacy DB labels if a remote has not run rename migrations yet. */
function normalizeCategory(raw: string): EquipmentCategory {
  if (raw === "Trucks/Trailers") return "Trucks";
  if (raw === "Tractors/skid steers") return "Tractors";
  return raw as EquipmentCategory;
}

async function pageAll<T>(
  fetchPage: (
    from: number,
    to: number
  ) => Promise<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const pageSize = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) {
      console.error(error.message);
      break;
    }
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  return rows;
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

  const { data: assets, error } = await supabase
    .from("equipment")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("fetchEquipment", error);
    return empty;
  }

  type UsageRow = {
    equipment_id: string;
    visit_id: string;
    hours: number | null;
  };
  const usage = await pageAll<UsageRow>(async (from, to) => {
    const result = await supabase
      .from("equipment_usage")
      .select("equipment_id, visit_id, hours")
      .range(from, to);
    return result;
  });

  type VisitRow = {
    id: string;
    scheduled_date: string;
    contracts:
      | {
          id: string;
          title: string;
          customers: { name: string } | { name: string }[] | null;
        }
      | {
          id: string;
          title: string;
          customers: { name: string } | { name: string }[] | null;
        }[]
      | null;
  };
  const visits = await pageAll<VisitRow>(async (from, to) => {
    const result = await supabase
      .from("service_visits")
      .select("id, scheduled_date, contracts(id, title, customers(name))")
      .range(from, to);
    return result;
  });

  type InvoiceRow = { contract_id: string; total: number };
  const invoices = await pageAll<InvoiceRow>(async (from, to) => {
    const result = await supabase
      .from("invoices")
      .select("contract_id, total")
      .range(from, to);
    return result;
  });

  let companyRevenue = 0;
  const billedByContract = new Map<string, number>();
  for (const invoice of invoices) {
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

  type ContractInfo = {
    id: string;
    title: string;
    customer_name: string;
  };

  const visitMeta = new Map<
    string,
    { date: string; contract: ContractInfo | null }
  >();
  const visitsPerContract = new Map<string, number>();

  for (const visit of visits) {
    const contracts = visit.contracts;
    const contract = Array.isArray(contracts) ? contracts[0] : contracts;
    const cust = contract?.customers;
    const customerName = Array.isArray(cust)
      ? (cust[0]?.name ?? "—")
      : (cust?.name ?? "—");
    const info = contract
      ? {
          id: contract.id,
          title: contract.title,
          customer_name: customerName,
        }
      : null;
    visitMeta.set(visit.id, {
      date: visit.scheduled_date,
      contract: info,
    });
    if (info) {
      visitsPerContract.set(
        info.id,
        (visitsPerContract.get(info.id) ?? 0) + 1
      );
    }
  }

  const hoursById = new Map<string, number>();
  const piecesByVisit = new Map<
    string,
    Array<{ equipment_id: string; hours: number }>
  >();

  for (const row of usage) {
    const hours = Number(row.hours);
    const safeHours = Number.isFinite(hours) ? hours : 0;
    hoursById.set(
      row.equipment_id,
      (hoursById.get(row.equipment_id) ?? 0) + Math.max(0, safeHours)
    );

    const list = piecesByVisit.get(row.visit_id) ?? [];
    list.push({ equipment_id: row.equipment_id, hours: Math.max(0, safeHours) });
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
  if (allocatedTotal > companyRevenue && allocatedTotal > 0 && companyRevenue > 0) {
    const scale = companyRevenue / allocatedTotal;
    for (const job of jobs) {
      job.job_revenue = roundMoney(job.job_revenue * scale);
      for (const piece of job.pieces) {
        piece.allocated_revenue = roundMoney(piece.allocated_revenue * scale);
      }
    }
  }

  const assetRows: EquipmentRow[] = ((assets ?? []) as RawEquipment[]).map(
    (a) => ({
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
    })
  );

  return {
    assets: assetRows,
    jobs,
    companyRevenue,
  };
}


export async function fetchEquipmentUsage(): Promise<EquipmentUsageRow[]> {
  const supabase = await createDataClient();

  const { data, error } = await supabase
    .from("equipment_usage")
    .select(
      "id, equipment_id, visit_id, hours, used_on, notes, equipment(name), service_visits(scheduled_date, contracts(title, customers(name)))"
    )
    .order("used_on", { ascending: false });

  if (error) {
    console.error("fetchEquipmentUsage", error);
    return [];
  }

  type Nested = {
    id: string;
    equipment_id: string;
    visit_id: string;
    hours: number;
    used_on: string;
    notes: string | null;
    equipment: { name: string } | { name: string }[] | null;
    service_visits:
      | {
          scheduled_date: string;
          contracts:
            | {
                title: string;
                customers: { name: string } | { name: string }[] | null;
              }
            | {
                title: string;
                customers: { name: string } | { name: string }[] | null;
              }[]
            | null;
        }
      | {
          scheduled_date: string;
          contracts:
            | {
                title: string;
                customers: { name: string } | { name: string }[] | null;
              }
            | {
                title: string;
                customers: { name: string } | { name: string }[] | null;
              }[]
            | null;
        }[]
      | null;
  };

  function one<T>(v: T | T[] | null | undefined): T | null {
    if (!v) return null;
    return Array.isArray(v) ? (v[0] ?? null) : v;
  }

  return ((data ?? []) as Nested[]).map((row) => {
    const equip = one(row.equipment);
    const visit = one(row.service_visits);
    const contract = one(visit?.contracts);
    const customer = one(contract?.customers);
    return {
      id: row.id,
      equipment_id: row.equipment_id,
      equipment_name: equip?.name ?? "Unknown",
      visit_id: row.visit_id,
      hours: Number(row.hours),
      used_on: row.used_on,
      notes: row.notes,
      visit_date: visit?.scheduled_date ?? row.used_on,
      contract_title: contract?.title ?? "Visit",
      customer_name: customer?.name ?? "—",
    };
  });
}

export async function fetchCompletedVisitsForEquipment(): Promise<
  CompletedVisitOption[]
> {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("service_visits")
    .select("id, scheduled_date, contracts(title, customers(name))")
    .eq("status", "completed")
    .order("scheduled_date", { ascending: false });

  if (error) {
    console.error("fetchCompletedVisitsForEquipment", error);
    return [];
  }

  return (data ?? []).map((v) => {
    const contracts = v.contracts as
      | { title: string; customers: { name: string } | { name: string }[] | null }
      | {
          title: string;
          customers: { name: string } | { name: string }[] | null;
        }[]
      | null;
    const contract = Array.isArray(contracts) ? contracts[0] : contracts;
    const cust = contract?.customers;
    const customerName = Array.isArray(cust)
      ? cust[0]?.name
      : cust?.name;
    const label = `${v.scheduled_date} · ${customerName ?? "Customer"} · ${contract?.title ?? "Visit"}`;
    return {
      id: v.id,
      scheduled_date: v.scheduled_date,
      label,
    };
  });
}
