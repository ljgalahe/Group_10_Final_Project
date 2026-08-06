"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createDataClient, requireAppAccess } from "@/lib/auth-access";
import {
  getViewRole,
  roleCanManageQuotes,
  roleCanViewInquiriesInbox,
} from "@/lib/demo-role";
import {
  buildLineItem,
  catalogSnapshotForAcres,
  estimateMonthlyFee,
  type QuoteLineItem,
} from "@/lib/service-pricing";

async function assertOps() {
  await requireAppAccess();
  const role = await getViewRole();
  if (!roleCanViewInquiriesInbox(role) && !roleCanManageQuotes(role)) {
    redirect("/dashboard");
  }
}

export async function saveSiteSurvey(formData: FormData) {
  await assertOps();
  const id = String(formData.get("survey_id") ?? "").trim();
  if (!id) redirect("/ops/site-surveys");

  const acresRaw = String(formData.get("acres") ?? "").trim();
  const acres = acresRaw ? Number(acresRaw) : null;
  const initialNotes = String(formData.get("initial_notes") ?? "").trim();
  const propertyConcerns = String(
    formData.get("property_concerns") ?? ""
  ).trim();
  const photoUrlsRaw = String(formData.get("photo_urls") ?? "").trim();
  const photo_urls = photoUrlsRaw
    ? photoUrlsRaw
        .split(/\r?\n|,/)
        .map((u) => u.trim())
        .filter(Boolean)
    : [];

  const proposedKeys = formData
    .getAll("proposed_services")
    .map((v) => String(v));
  const safeAcres = acres != null && Number.isFinite(acres) ? acres : 1;
  const proposed_services: QuoteLineItem[] = proposedKeys.map((key) =>
    buildLineItem(key, safeAcres)
  );

  const supabase = await createDataClient();
  const { error } = await supabase
    .from("site_surveys")
    .update({
      acres,
      proposed_services,
      catalog_snapshot: catalogSnapshotForAcres(safeAcres),
      initial_notes: initialNotes || null,
      property_concerns: propertyConcerns || null,
      photo_urls,
      status: "in_progress",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    redirect(
      `/ops/site-surveys/${id}?error=${encodeURIComponent(error.message)}`
    );
  }

  if (acres != null) {
    const { data: survey } = await supabase
      .from("site_surveys")
      .select("inquiry_id")
      .eq("id", id)
      .maybeSingle();
    if (survey?.inquiry_id) {
      await supabase
        .from("inquiries")
        .update({ acres, updated_at: new Date().toISOString() })
        .eq("id", survey.inquiry_id);
    }
  }

  revalidatePath("/ops/site-surveys");
  revalidatePath(`/ops/site-surveys/${id}`);
  revalidatePath("/ops/inquiries");
  redirect(`/ops/site-surveys/${id}?saved=1`);
}

export async function completeSiteSurvey(formData: FormData) {
  await assertOps();
  const id = String(formData.get("survey_id") ?? "").trim();
  if (!id) redirect("/ops/site-surveys");

  // Persist current form values first
  await saveSiteSurveyDraftOnly(formData);

  const supabase = await createDataClient();
  const { data: survey, error } = await supabase
    .from("site_surveys")
    .update({
      status: "completed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("inquiry_id")
    .single();

  if (error || !survey) {
    redirect(
      `/ops/site-surveys/${id}?error=${encodeURIComponent(error?.message ?? "complete")}`
    );
  }

  await supabase
    .from("inquiries")
    .update({
      survey_status: "completed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", survey.inquiry_id);

  revalidatePath("/ops/site-surveys");
  revalidatePath(`/ops/site-surveys/${id}`);
  revalidatePath("/ops/inquiries");
  redirect(`/ops/site-surveys/${id}?completed=1`);
}

async function saveSiteSurveyDraftOnly(formData: FormData) {
  const id = String(formData.get("survey_id") ?? "").trim();
  if (!id) return;

  const acresRaw = String(formData.get("acres") ?? "").trim();
  const acres = acresRaw ? Number(acresRaw) : null;
  const initialNotes = String(formData.get("initial_notes") ?? "").trim();
  const propertyConcerns = String(
    formData.get("property_concerns") ?? ""
  ).trim();
  const photoUrlsRaw = String(formData.get("photo_urls") ?? "").trim();
  const photo_urls = photoUrlsRaw
    ? photoUrlsRaw
        .split(/\r?\n|,/)
        .map((u) => u.trim())
        .filter(Boolean)
    : [];

  const proposedKeys = formData
    .getAll("proposed_services")
    .map((v) => String(v));
  const safeAcres = acres != null && Number.isFinite(acres) ? acres : 1;
  const proposed_services: QuoteLineItem[] = proposedKeys.map((key) =>
    buildLineItem(key, safeAcres)
  );

  const supabase = await createDataClient();
  await supabase
    .from("site_surveys")
    .update({
      acres,
      proposed_services,
      catalog_snapshot: catalogSnapshotForAcres(safeAcres),
      initial_notes: initialNotes || null,
      property_concerns: propertyConcerns || null,
      photo_urls,
      status: "in_progress",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (acres != null) {
    const { data: survey } = await supabase
      .from("site_surveys")
      .select("inquiry_id")
      .eq("id", id)
      .maybeSingle();
    if (survey?.inquiry_id) {
      await supabase
        .from("inquiries")
        .update({ acres, updated_at: new Date().toISOString() })
        .eq("id", survey.inquiry_id);
    }
  }
}

export async function createQuoteFromSurvey(formData: FormData) {
  await assertOps();
  const id = String(formData.get("survey_id") ?? "").trim();
  if (!id) redirect("/ops/site-surveys");

  const supabase = await createDataClient();
  const { data: survey } = await supabase
    .from("site_surveys")
    .select(
      "id, inquiry_id, customer_id, property_address, acres, interested_services, proposed_services, initial_notes, property_concerns, status, quote_id"
    )
    .eq("id", id)
    .maybeSingle();

  if (!survey) redirect("/ops/site-surveys");
  if (survey.status !== "completed") {
    redirect(`/ops/site-surveys/${id}?error=complete_first`);
  }
  if (survey.quote_id) {
    redirect(`/quotes/${survey.quote_id}`);
  }

  let inquiry: {
    company_name: string | null;
    contact_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    property_type: string | null;
    services_interested: string[] | null;
    message: string | null;
  } | null = null;
  if (survey.inquiry_id) {
    const { data } = await supabase
      .from("inquiries")
      .select(
        "company_name, contact_name, contact_email, contact_phone, property_type, services_interested, message"
      )
      .eq("id", survey.inquiry_id)
      .maybeSingle();
    inquiry = data;
  }

  let customerId = survey.customer_id as string | null;
  if (!customerId && inquiry) {
    const { data: customer } = await supabase
      .from("customers")
      .insert({
        name: inquiry.company_name,
        property_type: inquiry.property_type,
        address: survey.property_address,
        contact_name: inquiry.contact_name,
        contact_email: inquiry.contact_email,
      })
      .select("id")
      .single();
    customerId = customer?.id ?? null;
  }

  if (!customerId) {
    redirect(`/ops/site-surveys/${id}?error=customer`);
  }

  const acres = survey.acres != null ? Number(survey.acres) : 1;
  let lineItems = (survey.proposed_services as QuoteLineItem[]) ?? [];
  if (lineItems.length === 0) {
    const fallbackKeys =
      ((survey.interested_services as string[])?.length
        ? (survey.interested_services as string[])
        : ((inquiry?.services_interested as string[]) ?? [])) ?? [];
    lineItems = fallbackKeys.map((key) => buildLineItem(key, acres));
  }
  const visitsPerWeek = 1;
  const monthlyFee =
    lineItems.length > 0
      ? estimateMonthlyFee(lineItems, acres, visitsPerWeek)
      : null;

  const serviceLabels =
    lineItems.length > 0
      ? lineItems.map((l) => l.label).join(", ")
      : ((inquiry?.services_interested as string[]) ?? []).join(", ");

  const today = new Date();
  const seasonEnd = new Date(today);
  seasonEnd.setMonth(seasonEnd.getMonth() + 6);

  const { data: quote, error } = await supabase
    .from("quote_requests")
    .insert({
      customer_id: customerId,
      service_description: `Site survey quote: ${serviceLabels || "Commercial grounds"}`,
      notes: [
        survey.initial_notes ? `Survey notes: ${survey.initial_notes}` : null,
        survey.property_concerns
          ? `Property concerns: ${survey.property_concerns}`
          : null,
        inquiry?.message ? `Inquiry: ${inquiry.message}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      property_address: survey.property_address,
      status: "budgeted",
      survey_id: id,
      line_items: lineItems,
      visits_per_week: visitsPerWeek,
      monthly_fee: monthlyFee,
      season_start: today.toISOString().slice(0, 10),
      season_end: seasonEnd.toISOString().slice(0, 10),
    })
    .select("id")
    .single();

  if (error || !quote) {
    redirect(
      `/ops/site-surveys/${id}?error=${encodeURIComponent(error?.message ?? "quote")}`
    );
  }

  await supabase
    .from("site_surveys")
    .update({
      quote_id: quote.id,
      customer_id: customerId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  await supabase
    .from("inquiries")
    .update({
      status: "Converted to quote",
      quote_id: quote.id,
      converted_customer_id: customerId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", survey.inquiry_id);

  revalidatePath("/ops/site-surveys");
  revalidatePath("/ops/inquiries");
  revalidatePath("/quotes");
  redirect(`/quotes/${quote.id}`);
}
