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
  const { data, error } = await supabase
    .from("inquiries")
    .select(
      "id, company_name, contact_name, contact_email, contact_phone, property_address, property_type, services_interested, message, status, quote_id, created_at"
    )
    .order("created_at", { ascending: false });

  const inquiries = (data ?? []) as InquiryRow[];
  const newCount = inquiries.filter((i) => i.status === "New").length;

  return (
    <AppShell>
      <PageHeader
        title="Inquiries"
        description="Prospect requests from the Inquiries start page. Review details, then convert to Quotes when ready. Operations budgets and drafts; Manager and Accountant approve contracts."
      />

      {params.error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Could not complete that action: {params.error}
        </div>
      ) : null}

      <div className="mb-6 flex flex-wrap gap-3 text-sm text-stone-600">
        <span className="rounded-lg border border-stone-200 bg-white px-3 py-2 shadow-sm">
          <span className="font-semibold text-green-900">{newCount}</span> new
        </span>
        <span className="rounded-lg border border-stone-200 bg-white px-3 py-2 shadow-sm">
          <span className="font-semibold text-green-900">
            {inquiries.length}
          </span>{" "}
          total
        </span>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          Could not load inquiries. {error.message}
        </div>
      ) : inquiries.length === 0 ? (
        <EmptyState message="No prospect inquiries yet. Switch to the Inquiries role and submit the start-page form to create one." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">Company / contact</th>
                <th className="px-4 py-3 font-medium">Property</th>
                <th className="px-4 py-3 font-medium">Services</th>
                <th className="px-4 py-3 font-medium">Message</th>
                <th className="px-4 py-3 font-medium">Received</th>
                <th className="px-4 py-3 font-medium">Pipeline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {inquiries.map((row) => (
                <tr key={row.id} className="align-top hover:bg-stone-50/80">
                  <td className="px-4 py-3">
                    <p className="font-medium text-green-950">
                      {row.company_name}
                    </p>
                    <p className="text-stone-700">{row.contact_name}</p>
                    <p className="text-xs text-stone-500">{row.contact_email}</p>
                    {row.contact_phone ? (
                      <p className="text-xs text-stone-500">
                        {row.contact_phone}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-stone-800">
                      {PROPERTY_LABELS[row.property_type] ?? row.property_type}
                    </p>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {row.property_address}
                    </p>
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
                      currentStatus={row.status}
                      quoteId={row.quote_id}
                    />
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
