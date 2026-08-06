import { createDataClient } from "@/lib/auth-access";
import { getViewRole } from "@/lib/demo-role";

type ActiveEquipment = {
  id: string;
  name: string;
  category: string;
};

type UsageInsert = {
  equipment_id: string;
  visit_id: string;
  hours: number;
  used_on: string;
  notes: string | null;
};

const PAGE_SIZE = 1000;
const INSERT_CHUNK = 400;

function hashString(value: string) {
  return [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function pickFrom<T>(items: T[], seed: number): T | null {
  if (items.length === 0) return null;
  return items[seed % items.length] ?? null;
}

/** Build typical crew kit: mower + truck (+ trailer every other visit). */
function usageForVisit(
  visit: { id: string; scheduled_date: string },
  byCategory: Record<string, ActiveEquipment[]>
): UsageInsert[] {
  const h = hashString(visit.id);
  const mower = pickFrom(byCategory.Mowers ?? [], h);
  const truck = pickFrom(byCategory.Trucks ?? [], h >> 2);
  const trailer = pickFrom(byCategory.Trailers ?? [], h >> 4);
  const tool = pickFrom(byCategory["Hand/power tools"] ?? [], h >> 6);

  const rows: UsageInsert[] = [];
  if (mower) {
    rows.push({
      equipment_id: mower.id,
      visit_id: visit.id,
      hours: Number((2.5 + (h % 8) * 0.5).toFixed(1)),
      used_on: visit.scheduled_date,
      notes: "Synced for completed visit",
    });
  }
  if (truck) {
    rows.push({
      equipment_id: truck.id,
      visit_id: visit.id,
      hours: Number((1.5 + (h % 5) * 0.5).toFixed(1)),
      used_on: visit.scheduled_date,
      notes: "Synced for completed visit",
    });
  }
  if (trailer && h % 2 === 0) {
    rows.push({
      equipment_id: trailer.id,
      visit_id: visit.id,
      hours: Number((1 + (h % 4) * 0.5).toFixed(1)),
      used_on: visit.scheduled_date,
      notes: "Synced for completed visit",
    });
  } else if (tool) {
    rows.push({
      equipment_id: tool.id,
      visit_id: visit.id,
      hours: Number((0.5 + (h % 4) * 0.5).toFixed(1)),
      used_on: visit.scheduled_date,
      notes: "Synced for completed visit",
    });
  }
  return rows;
}

/**
 * Accountant Visits only: fill completed visits that have no equipment_usage
 * rows yet, using active Equipment-tab assets. Does not post depreciation
 * journals (manual logging on Visits still does).
 */
export async function ensureAccountantCompletedVisitEquipmentUsage(): Promise<{
  filled: number;
}> {
  const role = await getViewRole();
  if (role !== "accountant") return { filled: 0 };

  const supabase = await createDataClient();

  const { data: equipment } = await supabase
    .from("equipment")
    .select("id, name, category")
    .eq("status", "active");

  const active = (equipment ?? []) as ActiveEquipment[];
  if (active.length === 0) return { filled: 0 };

  const byCategory: Record<string, ActiveEquipment[]> = {};
  for (const item of active) {
    byCategory[item.category] = [...(byCategory[item.category] ?? []), item];
  }

  const usedVisitIds = new Set<string>();
  let usageFrom = 0;
  for (;;) {
    const { data: usagePage, error: usageError } = await supabase
      .from("equipment_usage")
      .select("visit_id")
      .not("visit_id", "is", null)
      .order("visit_id", { ascending: true })
      .range(usageFrom, usageFrom + PAGE_SIZE - 1);
    if (usageError || !usagePage?.length) break;
    for (const row of usagePage) {
      if (row.visit_id) usedVisitIds.add(row.visit_id);
    }
    if (usagePage.length < PAGE_SIZE) break;
    usageFrom += PAGE_SIZE;
  }

  const visitsMissing: Array<{ id: string; scheduled_date: string }> = [];
  let from = 0;
  for (;;) {
    const { data: page, error } = await supabase
      .from("service_visits")
      .select("id, scheduled_date")
      .eq("status", "completed")
      .order("scheduled_date", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error || !page?.length) break;

    for (const visit of page) {
      if (!usedVisitIds.has(visit.id)) {
        visitsMissing.push({
          id: visit.id,
          scheduled_date: visit.scheduled_date,
        });
      }
    }

    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  if (visitsMissing.length === 0) return { filled: 0 };

  const inserts: UsageInsert[] = [];
  for (const visit of visitsMissing) {
    inserts.push(...usageForVisit(visit, byCategory));
  }

  let filled = 0;
  for (let i = 0; i < inserts.length; i += INSERT_CHUNK) {
    const chunk = inserts.slice(i, i + INSERT_CHUNK);
    const { error } = await supabase.from("equipment_usage").insert(chunk);
    if (!error) filled += chunk.length;
  }

  return { filled };
}

export type AccountantVisitEquipmentUsage = {
  id: string;
  visitId: string;
  equipmentId: string;
  equipmentName: string;
  category: string;
  hours: number;
  notes: string | null;
};

/** Full equipment_usage list for accountant Visits (paginated past PostgREST 1000 cap). */
export async function fetchAccountantVisitEquipmentUsage(): Promise<
  AccountantVisitEquipmentUsage[]
> {
  const supabase = await createDataClient();
  const all: AccountantVisitEquipmentUsage[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("equipment_usage")
      .select("id, equipment_id, visit_id, hours, notes, equipment(name, category)")
      .order("used_on", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error || !data?.length) break;

    for (const row of data) {
      const equipRaw = row.equipment as
        | { name: string; category: string }
        | { name: string; category: string }[]
        | null;
      const equip = Array.isArray(equipRaw) ? equipRaw[0] : equipRaw;
      all.push({
        id: row.id,
        visitId: row.visit_id,
        equipmentId: row.equipment_id,
        equipmentName: equip?.name ?? "Unknown",
        category: equip?.category ?? "Other",
        hours: Number(row.hours),
        notes: row.notes,
      });
    }

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}
