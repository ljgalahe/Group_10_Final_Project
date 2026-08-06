"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createDataClient } from "@/lib/auth-access";
import {
  getViewCustomerId,
  getViewRole,
  roleCanDraftContracts,
  roleCanManageQuotes,
  roleCanSignContracts,
} from "@/lib/demo-role";
import type { QuoteLineItem } from "@/lib/service-pricing";
import { DEMO_CREW_LEAD_NAME } from "@/lib/types";

/** Create a draft contract from an approved quote (Ops Draft Contracts). */
export async function createContractFromApprovedQuote(
  formData: FormData
): Promise<void> {
  const role = await getViewRole();
  if (!roleCanDraftContracts(role) && !roleCanManageQuotes(role)) {
    redirect("/dashboard");
  }

  const quoteId = String(formData.get("quote_id") ?? "").trim();
  if (!quoteId) redirect("/contracts");

  const supabase = await createDataClient();
  const { data: quote } = await supabase
    .from("quote_requests")
    .select("*")
    .eq("id", quoteId)
    .maybeSingle();

  if (!quote || quote.status !== "approved") {
    redirect("/contracts?error=quote_not_approved");
  }
  if (quote.draft_contract_id) {
    redirect(`/contracts/${quote.draft_contract_id}`);
  }

  const lineItems = (quote.line_items as QuoteLineItem[]) ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const seasonEndDefault = new Date();
  seasonEndDefault.setMonth(seasonEndDefault.getMonth() + 6);

  const { data: contract, error } = await supabase
    .from("contracts")
    .insert({
      customer_id: quote.customer_id,
      title: `${quote.service_description.slice(0, 60)}`,
      status: "draft",
      approval_state: "draft",
      season_start: quote.season_start || today,
      season_end:
        quote.season_end || seasonEndDefault.toISOString().slice(0, 10),
      monthly_fee: quote.monthly_fee != null ? Number(quote.monthly_fee) : null,
      visits_per_week:
        quote.visits_per_week != null ? Number(quote.visits_per_week) : 1,
      billing_method: "monthly",
      notes: [
        quote.notes,
        quote.visit_frequency_notes
          ? `Visit frequency: ${quote.visit_frequency_notes}`
          : null,
      ]
        .filter(Boolean)
        .join("\n"),
      assigned_crew: DEMO_CREW_LEAD_NAME,
      account_manager: "Operations",
      quote_id: quoteId,
      drafted_by_role: "operations",
      manager_approved_at: quote.manager_approved_at,
      customer_signed_at: null,
      customer_signature_name: null,
    })
    .select("id")
    .single();

  if (error || !contract) {
    redirect(
      `/contracts?error=${encodeURIComponent(error?.message ?? "draft")}`
    );
  }

  if (lineItems.length > 0) {
    await supabase.from("contract_services").insert(
      lineItems.map((li) => ({
        contract_id: contract.id,
        service_name: li.label,
        included: true,
      }))
    );
  }

  await supabase
    .from("quote_requests")
    .update({
      draft_contract_id: contract.id,
      status: "contract_drafted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", quoteId);

  await supabase.from("contract_audit_logs").insert({
    contract_id: contract.id,
    action: "contract_drafted_from_approved_quote",
    actor_role: role,
    details: { quote_id: quoteId },
  });

  revalidatePath("/contracts");
  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quoteId}`);
  redirect(`/contracts/${contract.id}`);
}

/** Ops sends draft to customer as Proposed Contract. */
export async function sendContractToCustomer(
  formData: FormData
): Promise<void> {
  const role = await getViewRole();
  if (!roleCanDraftContracts(role) && !roleCanManageQuotes(role)) {
    redirect("/dashboard");
  }

  const contractId = String(formData.get("contract_id") ?? "").trim();
  if (!contractId) redirect("/contracts");

  const supabase = await createDataClient();
  await supabase
    .from("contracts")
    .update({
      approval_state: "pending_customer",
      status: "draft",
    })
    .eq("id", contractId);

  await supabase.from("contract_audit_logs").insert({
    contract_id: contractId,
    action: "contract_sent_to_customer",
    actor_role: role,
    details: {},
  });

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${contractId}`);
  redirect(`/contracts/${contractId}?sent=1`);
}

/** Customer signs Proposed Contract. */
export async function signCustomerContract(
  formData: FormData
): Promise<void> {
  const role = await getViewRole();
  if (!roleCanSignContracts(role)) {
    redirect("/dashboard");
  }

  const contractId = String(formData.get("contract_id") ?? "").trim();
  const signatureName = String(
    formData.get("signature_name") ?? ""
  ).trim();
  if (!contractId || !signatureName) {
    redirect("/contracts?error=signature");
  }

  const customerId = await getViewCustomerId();
  const supabase = await createDataClient();
  const { data: contract } = await supabase
    .from("contracts")
    .select("id, customer_id, approval_state")
    .eq("id", contractId)
    .maybeSingle();

  if (!contract || (customerId && contract.customer_id !== customerId)) {
    redirect("/contracts");
  }
  if (contract.approval_state !== "pending_customer") {
    redirect(`/contracts/${contractId}`);
  }

  const now = new Date().toISOString();
  await supabase
    .from("contracts")
    .update({
      approval_state: "approved",
      status: "active",
      customer_signed_at: now,
      customer_signature_name: signatureName,
    })
    .eq("id", contractId);

  await supabase.from("contract_audit_logs").insert({
    contract_id: contractId,
    action: "contract_signed_by_customer",
    actor_role: role,
    details: { signature_name: signatureName },
  });

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${contractId}`);
  revalidatePath("/schedule");
  revalidatePath("/visits");
  revalidatePath("/dashboard");
  redirect(`/contracts/${contractId}?signed=1`);
}

/** Customer declines a Proposed Contract with questions or concerns. */
export async function declineCustomerContract(
  formData: FormData
): Promise<void> {
  const role = await getViewRole();
  if (!roleCanSignContracts(role)) {
    redirect("/dashboard");
  }

  const contractId = String(formData.get("contract_id") ?? "").trim();
  const notes = String(formData.get("decline_notes") ?? "").trim();
  if (!contractId || !notes) {
    redirect(
      contractId
        ? `/contracts/${contractId}?error=decline`
        : "/contracts?error=decline"
    );
  }

  const customerId = await getViewCustomerId();
  const supabase = await createDataClient();
  const { data: contract } = await supabase
    .from("contracts")
    .select("id, customer_id, approval_state, customer_signed_at")
    .eq("id", contractId)
    .maybeSingle();

  if (!contract || (customerId && contract.customer_id !== customerId)) {
    redirect("/contracts");
  }
  if (
    contract.approval_state !== "pending_customer" ||
    contract.customer_signed_at
  ) {
    redirect(`/contracts/${contractId}`);
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("contracts")
    .update({
      approval_state: "changes_requested",
      status: "draft",
      customer_declined_at: now,
      customer_decline_notes: notes,
    })
    .eq("id", contractId);

  if (error) {
    // Columns may not exist yet — still move off pending_customer when possible.
    const { error: fallbackError } = await supabase
      .from("contracts")
      .update({
        approval_state: "changes_requested",
        status: "draft",
      })
      .eq("id", contractId);
    if (fallbackError) {
      redirect(
        `/contracts/${contractId}?error=${encodeURIComponent(error.message)}`
      );
    }
  }

  await supabase.from("contract_audit_logs").insert({
    contract_id: contractId,
    action: "contract_declined_by_customer",
    actor_role: role,
    details: { notes },
  });

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${contractId}`);
  revalidatePath("/dashboard");
  redirect(`/contracts?declined=1`);
}
