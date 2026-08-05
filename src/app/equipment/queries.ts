import { createDataClient } from "@/lib/auth-access";
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

export async function fetchEquipment(): Promise<EquipmentRow[]> {
  const supabase = await createDataClient();

  const [{ data: assets, error }, { data: usage }] = await Promise.all([
    supabase
      .from("equipment")
      .select("*")
      .order("name", { ascending: true }),
    supabase.from("equipment_usage").select("equipment_id, hours"),
  ]);

  if (error) {
    console.error("fetchEquipment", error);
    return [];
  }

  const hoursById = new Map<string, number>();
  for (const row of usage ?? []) {
    const id = row.equipment_id as string;
    hoursById.set(id, (hoursById.get(id) ?? 0) + Number(row.hours));
  }

  return ((assets ?? []) as RawEquipment[]).map((a) => ({
    id: a.id,
    name: a.name,
    category: a.category as EquipmentCategory,
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
  }));
}

export async function fetchEquipmentUsage(): Promise<EquipmentUsageRow[]> {
  const supabase = await createDataClient();

  const { data, error } = await supabase
    .from("equipment_usage")
    .select(
      "id, equipment_id, visit_id, hours, used_on, notes, equipment(name, category), service_visits(scheduled_date, contracts(title, customers(name)))"
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
    equipment:
      | { name: string; category: string }
      | { name: string; category: string }[]
      | null;
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
      equipment_category: (equip?.category as EquipmentCategory) ?? "Other",
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
