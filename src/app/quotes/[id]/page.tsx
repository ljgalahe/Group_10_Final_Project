import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  approveQuote,
  requestQuoteChanges,
  saveQuoteDraft,
  submitQuoteForApproval,
} from "@/app/actions/quote-approvals";
import { requireAppAccess } from "@/lib/auth-access";
import { AppShell } from "@/components/AppShell";
import { DownloadQuotePdfButton } from "@/components/DownloadQuotePdfButton";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { getViewRole, roleCanApproveQuotes, roleCanManageQuotes } from "@/lib/demo-role";
import { formatCurrency, formatDate } from "@/lib/format";
import { fetchQuoteRequestById } from "@/lib/queries";
import {
  estimateMonthlyFee,
  type QuoteLineItem,
} from "@/lib/service-pricing";

export default async function QuoteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    saved?: string;
    submitted?: string;
    error?: string;
  }>;
}) {
  await requireAppAccess();
  const role = await getViewRole();
  const canManage = roleCanManageQuotes(role);
  const canApprove = roleCanApproveQuotes(role);
  if (!canManage && !canApprove) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const flash = await searchParams;
  const { data: quote } = await fetchQuoteRequestById(id);
  if (!quote) notFound();

  const customer = Array.isArray(quote.customers)
    ? quote.customers[0]
    : quote.customers;

  const today = new Date().toISOString().slice(0, 10);
  const seasonEnd = new Date();
  seasonEnd.setMonth(seasonEnd.getMonth() + 6);
  const seasonEndStr = seasonEnd.toISOString().slice(0, 10);

  const lineItems = (quote.line_items as QuoteLineItem[]) ?? [];
  const acres =
    lineItems.reduce((max, li) => Math.max(max, Number(li.acres) || 0), 0) || 1;
  const visitsDefault = Number(quote.visits_per_week ?? 1) || 1;
  const estimated =
    quote.monthly_fee != null
      ? Number(quote.monthly_fee)
      : estimateMonthlyFee(lineItems, acres, visitsDefault);

  const editable =
    canManage &&
    (quote.status === "budgeted" ||
      quote.status === "changes_requested" ||
      quote.status === "new" ||
      quote.status === "survey_scheduled");

  const quotePdfData = {
    id: quote.id,
    customerName: customer?.name ?? "Customer",
    propertyAddress:
      quote.property_address || customer?.address || "—",
    serviceDescription: quote.service_description,
    status: String(quote.status),
    lineItems,
    visitsPerWeek: visitsDefault,
    visitFrequencyNotes: quote.visit_frequency_notes ?? null,
    seasonStart: quote.season_start ?? today,
    seasonEnd: quote.season_end ?? seasonEndStr,
    monthlyFee: estimated || null,
    notes: quote.notes ?? null,
    submittedAt: quote.submitted_for_approval_at ?? null,
    createdAt: quote.created_at,
  };

  return (
    <AppShell>
      <PageHeader
        title="Quote Builder"
        description={`${customer?.name ?? "Customer"} · Received ${formatDate(quote.created_at.slice(0, 10))}`}
        action={
          <DownloadQuotePdfButton
            data={quotePdfData}
            className="rounded-lg border border-green-800 px-4 py-2 text-sm font-medium text-green-900 hover:bg-green-50"
          />
        }
      />

      {flash.saved === "1" ? (
        <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          Quote Draft Saved.
        </p>
      ) : null}
      {flash.submitted === "1" ? (
        <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          Submitted For Management Approval.
        </p>
      ) : null}
      {flash.error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Could Not Complete That Action.
        </p>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link
          href="/quotes"
          className="text-sm font-medium text-green-800 hover:underline"
        >
          ← Back To Quotes
        </Link>
        <StatusBadge status={String(quote.status)} />
        {quote.survey_id ? (
          <Link
            href={`/ops/site-surveys/${quote.survey_id}`}
            className="text-sm font-medium text-green-800 hover:underline"
          >
            View Site Survey
          </Link>
        ) : null}
        {quote.draft_contract_id ? (
          <Link
            href={`/contracts/${quote.draft_contract_id}`}
            className="text-sm font-medium text-green-800 hover:underline"
          >
            Open Contract
          </Link>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-green-950">Request</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-stone-500">Customer</dt>
              <dd className="font-medium text-green-950">{customer?.name}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Property</dt>
              <dd className="text-stone-800">
                {quote.property_address || customer?.address || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">Services Requested</dt>
              <dd className="text-stone-800">{quote.service_description}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-green-950">Line Items</h2>
          {lineItems.length === 0 ? (
            <p className="mt-3 text-sm text-stone-500">
              No Line Items Yet. Complete A Site Survey To Populate Pricing.
            </p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-stone-500">
                <tr>
                  <th className="py-1 font-medium">Service</th>
                  <th className="py-1 font-medium">Acres</th>
                  <th className="py-1 font-medium">Unit</th>
                  <th className="py-1 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((li, idx) => (
                  <tr key={`${li.serviceKey}-${idx}`} className="border-t">
                    <td className="py-2">{li.label}</td>
                    <td className="py-2">{li.acres}</td>
                    <td className="py-2">{formatCurrency(li.unitPrice)}</td>
                    <td className="py-2">{formatCurrency(li.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-green-950">
            Quote Terms
          </h2>
          <form className="mt-4 grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="quote_id" value={quote.id} />
            <input
              type="hidden"
              name="line_items_json"
              value={JSON.stringify(lineItems)}
            />
            <label className="block text-sm">
              <span className="text-stone-600">Visits Per Week</span>
              <input
                type="number"
                step="0.5"
                min="0"
                name="visits_per_week"
                defaultValue={visitsDefault}
                disabled={!editable}
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 disabled:bg-stone-50"
              />
            </label>
            <label className="block text-sm">
              <span className="text-stone-600">Monthly Fee</span>
              <input
                type="number"
                step="0.01"
                name="monthly_fee"
                defaultValue={estimated || ""}
                disabled={!editable}
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 disabled:bg-stone-50"
              />
            </label>
            <label className="block text-sm">
              <span className="text-stone-600">Season Start</span>
              <input
                type="date"
                name="season_start"
                defaultValue={quote.season_start ?? today}
                disabled={!editable}
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 disabled:bg-stone-50"
              />
            </label>
            <label className="block text-sm">
              <span className="text-stone-600">Season End</span>
              <input
                type="date"
                name="season_end"
                defaultValue={quote.season_end ?? seasonEndStr}
                disabled={!editable}
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 disabled:bg-stone-50"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-stone-600">Visit Frequency Notes</span>
              <input
                name="visit_frequency_notes"
                defaultValue={quote.visit_frequency_notes ?? ""}
                disabled={!editable}
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 disabled:bg-stone-50"
                placeholder="e.g. Twice weekly during peak season"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-stone-600">Notes</span>
              <textarea
                name="notes"
                rows={3}
                defaultValue={quote.notes ?? ""}
                disabled={!editable}
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 disabled:bg-stone-50"
              />
            </label>

            {editable ? (
              <div className="flex flex-wrap gap-3 sm:col-span-2">
                <button
                  type="submit"
                  formAction={saveQuoteDraft}
                  className="rounded-md border border-green-800 px-4 py-2 text-sm font-medium text-green-900 hover:bg-green-50"
                >
                  Save Draft
                </button>
                <button
                  type="submit"
                  formAction={submitQuoteForApproval}
                  className="rounded-md bg-green-900 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
                >
                  Submit For Management Approval
                </button>
              </div>
            ) : quote.status === "pending_manager_approval" && !canApprove ? (
              <p className="text-sm text-amber-800 sm:col-span-2">
                Waiting For Manager Approval.
              </p>
            ) : quote.status === "approved" ? (
              <p className="text-sm text-green-800 sm:col-span-2">
                Approved. Create The Contract From Ops Contracts → Draft
                Contracts.
              </p>
            ) : null}
          </form>
          {quote.status === "pending_manager_approval" && canApprove ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <form action={approveQuote}>
                <input type="hidden" name="quote_id" value={quote.id} />
                <button
                  type="submit"
                  className="rounded-md bg-green-900 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
                >
                  Approve Quote
                </button>
              </form>
              <form
                action={requestQuoteChanges}
                className="flex flex-wrap items-end gap-2"
              >
                <input type="hidden" name="quote_id" value={quote.id} />
                <input
                  name="change_notes"
                  placeholder="Request Changes…"
                  className="rounded-md border border-stone-300 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-md border border-amber-700 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-50"
                >
                  Request Changes
                </button>
              </form>
            </div>
          ) : null}
        </Card>
      </div>
    </AppShell>
  );
}
