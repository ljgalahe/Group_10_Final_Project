import { createDataClient } from "@/lib/auth-access";
import { allocatedVisitRevenue } from "@/lib/visit-accounting";
import type {
  CompletedVisitOption,
  EquipmentCategory,
  EquipmentRow,
  EquipmentUsageRow,
} from "./equipment-types";

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

export async function fetchEquipment(): Promise<EquipmentRow[]> {
  const supabase = await createDataClient();

  const [{ data: assets, error }, { data: usage }, { data: visits }] =
    await Promise.all([
      supabase.from("equipment").select("*").order("name", { ascending: true }),
      supabase
        .from("equipment_usage")
        .select("equipment_id, visit_id, hours"),
      supabase
        .from("service_visits")
        .select(
          "id, contracts(id, title, monthly_fee, visits_per_week, customers(name))"
        ),
    ]);

  if (error) {
    console.error("fetchEquipment", error);
    return [];
  }

  type ContractInfo = {
    id: string;
    title: string;
    monthly_fee: number | null;
    visits_per_week: number | null;
    customer_name: string;
  };

  const visitMeta = new Map<
    string,
    { revenue: number; contract: ContractInfo | null }
  >();

  for (const visit of visits ?? []) {
    const contracts = visit.contracts as
      | {
          id: string;
          title: string;
          monthly_fee: number | null;
          visits_per_week: number | null;
          customers: { name: string } | { name: string }[] | null;
        }
      | {
          id: string;
          title: string;
          monthly_fee: number | null;
          visits_per_week: number | null;
          customers: { name: string } | { name: string }[] | null;
        }[]
      | null;
    const contract = Array.isArray(contracts) ? contracts[0] : contracts;
    const cust = contract?.customers;
    const customerName = Array.isArray(cust)
      ? (cust[0]?.name ?? "—")
      : (cust?.name ?? "—");
    visitMeta.set(visit.id as string, {
      revenue: allocatedVisitRevenue(
        contract?.monthly_fee,
        contract?.visits_per_week
      ),
      contract: contract
        ? {
            id: contract.id,
            title: contract.title,
            monthly_fee: contract.monthly_fee,
            visits_per_week: contract.visits_per_week,
            customer_name: customerName,
          }
        : null,
    });
  }

  const hoursByVisit = new Map<string, number>();
  for (const row of usage ?? []) {
    const visitId = row.visit_id as string;
    hoursByVisit.set(
      visitId,
      (hoursByVisit.get(visitId) ?? 0) + Number(row.hours)
    );
  }

  const hoursById = new Map<string, number>();
  const revenueById = new Map<string, number>();
  const contractsByEquipment = new Map<
    string,
    Map<
      string,
      {
        contract_id: string;
        contract_title: string;
        customer_name: string;
        hours: number;
        revenue: number;
      }
    >
  >();

  for (const row of usage ?? []) {
    const equipmentId = row.equipment_id as string;
    const visitId = row.visit_id as string;
    const hours = Number(row.hours);
    hoursById.set(equipmentId, (hoursById.get(equipmentId) ?? 0) + hours);

    const meta = visitMeta.get(visitId);
    const visitHours = hoursByVisit.get(visitId) ?? 0;
    const visitRevenue = meta?.revenue ?? 0;
    const share =
      visitHours > 0 && visitRevenue > 0
        ? visitRevenue * (hours / visitHours)
        : 0;

    revenueById.set(
      equipmentId,
      (revenueById.get(equipmentId) ?? 0) + share
    );

    const contract = meta?.contract;
    if (!contract) continue;

    let byContract = contractsByEquipment.get(equipmentId);
    if (!byContract) {
      byContract = new Map();
      contractsByEquipment.set(equipmentId, byContract);
    }
    const existing = byContract.get(contract.id);
    if (existing) {
      existing.hours += hours;
      existing.revenue += share;
    } else {
      byContract.set(contract.id, {
        contract_id: contract.id,
        contract_title: contract.title,
        customer_name: contract.customer_name,
        hours,
        revenue: share,
      });
    }
  }

  return ((assets ?? []) as RawEquipment[]).map((a) => {
    const contracts = Array.from(
      contractsByEquipment.get(a.id)?.values() ?? []
    ).sort((x, y) => y.revenue - x.revenue);

    return {
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
      revenue_produced: revenueById.get(a.id) ?? 0,
      contracts_worked: contracts,
    };
  });
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
