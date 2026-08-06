import { createDataClient } from "@/lib/auth-access";
import type { InventoryCategory, InventoryRow } from "./inventory-types";

type RawInventoryItem = {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  unit: string;
  quantity_on_hand: number;
  par_level: number;
  unit_cost: number | null;
  notes: string | null;
  updated_at: string;
};

function normalizeCategory(raw: string): InventoryCategory {
  if ((["Mulch & beds", "Fertilizer & soil", "Fuel & fluids", "Irrigation", "Sod & turf", "General supplies"] as string[]).includes(raw)) {
    return raw as InventoryCategory;
  }
  return "General supplies";
}

export async function fetchInventoryItems(): Promise<InventoryRow[]> {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("fetchInventoryItems", error);
    return [];
  }

  return (data as RawInventoryItem[]).map((row) => ({
    id: row.id,
    name: row.name,
    sku: row.sku,
    category: normalizeCategory(row.category),
    unit: row.unit,
    quantity_on_hand: Number(row.quantity_on_hand),
    par_level: Number(row.par_level),
    unit_cost: row.unit_cost != null ? Number(row.unit_cost) : null,
    notes: row.notes,
    updated_at: row.updated_at,
  }));
}
