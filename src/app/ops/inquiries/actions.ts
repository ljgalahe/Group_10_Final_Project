"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createDataClient, requireAppAccess } from "@/lib/auth-access";
import { SERVICE_LABELS } from "@/lib/commercial-services";
import {
  getViewRole,
  roleCanViewInquiriesInbox,
} from "@/lib/demo-role";

const INQUIRY_STATUSES = new Set([
  "New",
  "Under review",
  "Converted to quote",
  "Closed - Won",
  "Closed - Lost",
]);

const PROPERTY_LABELS: Record<string, string> = {
  office_park: "Office Park",
  retail_center: "Retail Center",
  hospitality: "Hotel / Hospitality",
  institutional: "Campus / Science & Cultural",
  industrial: "Industrial",
  multifamily: "Residential Community",
  other: "Other",
};

const RELATED_CONTRACT_RE =
  /Related contract:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
const EXISTING_SERVICE_RE =
  /^Existing client new service request:\s*(.+)$/im;

export async function updateInquiryStatus(formData: FormData) {
  await requireAppAccess();
  if (!roleCanViewInquiriesInbox(await getViewRole())) return;

  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!id || !INQUIRY_STATUSES.has(status)) return;
  if (status === "Converted to quote") return;

  const supabase = await createDataClient();
  await supabase
    .from("inquiries")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .neq("status", "Converted to quote");

  revalidatePath("/ops/inquiries");
}

export async function convertInquiryToQuote(formData: FormData) {
  await requireAppAccess();
  if (!roleCanViewInquiriesInbox(await getViewRole())) {
    redirect("/dashboard");
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    redirect("/ops/inquiries?error=missing");
  }

  const supabase = await createDataClient();
  const { data: inquiry, error: loadError } = await supabase
    .from("inquiries")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (loadError || !inquiry) {
    redirect("/ops/inquiries?error=notfound");
  }

  if (inquiry.status === "Converted to quote" && inquiry.quote_id) {
    redirect(`/quotes/${inquiry.quote_id}`);
  }

  const propertyLabel =
    PROPERTY_LABELS[inquiry.property_type] ?? inquiry.property_type;
  const services = ((inquiry.services_interested as string[]) ?? [])
    .map((s) => SERVICE_LABELS[s] ?? s)
    .join(", ");

  const message = (inquiry.message as string | null) ?? "";
  const existingServiceMatch = message.match(EXISTING_SERVICE_RE);
  const relatedContractMatch = message.match(RELATED_CONTRACT_RE);
  const relatedContractId = relatedContractMatch?.[1] ?? null;
  const linkedCustomerId =
    (inquiry.converted_customer_id as string | null) ?? null;

  const serviceDescription = existingServiceMatch
    ? existingServiceMatch[1].trim()
    : [
        `New commercial prospect: ${inquiry.company_name}`,
        `Property type: ${propertyLabel}`,
        services ? `Services: ${services}` : null,
      ]
        .filter(Boolean)
        .join(". ");

  const notes = [
    `Contact: ${inquiry.contact_name} · ${inquiry.contact_email}`,
    inquiry.contact_phone ? `Phone: ${inquiry.contact_phone}` : null,
    message ? `Message: ${message}` : null,
    `Source: Inquiries pipeline (${inquiry.id})`,
    linkedCustomerId ? "Type: Existing client new service inquiry" : null,
  ]
    .filter(Boolean)
    .join("\n");

  let customerId = linkedCustomerId;

  if (!customerId) {
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .insert({
        name: inquiry.company_name,
        property_type: propertyLabel,
        address: inquiry.property_address,
        contact_name: inquiry.contact_name,
        contact_email: inquiry.contact_email,
      })
      .select("id")
      .single();

    if (customerError || !customer) {
      redirect(
        `/ops/inquiries?error=${encodeURIComponent(customerError?.message ?? "customer")}`
      );
    }
    customerId = customer.id;
  }

  const { data: quote, error: quoteError } = await supabase
    .from("quote_requests")
    .insert({
      customer_id: customerId,
      service_description: serviceDescription,
      notes,
      property_address: inquiry.property_address,
      related_contract_id: relatedContractId,
      status: "new",
    })
    .select("id")
    .single();

  if (quoteError || !quote) {
    redirect(
      `/ops/inquiries?error=${encodeURIComponent(quoteError?.message ?? "quote")}`
    );
  }

  await supabase
    .from("inquiries")
    .update({
      status: "Converted to quote",
      quote_id: quote.id,
      converted_customer_id: customerId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/ops/inquiries");
  revalidatePath("/quotes");
  redirect(`/quotes/${quote.id}`);
}
