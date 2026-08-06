"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createDataClient } from "@/lib/auth-access";
import {
  getViewRole,
  roleCanApproveQuotes,
  roleCanManageQuotes,
} from "@/lib/demo-role";
import {
  estimateMonthlyFee,
  type QuoteLineItem,
} from "@/lib/service-pricing";

export async function saveQuoteDraft(formData: FormData): Promise<void> {
  const role = await getViewRole();
  if (!roleCanManageQuotes(role)) {
    redirect("/dashboard");
  }

  const quoteId = String(formData.get("quote_id") ?? "").trim();
  if (!quoteId) redirect("/quotes");

  const visitsPerWeek = Number(formData.get("visits_per_week") || 1);
  const visitFrequencyNotes = String(
    formData.get("visit_frequency_notes") ?? ""
  ).trim();
  const seasonStart = String(formData.get("season_start") ?? "").trim();
  const seasonEnd = String(formData.get("season_end") ?? "").trim();
  const monthlyFeeRaw = String(formData.get("monthly_fee") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const lineItemsRaw = String(formData.get("line_items_json") ?? "").trim();

  let lineItems: QuoteLineItem[] = [];
  try {
    lineItems = lineItemsRaw ? JSON.parse(lineItemsRaw) : [];
  } catch {
    lineItems = [];
  }

  const acres =
    lineItems.reduce((max, li) => Math.max(max, Number(li.acres) || 0), 0) || 1;
  const monthlyFee = monthlyFeeRaw
    ? Number(monthlyFeeRaw)
    : estimateMonthlyFee(lineItems, acres, visitsPerWeek);

  const supabase = await createDataClient();
  await supabase
    .from("quote_requests")
    .update({
      line_items: lineItems,
      visits_per_week: Number.isFinite(visitsPerWeek) ? visitsPerWeek : 1,
      visit_frequency_notes: visitFrequencyNotes || null,
      season_start: seasonStart || null,
      season_end: seasonEnd || null,
      monthly_fee: Number.isFinite(monthlyFee) ? monthlyFee : null,
      notes: notes || null,
      status: "budgeted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", quoteId);

  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quoteId}`);
  redirect(`/quotes/${quoteId}?saved=1`);
}

export async function submitQuoteForApproval(
  formData: FormData
): Promise<void> {
  const role = await getViewRole();
  if (!roleCanManageQuotes(role)) {
    redirect("/dashboard");
  }

  const quoteId = String(formData.get("quote_id") ?? "").trim();
  if (!quoteId) redirect("/quotes");

  // Persist latest draft fields first
  const visitsPerWeek = Number(formData.get("visits_per_week") || 1);
  const visitFrequencyNotes = String(
    formData.get("visit_frequency_notes") ?? ""
  ).trim();
  const seasonStart = String(formData.get("season_start") ?? "").trim();
  const seasonEnd = String(formData.get("season_end") ?? "").trim();
  const monthlyFeeRaw = String(formData.get("monthly_fee") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const lineItemsRaw = String(formData.get("line_items_json") ?? "").trim();
  let lineItems: QuoteLineItem[] = [];
  try {
    lineItems = lineItemsRaw ? JSON.parse(lineItemsRaw) : [];
  } catch {
    lineItems = [];
  }
  const acres =
    lineItems.reduce((max, li) => Math.max(max, Number(li.acres) || 0), 0) || 1;
  const monthlyFee = monthlyFeeRaw
    ? Number(monthlyFeeRaw)
    : estimateMonthlyFee(lineItems, acres, visitsPerWeek);

  const now = new Date().toISOString();
  const supabase = await createDataClient();
  await supabase
    .from("quote_requests")
    .update({
      line_items: lineItems,
      visits_per_week: Number.isFinite(visitsPerWeek) ? visitsPerWeek : 1,
      visit_frequency_notes: visitFrequencyNotes || null,
      season_start: seasonStart || null,
      season_end: seasonEnd || null,
      monthly_fee: Number.isFinite(monthlyFee) ? monthlyFee : null,
      notes: notes || null,
      status: "pending_manager_approval",
      submitted_for_approval_at: now,
      updated_at: now,
    })
    .eq("id", quoteId);

  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath("/contracts");
  revalidatePath("/dashboard");
  redirect(`/quotes/${quoteId}?submitted=1`);
}

export async function approveQuote(formData: FormData): Promise<void> {
  const role = await getViewRole();
  if (!roleCanApproveQuotes(role)) {
    redirect("/dashboard");
  }

  const quoteId = String(formData.get("quote_id") ?? "").trim();
  if (!quoteId) redirect("/contracts");

  const now = new Date().toISOString();
  const supabase = await createDataClient();
  await supabase
    .from("quote_requests")
    .update({
      status: "approved",
      manager_approved_at: now,
      updated_at: now,
    })
    .eq("id", quoteId);

  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath("/contracts");
  revalidatePath("/dashboard");
  redirect("/contracts?quote_approved=1");
}

export async function requestQuoteChanges(formData: FormData): Promise<void> {
  const role = await getViewRole();
  if (!roleCanApproveQuotes(role)) {
    redirect("/dashboard");
  }

  const quoteId = String(formData.get("quote_id") ?? "").trim();
  const notes = String(formData.get("change_notes") ?? "").trim();
  if (!quoteId) redirect("/contracts");

  const supabase = await createDataClient();
  const { data: quote } = await supabase
    .from("quote_requests")
    .select("notes")
    .eq("id", quoteId)
    .maybeSingle();

  const mergedNotes = [
    quote?.notes || null,
    notes ? `Manager change request: ${notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  await supabase
    .from("quote_requests")
    .update({
      status: "changes_requested",
      manager_approved_at: null,
      notes: mergedNotes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", quoteId);

  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath("/contracts");
  redirect("/contracts?quote_changes=1");
}
