"use server";

import { revalidatePath } from "next/cache";
import { createDataClient } from "@/lib/auth-access";
import { getViewRole } from "@/lib/demo-role";
import { INVENTORY_CATEGORIES } from "./inventory-types";
import type { InventoryCategory } from "./inventory-types";

async function requireAccountant() {
  const role = await getViewRole();
  if (role !== "accountant") {
    throw new Error("Inventory changes require accountant role.");
  }
}

function parseCategory(raw: string): InventoryCategory {
  if ((INVENTORY_CATEGORIES as readonly string[]).includes(raw)) {
    return raw as InventoryCategory;
  }
  return "General supplies";
}

export async function createInventoryItem(formData: FormData): Promise<void> {
  await requireAccountant();
  const supabase = await createDataClient();

  const name = String(formData.get("name") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim() || null;
  const category = parseCategory(String(formData.get("category") ?? "General supplies"));
  const unit = String(formData.get("unit") ?? "each").trim() || "each";
  const quantityOnHand = Number(formData.get("quantity_on_hand") ?? 0);
  const parLevel = Number(formData.get("par_level"));
  const unitCostRaw = String(formData.get("unit_cost") ?? "").trim();
  const unitCost = unitCostRaw ? Number(unitCostRaw) : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name || !(parLevel > 0) || quantityOnHand < 0) return;
  if (unitCost != null && unitCost < 0) return;

  await supabase.from("inventory_items").insert({
    name,
    sku,
    category,
    unit,
    quantity_on_hand: quantityOnHand,
    par_level: parLevel,
    unit_cost: unitCost,
    notes,
  });

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}

export async function updateInventoryItem(formData: FormData): Promise<void> {
  await requireAccountant();
  const supabase = await createDataClient();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim() || null;
  const category = parseCategory(String(formData.get("category") ?? "General supplies"));
  const unit = String(formData.get("unit") ?? "each").trim() || "each";
  const quantityOnHand = Number(formData.get("quantity_on_hand") ?? 0);
  const parLevel = Number(formData.get("par_level"));
  const unitCostRaw = String(formData.get("unit_cost") ?? "").trim();
  const unitCost = unitCostRaw ? Number(unitCostRaw) : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!id || !name || !(parLevel > 0) || quantityOnHand < 0) return;
  if (unitCost != null && unitCost < 0) return;

  await supabase
    .from("inventory_items")
    .update({
      name,
      sku,
      category,
      unit,
      quantity_on_hand: quantityOnHand,
      par_level: parLevel,
      unit_cost: unitCost,
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}

export async function adjustInventoryQuantity(formData: FormData): Promise<void> {
  await requireAccountant();
  const supabase = await createDataClient();

  const id = String(formData.get("id") ?? "");
  const delta = Number(formData.get("delta"));
  if (!id || !Number.isFinite(delta) || delta === 0) return;

  const { data: row } = await supabase
    .from("inventory_items")
    .select("quantity_on_hand")
    .eq("id", id)
    .maybeSingle();

  if (!row) return;

  const nextQty = Math.max(0, Number(row.quantity_on_hand) + delta);

  await supabase
    .from("inventory_items")
    .update({
      quantity_on_hand: nextQty,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}
