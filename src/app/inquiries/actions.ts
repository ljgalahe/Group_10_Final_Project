"use server";

import { createDataClient } from "@/lib/auth-access";
import { revalidatePath } from "next/cache";

const PROPERTY_TYPES = new Set([
  "office_park",
  "retail_center",
  "industrial",
  "multifamily",
  "other",
]);

const SERVICES = new Set([
  "mowing",
  "irrigation",
  "seasonal_color",
  "snow_removal",
  "other",
]);

export type SubmitInquiryResult =
  | { ok: true }
  | { ok: false; error: string };

export async function submitProspectInquiry(
  _prev: SubmitInquiryResult | null,
  formData: FormData
): Promise<SubmitInquiryResult> {
  const company_name = String(formData.get("company_name") ?? "").trim();
  const contact_name = String(formData.get("contact_name") ?? "").trim();
  const contact_email = String(formData.get("contact_email") ?? "").trim();
  const contact_phone = String(formData.get("contact_phone") ?? "").trim();
  const property_address = String(formData.get("property_address") ?? "").trim();
  const property_type = String(formData.get("property_type") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const acresRaw = String(formData.get("acres") ?? "").trim();
  const acres =
    acresRaw && Number.isFinite(Number(acresRaw)) ? Number(acresRaw) : null;
  const services_interested = formData
    .getAll("services_interested")
    .map((v) => String(v))
    .filter((v) => SERVICES.has(v));

  if (!company_name || !contact_name || !contact_email || !property_address) {
    return { ok: false, error: "Please fill in all required fields." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (!PROPERTY_TYPES.has(property_type)) {
    return { ok: false, error: "Please select a property type." };
  }
  if (services_interested.length === 0) {
    return {
      ok: false,
      error: "Please select at least one service of interest.",
    };
  }

  const supabase = await createDataClient();
  const { error } = await supabase.from("inquiries").insert({
    company_name,
    contact_name,
    contact_email,
    contact_phone: contact_phone || null,
    property_address,
    property_type,
    services_interested,
    message: message || null,
    status: "New",
    acres,
    survey_status: "needs_scheduling",
  });

  if (error) {
    return {
      ok: false,
      error: error.message || "Could not submit your inquiry. Please try again.",
    };
  }

  revalidatePath("/ops/inquiries");
  return { ok: true };
}
