"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createDataClient } from "@/lib/auth-access";
import {
  getViewCustomerId,
  getViewRole,
  roleCanDraftContracts,
  roleCanManageQuotes,
} from "@/lib/demo-role";
import type { QuoteStatus } from "@/lib/types";
import { DEMO_CREW_LEAD_NAME } from "@/lib/types";

export async function requestServiceQuote(formData: FormData): Promise<void> {
  const role = await getViewRole();
  if (role !== "customer") {
    redirect("/dashboard");
  }

  const customerId = await getViewCustomerId();
  if (!customerId) {
    redirect("/dashboard");
  }

  const serviceDescription = (
    (formData.get("service_description") as string) || ""
  ).trim();
  const contractId = ((formData.get("contract_id") as string) || "").trim();
  const notes = ((formData.get("notes") as string) || "").trim();

  if (!serviceDescription) {
    redirect("/request-quote?error=1");
  }

  const supabase = await createDataClient();
  let relatedContractId: string | null = null;
  let propertyAddress: string | null = null;

  const { data: customer } = await supabase
    .from("customers")
    .select("address")
    .eq("id", customerId)
    .maybeSingle();
  propertyAddress = customer?.address ?? null;

  if (contractId) {
    const { data: contract } = await supabase
      .from("contracts")
      .select("id, title")
      .eq("id", contractId)
      .eq("customer_id", customerId)
      .single();
    if (contract) {
      relatedContractId = contract.id;
    }
  }

  const { error } = await supabase.from("quote_requests").insert({
    customer_id: customerId,
    service_description: serviceDescription,
    notes: notes || null,
    related_contract_id: relatedContractId,
    property_address: propertyAddress,
    status: "new",
  });

  if (error) {
    // Fallback: legacy support ticket if quotes table not migrated yet
    await supabase.from("support_requests").insert({
      customer_id: customerId,
      category: "service_quote",
      message: [
        `Customer requested a quote for additional services: ${serviceDescription}`,
        notes ? `Notes: ${notes}` : null,
        "Routed to Operations quotes inbox.",
      ]
        .filter(Boolean)
        .join(" "),
      linked_type: relatedContractId ? "contract" : null,
      linked_id: relatedContractId,
      status: "Open",
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/quotes");
  revalidatePath("/request-quote");
  redirect("/dashboard?quote=1");
}

export async function updateQuoteStatus(
  quoteId: string,
  status: QuoteStatus
): Promise<void> {
  const role = await getViewRole();
  if (!roleCanManageQuotes(role)) return;

  const supabase = await createDataClient();
  await supabase
    .from("quote_requests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", quoteId);

  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quoteId}`);
}

export async function saveQuoteBudget(formData: FormData): Promise<void> {
  const role = await getViewRole();
  if (!roleCanManageQuotes(role)) {
    redirect("/dashboard");
  }

  const quoteId = (formData.get("quote_id") as string) || "";
  const budgetHours = parseFloat(formData.get("budget_hours") as string);
  const budgetSupplies = ((formData.get("budget_supplies") as string) || "").trim();

  if (!quoteId) redirect("/quotes");

  const supabase = await createDataClient();
  await supabase
    .from("quote_requests")
    .update({
      budget_hours: Number.isFinite(budgetHours) ? budgetHours : null,
      budget_supplies: budgetSupplies || null,
      status: "budgeted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", quoteId);

  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quoteId}`);
  redirect(`/quotes/${quoteId}?budget=1`);
}

export async function scheduleSurveyVisit(formData: FormData): Promise<void> {
  const role = await getViewRole();
  if (!roleCanManageQuotes(role)) {
    redirect("/dashboard");
  }

  const quoteId = (formData.get("quote_id") as string) || "";
  const scheduledDate = (formData.get("scheduled_date") as string) || "";
  const crewLead =
    ((formData.get("crew_lead_name") as string) || "").trim() ||
    DEMO_CREW_LEAD_NAME;

  if (!quoteId || !scheduledDate) {
    redirect("/quotes");
  }

  const supabase = await createDataClient();
  const { data: quote } = await supabase
    .from("quote_requests")
    .select("id, customer_id, related_contract_id, service_description")
    .eq("id", quoteId)
    .single();

  if (!quote) redirect("/quotes");

  let contractId = quote.related_contract_id as string | null;

  if (!contractId) {
    const { data: active } = await supabase
      .from("contracts")
      .select("id")
      .eq("customer_id", quote.customer_id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    contractId = active?.id ?? null;
  }

  if (!contractId) {
    const { data: draftContract } = await supabase
      .from("contracts")
      .insert({
        customer_id: quote.customer_id,
        title: `Survey staging — ${quote.service_description.slice(0, 40)}`,
        status: "draft",
        approval_state: "draft",
        season_start: scheduledDate,
        season_end: scheduledDate,
        monthly_fee: null,
        visits_per_week: 0,
        billing_method: "per_visit",
        notes: "Temporary contract row for site survey visit (Operations).",
        drafted_by_role: "operations",
        quote_id: quoteId,
      })
      .select("id")
      .single();
    contractId = draftContract?.id ?? null;
  }

  if (!contractId) {
    redirect(`/quotes/${quoteId}?error=survey`);
  }

  const { data: visit, error } = await supabase
    .from("service_visits")
    .insert({
      contract_id: contractId,
      scheduled_date: scheduledDate,
      status: "scheduled",
      visit_kind: "survey",
      crew_lead_name: crewLead,
      quote_id: quoteId,
      crew_notes: `Site survey for quote: ${quote.service_description}`,
    })
    .select("id")
    .single();

  if (error || !visit) {
    redirect(`/quotes/${quoteId}?error=survey`);
  }

  await supabase
    .from("quote_requests")
    .update({
      survey_visit_id: visit.id,
      status: "survey_scheduled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", quoteId);

  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath("/schedule");
  revalidatePath("/visits");
  redirect(`/quotes/${quoteId}?survey=1`);
}

export async function draftContractFromQuote(formData: FormData): Promise<void> {
  const role = await getViewRole();
  if (!roleCanDraftContracts(role) && !roleCanManageQuotes(role)) {
    redirect("/dashboard");
  }

  const quoteId = (formData.get("quote_id") as string) || "";
  const title = ((formData.get("title") as string) || "").trim();
  const monthlyFee = parseFloat(formData.get("monthly_fee") as string);
  const seasonStart = (formData.get("season_start") as string) || "";
  const seasonEnd = (formData.get("season_end") as string) || "";
  const visitsPerWeek = formData.get("visits_per_week")
    ? parseInt(formData.get("visits_per_week") as string, 10)
    : 1;
  const assignedCrew = ((formData.get("assigned_crew") as string) || "").trim();
  const notes = ((formData.get("notes") as string) || "").trim();

  if (!quoteId || !title || !seasonStart || !seasonEnd) {
    redirect("/quotes");
  }

  const supabase = await createDataClient();
  const { data: quote } = await supabase
    .from("quote_requests")
    .select("*")
    .eq("id", quoteId)
    .single();

  if (!quote) redirect("/quotes");

  const budgetNote = [
    quote.budget_hours != null ? `Budgeted hours: ${quote.budget_hours}` : null,
    quote.budget_supplies ? `Supplies: ${quote.budget_supplies}` : null,
    notes || null,
  ]
    .filter(Boolean)
    .join("\n");

  const { data: contract, error } = await supabase
    .from("contracts")
    .insert({
      customer_id: quote.customer_id,
      title,
      status: "draft",
      approval_state: "pending_approvals",
      season_start: seasonStart,
      season_end: seasonEnd,
      monthly_fee: Number.isFinite(monthlyFee) ? monthlyFee : null,
      visits_per_week: Number.isFinite(visitsPerWeek) ? visitsPerWeek : 1,
      billing_method: "monthly",
      notes: budgetNote || null,
      assigned_crew: assignedCrew || DEMO_CREW_LEAD_NAME,
      account_manager: "Operations",
      quote_id: quoteId,
      drafted_by_role: "operations",
      manager_approved_at: null,
      accountant_approved_at: null,
    })
    .select("id")
    .single();

  if (error || !contract) {
    redirect(`/quotes/${quoteId}?error=draft`);
  }

  await supabase.from("quote_requests").update({
    draft_contract_id: contract.id,
    status: "contract_drafted",
    updated_at: new Date().toISOString(),
  }).eq("id", quoteId);

  await supabase.from("contract_audit_logs").insert({
    contract_id: contract.id,
    action: "contract_drafted_by_operations",
    actor_role: role,
    details: { quote_id: quoteId, title },
  });

  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath("/contracts");
  revalidatePath("/dashboard");
  redirect(`/contracts/${contract.id}`);
}
