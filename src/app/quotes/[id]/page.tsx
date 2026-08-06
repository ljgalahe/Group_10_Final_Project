import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  draftContractFromQuote,
  saveQuoteBudget,
  scheduleSurveyVisit,
} from "@/app/actions/quotes";
import { requireAppAccess } from "@/lib/auth-access";
import { AppShell } from "@/components/AppShell";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { getViewRole, roleCanManageQuotes } from "@/lib/demo-role";
import { formatDate } from "@/lib/format";
import { fetchQuoteRequestById } from "@/lib/queries";
import { DEMO_CREW_LEADS } from "@/lib/types";

export default async function QuoteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    budget?: string;
    survey?: string;
    error?: string;
  }>;
}) {
  await requireAppAccess();
  const role = await getViewRole();
  if (!roleCanManageQuotes(role)) {
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

  return (
    <AppShell>
      <PageHeader
        title="Quote request"
        description={`${customer?.name ?? "Customer"} · received ${formatDate(quote.created_at.slice(0, 10))}`}
      />

      {flash.budget === "1" ? (
        <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          Budget saved.
        </p>
      ) : null}
      {flash.survey === "1" ? (
        <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          Site survey visit scheduled. Assign routes on Scheduling if needed.
        </p>
      ) : null}
      {flash.error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Could not complete that action. Check that the Operations migration is applied.
        </p>
      ) : null}

      <div className="mb-4">
        <Link href="/quotes" className="text-sm font-medium text-green-800 hover:underline">
          ← Back to Quotes
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-green-950">Request</h2>
            <StatusBadge status={String(quote.status)} />
          </div>
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
              <dt className="text-stone-500">Services requested</dt>
              <dd className="text-stone-800">{quote.service_description}</dd>
            </div>
            {quote.notes ? (
              <div>
                <dt className="text-stone-500">Notes</dt>
                <dd className="text-stone-800">{quote.notes}</dd>
              </div>
            ) : null}
          </dl>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-green-950">
            Schedule site survey
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Send a hired lead to the site to plan services, hours, and supplies.
          </p>
          <form action={scheduleSurveyVisit} className="mt-4 space-y-3">
            <input type="hidden" name="quote_id" value={quote.id} />
            <label className="block text-sm">
              <span className="text-stone-600">Survey date</span>
              <input
                type="date"
                name="scheduled_date"
                required
                defaultValue={today}
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-stone-600">Crew Lead</span>
              <select
                name="crew_lead_name"
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
                defaultValue={DEMO_CREW_LEADS[0]}
              >
                {DEMO_CREW_LEADS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded-md bg-green-900 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
            >
              Schedule survey visit
            </button>
          </form>
          {quote.survey_visit_id ? (
            <p className="mt-3 text-xs text-stone-500">
              Survey visit id: {quote.survey_visit_id}
            </p>
          ) : null}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-green-950">
            Budget hours &amp; supplies
          </h2>
          <form action={saveQuoteBudget} className="mt-4 space-y-3">
            <input type="hidden" name="quote_id" value={quote.id} />
            <label className="block text-sm">
              <span className="text-stone-600">Planned hours</span>
              <input
                type="number"
                step="0.5"
                min="0"
                name="budget_hours"
                defaultValue={quote.budget_hours ?? ""}
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-stone-600">Supplies / materials</span>
              <textarea
                name="budget_supplies"
                rows={3}
                defaultValue={quote.budget_supplies ?? ""}
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
                placeholder="Mulch, irrigation parts, etc."
              />
            </label>
            <button
              type="submit"
              className="rounded-md bg-green-900 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
            >
              Save budget
            </button>
          </form>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-green-950">
            Draft contract
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Creates a draft for Manager and Accountant approval before the customer sees it.
          </p>
          {quote.draft_contract_id ? (
            <p className="mt-4 text-sm">
              Draft already created.{" "}
              <Link
                href={`/contracts/${quote.draft_contract_id}`}
                className="font-medium text-green-800 hover:underline"
              >
                Open contract
              </Link>
            </p>
          ) : (
            <form action={draftContractFromQuote} className="mt-4 space-y-3">
              <input type="hidden" name="quote_id" value={quote.id} />
              <label className="block text-sm">
                <span className="text-stone-600">Title</span>
                <input
                  name="title"
                  required
                  defaultValue={`${customer?.name ?? "Customer"} — ${quote.service_description.slice(0, 48)}`}
                  className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="text-stone-600">Monthly fee</span>
                <input
                  type="number"
                  step="0.01"
                  name="monthly_fee"
                  defaultValue={
                    quote.budget_hours != null
                      ? String(Math.round(Number(quote.budget_hours) * 85))
                      : ""
                  }
                  className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="text-stone-600">Season start</span>
                  <input
                    type="date"
                    name="season_start"
                    required
                    defaultValue={today}
                    className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-stone-600">Season end</span>
                  <input
                    type="date"
                    name="season_end"
                    required
                    defaultValue={seasonEndStr}
                    className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
                  />
                </label>
              </div>
              <label className="block text-sm">
                <span className="text-stone-600">Visits per week</span>
                <input
                  type="number"
                  min="0"
                  name="visits_per_week"
                  defaultValue={1}
                  className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="text-stone-600">Assigned crew lead</span>
                <select
                  name="assigned_crew"
                  className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
                  defaultValue={DEMO_CREW_LEADS[0]}
                >
                  {DEMO_CREW_LEADS.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-stone-600">Notes (optional)</span>
                <textarea
                  name="notes"
                  rows={2}
                  className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
                />
              </label>
              <button
                type="submit"
                className="rounded-md bg-green-900 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
              >
                Create draft for approval
              </button>
            </form>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
