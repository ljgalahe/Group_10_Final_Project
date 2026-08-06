"use server";

import { revalidatePath } from "next/cache";
import { postDepreciationJournalForUsage } from "@/app/actions/journal";
import { createDataClient } from "@/lib/auth-access";
import { getViewRole } from "@/lib/demo-role";
import { EQUIPMENT_CATEGORIES } from "./equipment-types";
import type { EquipmentCategory } from "./equipment-types";

async function requireAccountant() {
  const role = await getViewRole();
  if (role !== "accountant") {
    throw new Error("Equipment changes require accountant role.");
  }
}

function parseCategory(raw: string) {
  const normalized =
    raw === "Trucks/Trailers"
      ? "Trucks"
      : raw === "Tractors/skid steers"
        ? "Tractors"
        : raw;
  if ((EQUIPMENT_CATEGORIES as readonly string[]).includes(normalized)) {
    return normalized as EquipmentCategory;
  }
  return "Other" as EquipmentCategory;
}

export async function createEquipment(formData: FormData): Promise<void> {
  await requireAccountant();
  const supabase = await createDataClient();

  const name = String(formData.get("name") ?? "").trim();
  const category = parseCategory(String(formData.get("category") ?? "Other"));
  const purchaseDate = String(formData.get("purchase_date") ?? "");
  const cost = Number(formData.get("cost"));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const isHandTool = category === "Hand/power tools";
  const salvage = isHandTool
    ? 0
    : Number(formData.get("salvage_value") ?? 0);
  // DB requires estimated_total_hours > 0; hand tools ignore useful life in the UI.
  const estimatedHours = isHandTool
    ? 1
    : Number(formData.get("estimated_total_hours"));
  const usefulLifeYears = isHandTool ? 0 : 5;
  const usefulLifeMonths = isHandTool ? 1 : 0; // satisfy useful_life_positive when years=0

  if (!name || !purchaseDate || !(cost >= 0)) return;
  if (!isHandTool && !(estimatedHours > 0)) return;
  if (salvage > cost) return;

  await supabase.from("equipment").insert({
    name,
    category,
    purchase_date: purchaseDate,
    cost,
    salvage_value: salvage,
    useful_life_years: usefulLifeYears,
    useful_life_months: usefulLifeMonths,
    estimated_total_hours: estimatedHours,
    status: "active",
    notes,
  });

  revalidatePath("/equipment");
}

export async function updateEquipment(formData: FormData): Promise<void> {
  await requireAccountant();
  const supabase = await createDataClient();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const category = parseCategory(String(formData.get("category") ?? "Other"));
  const purchaseDate = String(formData.get("purchase_date") ?? "");
  const cost = Number(formData.get("cost"));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const isHandTool = category === "Hand/power tools";
  const salvage = isHandTool
    ? 0
    : Number(formData.get("salvage_value") ?? 0);
  const estimatedHours = isHandTool
    ? 1
    : Number(formData.get("estimated_total_hours"));
  const usefulLifeYears = isHandTool ? 0 : 5;
  const usefulLifeMonths = isHandTool ? 1 : 0;

  if (!id || !name || !purchaseDate || !(cost >= 0)) {
    return;
  }
  if (!isHandTool && !(estimatedHours > 0)) return;
  if (salvage > cost) return;

  await supabase
    .from("equipment")
    .update({
      name,
      category,
      purchase_date: purchaseDate,
      cost,
      salvage_value: salvage,
      useful_life_years: usefulLifeYears,
      useful_life_months: usefulLifeMonths,
      estimated_total_hours: estimatedHours,
      notes,
    })
    .eq("id", id);

  revalidatePath("/equipment");
}

export async function retireEquipment(formData: FormData): Promise<void> {
  await requireAccountant();
  const supabase = await createDataClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const today = new Date().toISOString().slice(0, 10);
  await supabase
    .from("equipment")
    .update({ status: "retired", retired_at: today })
    .eq("id", id);

  revalidatePath("/equipment");
}

export async function reactivateEquipment(formData: FormData): Promise<void> {
  await requireAccountant();
  const supabase = await createDataClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabase
    .from("equipment")
    .update({ status: "active", retired_at: null })
    .eq("id", id);

  revalidatePath("/equipment");
}

export async function logEquipmentHours(formData: FormData): Promise<void> {
  await requireAccountant();
  const supabase = await createDataClient();

  const equipmentId = String(formData.get("equipment_id") ?? "");
  const visitId = String(formData.get("visit_id") ?? "");
  const hours = Number(formData.get("hours"));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!equipmentId || !visitId || !(hours > 0)) return;

  const { data: visit } = await supabase
    .from("service_visits")
    .select("scheduled_date, status")
    .eq("id", visitId)
    .single();

  if (!visit || visit.status !== "completed") return;

  const { data: inserted } = await supabase
    .from("equipment_usage")
    .insert({
      equipment_id: equipmentId,
      visit_id: visitId,
      hours,
      used_on: visit.scheduled_date,
      notes,
    })
    .select("id")
    .single();

  if (inserted?.id) {
    await postDepreciationJournalForUsage(inserted.id, { revalidate: false });
  }

  revalidatePath("/equipment");
  revalidatePath("/visits");
}

export async function addVisitEquipmentUsage(formData: FormData): Promise<void> {
  await requireAccountant();
  const supabase = await createDataClient();

  const equipmentId = String(formData.get("equipment_id") ?? "");
  const visitId = String(formData.get("visit_id") ?? "");
  const hours = Number(formData.get("hours"));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!equipmentId || !visitId || !(hours > 0)) return;

  const { data: visit } = await supabase
    .from("service_visits")
    .select("scheduled_date")
    .eq("id", visitId)
    .single();

  if (!visit) return;

  const { data: inserted } = await supabase
    .from("equipment_usage")
    .insert({
      equipment_id: equipmentId,
      visit_id: visitId,
      hours,
      used_on: visit.scheduled_date,
      notes,
    })
    .select("id")
    .single();

  if (inserted?.id) {
    await postDepreciationJournalForUsage(inserted.id, { revalidate: false });
  }

  revalidatePath("/visits");
  revalidatePath("/equipment");
}

export async function removeVisitEquipmentUsage(formData: FormData): Promise<void> {
  await requireAccountant();
  const supabase = await createDataClient();
  const id = String(formData.get("usage_id") ?? "");
  if (!id) return;

  await supabase.from("equipment_usage").delete().eq("id", id);

  revalidatePath("/visits");
  revalidatePath("/equipment");
}
