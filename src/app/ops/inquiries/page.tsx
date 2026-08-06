import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { EmptyState, PageHeader } from "@/components/ui";
import { InquiryStatusControl } from "@/app/ops/inquiries/InquiryStatusControl";
import { createDataClient, requireAppAccess } from "@/lib/auth-access";
import { SERVICE_LABELS } from "@/lib/commercial-services";
import {
  getViewRole,
  roleCanViewInquiriesInbox,
} from "@/lib/demo-role";

const PROPERTY_LABELS: Record<string, string> = {
  office_park: "Office Park",
  retail_center: "Retail Center",
  hospitality: "Hotel / Hospitality",
  institutional: "Campus / Science & Cultural",
  industrial: "Industrial",
  multifamily: "Residential Community",
  other: "Other",
};

type InquiryRow = {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  property_address: string;
  property_type: string;
  services_interested: string[] | null;
  message: string | null;
  status: string;
  quote_id: string | null;
  converted_customer_id: string | null;
  acres: number | null;
  survey_status: string | null;
  survey_id: string | null;
  created_at: string;
};

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default async function OpsInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAppAccess();
  if (!roleCanViewInquiriesInbox(await getViewRole())) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const supabase = await createDataClient();
  let { data, error } = await supabase
    .from("inquiries")
    .select(
      "id, company_name, contact_name, contact_email, contact_phone, property_address, property_type, services_interested, message, status, quote_id, converted_customer_id, acres, survey_status, survey_id, created_at"
    )
    .order("created_at", { ascending: false });

  // Pre-migration fallback so the inbox still loads.
  if (
    error &&
    (error.message.includes("acres") ||
      error.message.includes("survey_status") ||
      error.message.includes("survey_id") ||
      error.code === "42703" ||
      error.code === "PGRST204")
  ) {
    const fallback = await supabase
      .from("inquiries")
      .select(
        "id, company_name, contact_name, contact_email, contact_phone, property_address, property_type, services_interested, message, status, quote_id, converted_customer_id, created_at"
      )
      .order("created_at", { ascending: false });
    data = (fallback.data ?? []).map((row) => ({
      ...row,
      acres: null,
      survey_status: "needs_scheduling",
      survey_id: null,
    }));
    error = fallback.error;
  }

  const inquiries = (data ?? []) as InquiryRow[];
  const needsSurvey = inquiries.filter(
    (i) =>
      !i.survey_id ||
      (i.survey_status ?? "needs_scheduling") === "needs_scheduling"
  ).length;

  return (
    <AppShell>
      <PageHeader title="Inquiries" />

      {params.error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {params.error === "survey_required"
            ? "Complete The Site Survey Before Creating A Quote."
            : `Could Not Complete That Action: ${params.error}`}
        </div>
      ) : null}

      <div className="mb-6 flex flex-wrap gap-3 text-sm text-stone-600">
        <span className="rounded-lg border border-stone-200 bg-white px-3 py-2 shadow-sm">
          <span className="font-semibold text-green-900">{needsSurvey}</span>{" "}
          Needs Survey
        </span>
        <span className="rounded-lg border border-stone-200 bg-white px-3 py-2 shadow-sm">
          <span className="font-semibold text-green-900">
            {inquiries.length}
          </span>{" "}
          Total
        </span>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          Could Not Load Inquiries. {error.message}
        </div>
      ) : inquiries.length === 0 ? (
        <EmptyState message="No Inquiries Yet." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-left text-stone-600">
              <tr>
                <th className="px-4 py-3 font-medium">Company Name</th>
                <th className="px-4 py-3 font-medium">Property</th>
                <th className="px-4 py-3 font-medium">Services</th>
                <th className="px-4 py-3 font-medium">Message</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Site Survey</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {inquiries.map((row) => {
                return (
                  <tr key={row.id} className="align-top hover:bg-stone-50/80">
                    <td className="px-4 py-3">
                      <p className="font-medium text-green-950">
                        {row.company_name}
                      </p>
                      <p className="text-stone-700">{row.contact_name}</p>
                      <p className="text-xs text-stone-500">
                        {row.contact_email}
                      </p>
                      {row.contact_phone ? (
                        <p className="text-xs text-stone-500">
                          {row.contact_phone}
                        </p>
                      ) : null}
                      {row.converted_customer_id ||
                      /Existing client new service request:/i.test(
                        row.message ?? ""
                      ) ||
                      /Related contract:/i.test(row.message ?? "") ? (
                        <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                          Existing Customer
                        </span>
                      ) : (
                        <span className="mt-1 inline-flex rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-700">
                          New Customer
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-stone-800">
                        {PROPERTY_LABELS[row.property_type] ??
                          row.property_type}
                      </p>
                      <p className="mt-0.5 text-xs text-stone-500">
                        {row.property_address}
                      </p>
                      {row.acres != null ? (
                        <p className="mt-0.5 text-xs font-medium text-stone-700">
                          {Number(row.acres)} Acres
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(row.services_interested ?? []).map((s) => (
                          <span
                            key={s}
                            className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-900"
                          >
                            {SERVICE_LABELS[s] ?? s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-xs text-stone-600">
                      {row.message?.trim() || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-stone-500">
                      {formatWhen(row.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <InquiryStatusControl
                        inquiryId={row.id}
                        quoteId={row.quote_id}
                        surveyStatus={row.survey_status}
                        surveyId={row.survey_id}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
