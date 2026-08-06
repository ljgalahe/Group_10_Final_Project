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
  office_park: "Office park",
  retail_center: "Retail center",
  hospitality: "Hotel / hospitality",
  institutional: "Campus / science & cultural",
  industrial: "Industrial",
  multifamily: "Residential community",
  other: "Other",
};

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

  const serviceDescription = [
    `New commercial prospect: ${inquiry.company_name}`,
    `Property type: ${propertyLabel}`,
    services ? `Services: ${services}` : null,
  ]
    .filter(Boolean)
    .join(". ");

  const notes = [
    `Contact: ${inquiry.contact_name} · ${inquiry.contact_email}`,
    inquiry.contact_phone ? `Phone: ${inquiry.contact_phone}` : null,
    inquiry.message ? `Message: ${inquiry.message}` : null,
    `Source: Inquiries pipeline (${inquiry.id})`,
  ]
    .filter(Boolean)
    .join("\n");

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

  const { data: quote, error: quoteError } = await supabase
    .from("quote_requests")
    .insert({
      customer_id: customer.id,
      service_description: serviceDescription,
      notes,
      property_address: inquiry.property_address,
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
      converted_customer_id: customer.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/ops/inquiries");
  revalidatePath("/quotes");
  redirect(`/quotes/${quote.id}`);
}
