"use server";

import { createClient } from "@supabase/supabase-js";
import { createDataClient } from "@/lib/auth-access";
import {
  ALLOWED_SERVICE_VALUES,
  SERVICE_LABELS,
  toLegacyServiceValues,
} from "@/lib/commercial-services";
import { revalidatePath } from "next/cache";

const PROPERTY_TYPES = new Set([
  "office_park",
  "retail_center",
  "hospitality",
  "institutional",
  "industrial",
  "multifamily",
  "other",
]);

const SERVICES = ALLOWED_SERVICE_VALUES;

export type InquiryFormValues = {
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  property_street: string;
  property_city: string;
  property_state: string;
  property_zip: string;
  property_type: string;
  message: string;
  other_service: string;
  acres: string;
  services_interested: string[];
};

export type SubmitInquiryResult =
  | { ok: true }
  | { ok: false; error: string; values: InquiryFormValues };

/** Public welcome/quote form may run without a demo cookie — prefer service role. */
async function createInquiryWriteClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (
    serviceKey &&
    serviceKey !== "your_service_role_key_here" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL
  ) {
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceKey);
  }
  return createDataClient();
}

function readFormValues(formData: FormData): InquiryFormValues {
  return {
    company_name: String(formData.get("company_name") ?? "").trim(),
    contact_name: String(formData.get("contact_name") ?? "").trim(),
    contact_email: String(formData.get("contact_email") ?? "").trim(),
    contact_phone: String(formData.get("contact_phone") ?? "").trim(),
    property_street: String(formData.get("property_street") ?? "").trim(),
    property_city: String(formData.get("property_city") ?? "").trim(),
    property_state: String(formData.get("property_state") ?? "")
      .trim()
      .toUpperCase(),
    property_zip: String(formData.get("property_zip") ?? "").trim(),
    property_type: String(formData.get("property_type") ?? "").trim(),
    message: String(formData.get("message") ?? "").trim(),
    other_service: String(formData.get("other_service") ?? "").trim(),
    acres: String(formData.get("acres") ?? "").trim(),
    services_interested: formData
      .getAll("services_interested")
      .map((v) => String(v))
      .filter((v) => SERVICES.has(v)),
  };
}

function fail(
  error: string,
  values: InquiryFormValues
): SubmitInquiryResult {
  return { ok: false, error, values };
}

export async function submitProspectInquiry(
  _prev: SubmitInquiryResult | null,
  formData: FormData
): Promise<SubmitInquiryResult> {
  const values = readFormValues(formData);
  const {
    company_name,
    contact_name,
    contact_email,
    contact_phone,
    property_street,
    property_city,
    property_state,
    property_zip,
    property_type,
    message,
    other_service,
    acres: acresRaw,
    services_interested,
  } = values;
  const acres =
    acresRaw && Number.isFinite(Number(acresRaw)) ? Number(acresRaw) : null;

  if (
    !company_name ||
    !contact_name ||
    !contact_email ||
    !property_street ||
    !property_city ||
    !property_state ||
    !property_zip
  ) {
    return fail("Please fill in all required fields.", values);
  }
  if (!/^[A-Z]{2}$/.test(property_state)) {
    return fail("Please enter a 2-letter state code (e.g. MS).", values);
  }
  if (!/^\d{5}(-\d{4})?$/.test(property_zip)) {
    return fail("Please enter a valid ZIP code.", values);
  }
  const property_address = `${property_street}, ${property_city}, ${property_state} ${property_zip}`;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email)) {
    return fail("Please enter a valid email address.", values);
  }
  if (!PROPERTY_TYPES.has(property_type)) {
    return fail("Please select a property type.", values);
  }
  if (services_interested.length === 0) {
    return fail("Please select at least one service of interest.", values);
  }
  if (services_interested.includes("other") && !other_service) {
    return fail("Please describe the other service you need.", values);
  }

  const serviceSummary = services_interested
    .map((value) => {
      if (value === "other" && other_service) {
        return `Other: ${other_service}`;
      }
      return SERVICE_LABELS[value] ?? value;
    })
    .join(", ");
  const combinedMessage = [
    `Services requested: ${serviceSummary}`,
    message || null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const supabase = await createInquiryWriteClient();
  const { error } = await supabase.from("inquiries").insert({
    company_name,
    contact_name,
    contact_email,
    contact_phone: contact_phone || null,
    property_address,
    property_type,
    services_interested: toLegacyServiceValues(services_interested),
    message: combinedMessage,
    status: "New",
    acres,
    survey_status: "needs_scheduling",
  });

  if (error) {
    return fail(
      error.message || "Could not submit your inquiry. Please try again.",
      values
    );
  }

  revalidatePath("/ops/inquiries");
  return { ok: true };
}
