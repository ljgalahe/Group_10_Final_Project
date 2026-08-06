import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteSurveyForm } from "@/components/ops/SiteSurveyForm";
import { AppShell } from "@/components/AppShell";
import { PageHeader, StatusBadge } from "@/components/ui";
import { createDataClient, requireAppAccess } from "@/lib/auth-access";
import {
  getViewRole,
  roleCanManageQuotes,
  roleCanViewInquiriesInbox,
} from "@/lib/demo-role";
import {
  getServiceCatalog,
  serviceLabel,
  type QuoteLineItem,
} from "@/lib/service-pricing";

export default async function SiteSurveyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    saved?: string;
    completed?: string;
    error?: string;
  }>;
}) {
  await requireAppAccess();
  const role = await getViewRole();
  if (!roleCanViewInquiriesInbox(role) && !roleCanManageQuotes(role)) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const flash = await searchParams;
  const supabase = await createDataClient();

  // Avoid fragile embeds (same pattern as the Site Survey list page).
  const { data: survey, error } = await supabase
    .from("site_surveys")
    .select(
      "id, inquiry_id, customer_id, property_address, acres, interested_services, proposed_services, catalog_snapshot, initial_notes, property_concerns, photo_urls, status, quote_id, scheduled_visit_id, created_at, updated_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !survey) notFound();

  let inquiry: {
    company_name: string | null;
    contact_name: string | null;
    contact_email: string | null;
    services_interested: string[] | null;
  } | null = null;

  if (survey.inquiry_id) {
    const { data } = await supabase
      .from("inquiries")
      .select(
        "company_name, contact_name, contact_email, services_interested"
      )
      .eq("id", survey.inquiry_id)
      .maybeSingle();
    inquiry = data;
  }

  const catalog = getServiceCatalog();
  const proposed = (survey.proposed_services as QuoteLineItem[]) ?? [];
  const selectedKeys = proposed.map((p) => String(p.serviceKey));

  const interestedFromSurvey = (survey.interested_services as string[]) ?? [];
  const interestedFromInquiry = inquiry?.services_interested ?? [];
  const interested =
    interestedFromSurvey.length > 0
      ? interestedFromSurvey
      : interestedFromInquiry;

  const initialProposedKeys =
    selectedKeys.length > 0
      ? selectedKeys
      : interested.filter((k) => catalog.some((c) => c.key === k));

  const photoUrls = (survey.photo_urls as string[]) ?? [];
  const companyName = inquiry?.company_name ?? "Prospect";
  const contactLine =
    [inquiry?.contact_name, inquiry?.contact_email]
      .filter(Boolean)
      .join(" · ") || "—";

  return (
    <AppShell>
      <PageHeader
        title="Site Survey Form"
        description={`${companyName} · ${survey.property_address}`}
      />

      <div className="mb-3">
        <Link
          href="/ops/site-surveys"
          className="text-sm font-medium text-green-800 hover:underline"
        >
          ← Back To Site Survey
        </Link>
      </div>

      {flash.saved === "1" ? (
        <p className="mb-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          Survey Draft Saved.
        </p>
      ) : null}
      {flash.completed === "1" ? (
        <p className="mb-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          Survey Marked Completed. You Can Create A Quote.
        </p>
      ) : null}
      {flash.error ? (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {flash.error === "complete_first"
            ? "Complete The Survey Before Creating A Quote."
            : flash.error}
        </p>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <StatusBadge status={String(survey.status)} />
        {survey.quote_id ? (
          <Link
            href={`/quotes/${survey.quote_id}`}
            className="text-sm font-medium text-green-800 hover:underline"
          >
            Open Quote
          </Link>
        ) : null}
      </div>

      <SiteSurveyForm
        surveyId={survey.id}
        status={String(survey.status)}
        quoteId={survey.quote_id ?? null}
        companyName={companyName}
        propertyAddress={survey.property_address}
        contactLine={contactLine}
        initialAcres={survey.acres != null ? Number(survey.acres) : null}
        interestedServices={interested}
        interestedLabels={interested.map((s) => serviceLabel(s))}
        initialProposedKeys={initialProposedKeys}
        initialNotes={survey.initial_notes ?? ""}
        propertyConcerns={survey.property_concerns ?? ""}
        initialPhotoUrls={photoUrls}
        catalog={catalog}
      />
    </AppShell>
  );
}
