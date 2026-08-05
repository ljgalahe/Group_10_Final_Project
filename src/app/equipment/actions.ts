"use server";

import { revalidatePath } from "next/cache";
import { createDataClient } from "@/lib/auth-access";
import { getViewRole } from "@/lib/demo-role";
import { EQUIPMENT_CATEGORIES } from "./equipment-types";

async function requireAccountant() {
  const role = await getViewRole();
  if (role !== "accountant") {
    throw new Error("Equipment changes require accountant role.");
  }
}

function parseCategory(raw: string) {
  if ((EQUIPMENT_CATEGORIES as readonly string[]).includes(raw)) {
    return raw;
  }
  return "Other";
}

export async function createEquipment(formData: FormData): Promise<void> {
  await requireAccountant();
  const supabase = await createDataClient();

  const name = String(formData.get("name") ?? "").trim();
  const category = parseCategory(String(formData.get("category") ?? "Other"));
  const purchaseDate = String(formData.get("purchase_date") ?? "");
  const cost = Number(formData.get("cost"));
  const salvage = Number(formData.get("salvage_value") ?? 0);
  const years = Number(formData.get("useful_life_years") ?? 0);
  const months = Number(formData.get("useful_life_months") ?? 0);
  const estimatedHours = Number(formData.get("estimated_total_hours"));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name || !purchaseDate || !(cost >= 0) || !(estimatedHours > 0)) return;
  if (salvage > cost) return;
  if (years <= 0 && months <= 0) return;

  await supabase.from("equipment").insert({
    name,
    category,
    purchase_date: purchaseDate,
    cost,
    salvage_value: salvage,
    useful_life_years: years,
    useful_life_months: months,
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
  const salvage = Number(formData.get("salvage_value") ?? 0);
  const years = Number(formData.get("useful_life_years") ?? 0);
  const months = Number(formData.get("useful_life_months") ?? 0);
  const estimatedHours = Number(formData.get("estimated_total_hours"));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!id || !name || !purchaseDate || !(cost >= 0) || !(estimatedHours > 0)) {
    return;
  }
  if (salvage > cost) return;
  if (years <= 0 && months <= 0) return;

  await supabase
    .from("equipment")
    .update({
      name,
      category,
      purchase_date: purchaseDate,
      cost,
      salvage_value: salvage,
      useful_life_years: years,
      useful_life_months: months,
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

  await supabase.from("equipment_usage").insert({
    equipment_id: equipmentId,
    visit_id: visitId,
    hours,
    used_on: visit.scheduled_date,
    notes,
  });

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

  await supabase.from("equipment_usage").insert({
    equipment_id: equipmentId,
    visit_id: visitId,
    hours,
    used_on: visit.scheduled_date,
    notes,
  });

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
