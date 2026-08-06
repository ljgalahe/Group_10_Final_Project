import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { createDataClient, requireAppAccess } from "@/lib/auth-access";
import {
  getViewRole,
  roleCanManageQuotes,
  roleCanViewInquiriesInbox,
} from "@/lib/demo-role";

type SurveyListRow = {
  id: string;
  inquiry_id: string;
  property_address: string;
  acres: number | null;
  status: string;
  quote_id: string | null;
  created_at: string;
  company_name: string;
};

export default async function SiteSurveysPage() {
  await requireAppAccess();
  const role = await getViewRole();
  if (!roleCanViewInquiriesInbox(role) && !roleCanManageQuotes(role)) {
    redirect("/dashboard");
  }

  const supabase = await createDataClient();

  // Avoid fragile embeds — load surveys, then resolve company names.
  const { data: surveyRows, error } = await supabase
    .from("site_surveys")
    .select(
      "id, inquiry_id, property_address, acres, status, quote_id, created_at"
    )
    .order("created_at", { ascending: false });

  let surveys: SurveyListRow[] = [];
  if (!error && surveyRows && surveyRows.length > 0) {
    const inquiryIds = [
      ...new Set(surveyRows.map((s) => s.inquiry_id).filter(Boolean)),
    ];
    const { data: inquiries } = await supabase
      .from("inquiries")
      .select("id, company_name")
      .in("id", inquiryIds);
    const nameById = new Map(
      (inquiries ?? []).map((i) => [i.id, i.company_name as string])
    );
    surveys = surveyRows.map((row) => ({
      ...row,
      company_name: nameById.get(row.inquiry_id) ?? "Prospect",
    }));
  }

  return (
    <AppShell>
      <PageHeader title="Site Survey" />
      <p className="mb-4 -mt-4 text-sm text-stone-500">
        “Open Form” will open the survey to fill out on any device
      </p>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          Could Not Load Site Surveys. {error.message}
        </div>
      ) : surveys.length === 0 ? (
        <EmptyState
          message={
            <>
              No Site Surveys Yet.{" "}
              <Link
                href="/ops/inquiries"
                className="font-medium text-green-900 underline"
              >
                Inquiries
              </Link>{" "}
              → Needs Scheduling.
            </>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-stone-600">
              <tr>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Property</th>
                <th className="px-4 py-3 font-medium">Acres</th>
                <th className="px-4 py-3 font-medium">Survey Status</th>
                <th className="px-4 py-3 font-medium">Open Form</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {surveys.map((row) => (
                <tr key={row.id} className="hover:bg-stone-50/80">
                  <td className="px-4 py-3 font-medium text-green-950">
                    {row.company_name}
                  </td>
                  <td className="px-4 py-3 text-stone-700">
                    {row.property_address}
                  </td>
                  <td className="px-4 py-3 text-stone-700">
                    {row.acres != null ? Number(row.acres) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/ops/site-surveys/${row.id}`}
                      className="text-sm font-medium text-green-800 hover:underline"
                    >
                      Open Form
                    </Link>
                    {row.quote_id ? (
                      <>
                        {" · "}
                        <Link
                          href={`/quotes/${row.quote_id}`}
                          className="text-sm font-medium text-green-800 hover:underline"
                        >
                          Quote
                        </Link>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
