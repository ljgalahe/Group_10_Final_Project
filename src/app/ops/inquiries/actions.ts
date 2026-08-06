"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createDataClient, requireAppAccess } from "@/lib/auth-access";
import { SERVICE_LABELS } from "@/lib/commercial-services";
import {
  getViewRole,
  roleCanViewInquiriesInbox,
} from "@/lib/demo-role";
import { catalogSnapshotForAcres } from "@/lib/service-pricing";

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

/** Parse existing-client inquiry messages (from customer "Request a quote"). */
const RELATED_CONTRACT_RE =
  /Related contract:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
const EXISTING_SERVICE_RE =
  /^Existing client new service request:\s*(.+)$/im;

export function isExistingCustomerInquiry(inquiry: {
  converted_customer_id?: string | null;
  message?: string | null;
}) {
  if (inquiry.converted_customer_id) return true;
  const message = inquiry.message ?? "";
  return EXISTING_SERVICE_RE.test(message) || RELATED_CONTRACT_RE.test(message);
}

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

/**
 * Creates a site_surveys row + optional survey visit, marks inquiry scheduled.
 */
export async function scheduleInquirySiteSurvey(formData: FormData) {
  await requireAppAccess();
  if (!roleCanViewInquiriesInbox(await getViewRole())) {
    redirect("/dashboard");
  }

  const id = String(formData.get("id") ?? "").trim();
  const scheduledDate =
    String(formData.get("scheduled_date") ?? "").trim() ||
    new Date().toISOString().slice(0, 10);

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

  if (inquiry.survey_id && inquiry.survey_status === "scheduled") {
    redirect(`/ops/site-surveys/${inquiry.survey_id}`);
  }
  if (inquiry.survey_id && inquiry.survey_status === "completed") {
    redirect(`/ops/site-surveys/${inquiry.survey_id}`);
  }

  const acres = inquiry.acres != null ? Number(inquiry.acres) : null;
  const interested = (inquiry.services_interested as string[]) ?? [];

  let customerId = (inquiry.converted_customer_id as string | null) ?? null;
  // Prefer demo customer for Lakeside click-path under Customer role.
  if (
    !customerId &&
    String(inquiry.company_name).includes("Lakeside")
  ) {
    customerId = "11111111-1111-1111-1111-111111111101";
  }
  if (!customerId) {
    const propertyLabel =
      PROPERTY_LABELS[inquiry.property_type] ?? inquiry.property_type;
    const { data: customer } = await supabase
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
    customerId = customer?.id ?? null;
  }

  // Staging contract so survey visits satisfy service_visits.contract_id FK.
  let contractId: string | null = null;
  if (customerId) {
    const { data: existing } = await supabase
      .from("contracts")
      .select("id")
      .eq("customer_id", customerId)
      .limit(1)
      .maybeSingle();
    contractId = existing?.id ?? null;

    if (!contractId) {
      const { data: staging } = await supabase
        .from("contracts")
        .insert({
          customer_id: customerId,
          title: `Survey Staging — ${inquiry.company_name}`,
          status: "draft",
          approval_state: "draft",
          season_start: scheduledDate,
          season_end: scheduledDate,
          monthly_fee: null,
          visits_per_week: 0,
          billing_method: "per_visit",
          notes: "Temporary contract row for pre-service site survey.",
          drafted_by_role: "operations",
        })
        .select("id")
        .single();
      contractId = staging?.id ?? null;
    }
  }

  let visitId: string | null = null;
  if (contractId) {
    const { data: visit } = await supabase
      .from("service_visits")
      .insert({
        contract_id: contractId,
        scheduled_date: scheduledDate,
        status: "scheduled",
        visit_kind: "survey",
        crew_lead_name: "Operations",
        crew_notes: `Pre-service site survey for ${inquiry.company_name}`,
      })
      .select("id")
      .single();
    visitId = visit?.id ?? null;
  }

  const { data: survey, error: surveyError } = await supabase
    .from("site_surveys")
    .insert({
      inquiry_id: id,
      customer_id: customerId,
      property_address: inquiry.property_address,
      acres,
      interested_services: interested,
      proposed_services: [],
      catalog_snapshot: catalogSnapshotForAcres(acres ?? 1),
      status: "draft",
      scheduled_visit_id: visitId,
    })
    .select("id")
    .single();

  if (surveyError || !survey) {
    redirect(
      `/ops/inquiries?error=${encodeURIComponent(surveyError?.message ?? "survey")}`
    );
  }

  await supabase
    .from("inquiries")
    .update({
      survey_id: survey.id,
      survey_status: "scheduled",
      converted_customer_id: customerId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/ops/inquiries");
  revalidatePath("/ops/site-surveys");
  revalidatePath("/visits");
  revalidatePath("/schedule");
  redirect(`/ops/site-surveys/${survey.id}`);
}

/**
 * Quotes are drafted from a completed Site Survey only.
 * Kept as a redirect shim so old forms cannot skip the survey step.
 */
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
    .select("id, survey_id, survey_status, quote_id, status")
    .eq("id", id)
    .maybeSingle();

  if (loadError || !inquiry) {
    redirect("/ops/inquiries?error=notfound");
  }

  if (inquiry.survey_status === "completed" && inquiry.quote_id) {
    redirect(`/quotes/${inquiry.quote_id}`);
  }
  if (inquiry.survey_id) {
    redirect(`/ops/site-surveys/${inquiry.survey_id}`);
  }
  redirect("/ops/inquiries?error=survey_required");
}
