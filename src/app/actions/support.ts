"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createDataClient } from "@/lib/auth-access";
import { getViewCustomerId, getViewRole } from "@/lib/demo-role";
import type { SupportCategory, SupportLinkType } from "@/lib/types";

const CATEGORIES = new Set<SupportCategory>([
  "question",
  "concern",
  "complaint",
  "billing_dispute",
]);

export async function submitSupportRequest(
  formData: FormData
): Promise<void> {
  const role = await getViewRole();
  if (role !== "customer") {
    redirect("/dashboard");
  }

  const customerId = await getViewCustomerId();
  if (!customerId) {
    redirect("/contact");
  }

  const categoryRaw = (formData.get("category") as string) || "";
  const message = ((formData.get("message") as string) || "").trim();
  const linkedRaw = ((formData.get("linked_record") as string) || "").trim();

  if (!CATEGORIES.has(categoryRaw as SupportCategory) || !message) {
    redirect("/contact?error=invalid");
  }

  let linked_type: SupportLinkType | null = null;
  let linked_id: string | null = null;

  if (linkedRaw) {
    const [type, id] = linkedRaw.split(":");
    if (
      (type === "contract" || type === "visit" || type === "invoice") &&
      id
    ) {
      linked_type = type;
      linked_id = id;
    }
  }

  const supabase = await createDataClient();
  await supabase.from("support_requests").insert({
    customer_id: customerId,
    category: categoryRaw,
    message,
    linked_type,
    linked_id,
    status: "Open",
  });

  revalidatePath("/contact");
  revalidatePath("/support");
  redirect("/contact?submitted=1");
}

const SUPPORT_STATUSES = new Set(["Open", "In Progress", "Resolved"]);

export async function updateSupportRequestStatus(
  formData: FormData
): Promise<void> {
  const role = await getViewRole();
  if (role !== "manager") {
    redirect("/dashboard");
  }

  const requestId = (formData.get("request_id") as string) || "";
  const status = (formData.get("status") as string) || "";
  const resolutionNotes = (
    (formData.get("resolution_notes") as string) || ""
  ).trim();

  if (!requestId || !SUPPORT_STATUSES.has(status)) {
    redirect("/support?error=status");
  }

  const supabase = await createDataClient();
  await supabase
    .from("support_requests")
    .update({
      status,
      resolution_notes: resolutionNotes || null,
    })
    .eq("id", requestId);

  revalidatePath("/support");
  revalidatePath("/contact");
  revalidatePath(`/contact/${requestId}`);
  redirect("/support?updated=1");
}

export async function markInvoiceDisputed(formData: FormData): Promise<void> {
  const role = await getViewRole();
  if (role !== "manager") {
    redirect("/dashboard");
  }

  const invoiceId = (formData.get("invoice_id") as string) || "";
  const requestId = (formData.get("request_id") as string) || "";

  if (!invoiceId) {
    redirect("/support?error=invoice");
  }

  const supabase = await createDataClient();

  if (requestId) {
    const { data: request } = await supabase
      .from("support_requests")
      .select("category, linked_type, linked_id")
      .eq("id", requestId)
      .single();

    if (
      !request ||
      request.category !== "billing_dispute" ||
      request.linked_type !== "invoice" ||
      request.linked_id !== invoiceId
    ) {
      redirect("/support?error=invoice");
    }
  }

  await supabase
    .from("invoices")
    .update({ status: "disputed" })
    .eq("id", invoiceId);

  revalidatePath("/support");
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/contact");
  redirect("/support?disputed=1");
}

export async function requestContractRenewal(
  formData: FormData
): Promise<void> {
  const role = await getViewRole();
  if (role !== "customer") {
    redirect("/dashboard");
  }

  const customerId = await getViewCustomerId();
  if (!customerId) {
    redirect("/dashboard");
  }

  const contractId = (formData.get("contract_id") as string) || "";
  if (!contractId) {
    redirect("/dashboard?error=renewal");
  }

  const supabase = await createDataClient();
  const { data: contract } = await supabase
    .from("contracts")
    .select("id, title, season_end, customer_id, status")
    .eq("id", contractId)
    .eq("customer_id", customerId)
    .single();

  if (!contract || contract.status !== "active") {
    redirect("/dashboard?error=renewal");
  }

  const { data: existing } = await supabase
    .from("support_requests")
    .select("id")
    .eq("customer_id", customerId)
    .eq("category", "renewal")
    .eq("linked_type", "contract")
    .eq("linked_id", contractId)
    .in("status", ["Open", "In Progress"])
    .maybeSingle();

  if (existing) {
    redirect("/dashboard?renewal=already");
  }

  const endLabel = contract.season_end;
  await supabase.from("support_requests").insert({
    customer_id: customerId,
    category: "renewal",
    message: `Customer requested renewal of "${contract.title}" (current season ends ${endLabel}). Please follow up with renewal options.`,
    linked_type: "contract",
    linked_id: contractId,
    status: "Open",
  });

  revalidatePath("/dashboard");
  revalidatePath("/support");
  revalidatePath("/contact");
  redirect("/dashboard?renewal=1");
}
