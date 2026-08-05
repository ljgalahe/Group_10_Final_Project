import Link from "next/link";
import { requestContractRenewal } from "@/app/actions/support";
import { requireAppAccess } from "@/lib/auth-access";
import { AppShell } from "@/components/AppShell";
import { Card, PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { getViewCustomerId, getViewRole } from "@/lib/demo-role";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  fetchCustomerAccountHealth,
  fetchCustomerNeedsAttention,
  fetchCustomerUpcomingVisits,
  fetchDashboardStats,
} from "@/lib/queries";
import type { CustomerAttentionItem } from "@/lib/queries";

function attentionActionLabel(kind: string) {
  switch (kind) {
    case "overdue_invoice":
    case "open_invoice":
      return "Pay";
    case "support":
      return "Read";
    case "renewal":
      return "Request renewal";
    default:
      return "View";
  }
}

function attentionDetail(item: CustomerAttentionItem) {
  if (
    (item.kind === "overdue_invoice" || item.kind === "open_invoice") &&
    item.amount != null &&
    item.dueDate
  ) {
    return item.kind === "overdue_invoice"
      ? `${formatCurrency(item.amount)} · was due ${formatDate(item.dueDate)}`
      : `${formatCurrency(item.amount)} · due ${formatDate(item.dueDate)}`;
  }
  if (item.kind === "renewal" && item.detail.includes(" · ends ")) {
    const [daysPart, endIso] = item.detail.split(" · ends ");
    if (endIso && /^\d{4}-\d{2}-\d{2}$/.test(endIso.trim())) {
      return `${daysPart} · ends ${formatDate(endIso.trim())}`;
    }
  }
  return item.detail;
}

function NeedsAttentionList({ items }: { items: CustomerAttentionItem[] }) {
  if (items.length === 0) {
    return (
      <p className="mt-4 text-sm text-stone-500">
        You&apos;re all caught up—nothing needs attention right now.
      </p>
    );
  }

  return (
    <ul className="mt-4 divide-y divide-stone-100 border-t border-stone-100">
      {items.map((item) => {
        const detail = attentionDetail(item);
        const isUrgent = item.kind === "overdue_invoice";
        const rowClass =
          "group flex w-full items-center gap-3 py-3 text-left transition hover:bg-stone-50";

        if (item.kind === "renewal" && item.contractId) {
          return (
            <li key={item.id}>
              <form action={requestContractRenewal}>
                <input
                  type="hidden"
                  name="contract_id"
                  value={item.contractId}
                />
                <button type="submit" className={rowClass}>
                  <span
                    className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-stone-300"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-green-950">
                      {item.title}
                    </p>
                    {detail ? (
                      <p className="mt-0.5 text-sm text-stone-500">{detail}</p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-sm font-medium text-green-800 group-hover:underline">
                    Request renewal
                  </span>
                </button>
              </form>
            </li>
          );
        }

        return (
          <li key={item.id}>
            <Link href={item.href} className={rowClass}>
              <span
                className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                  isUrgent ? "bg-red-500" : "bg-stone-300"
                }`}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium ${
                    isUrgent ? "text-red-900" : "text-green-950"
                  }`}
                >
                  {item.title}
                </p>
                {detail ? (
                  <p className="mt-0.5 text-sm text-stone-500">{detail}</p>
                ) : null}
              </div>
              <span className="shrink-0 text-sm font-medium text-green-800 group-hover:underline">
                {attentionActionLabel(item.kind)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    renewal?: string;
    quote?: string;
    error?: string;
  }>;
}) {
  await requireAppAccess();

  const role = await getViewRole();
  const stats = await fetchDashboardStats();
  const params = await searchParams;

  const roleTitles: Record<string, { title: string; description: string }> = {
    manager: {
      title: "Manager Dashboard",
      description:
        "Overview of active contracts, scheduled visits, and collections performance.",
    },
    accountant: {
      title: "Accounting Dashboard",
      description:
        "Track billing, outstanding balances, and contract profitability.",
    },
    crew_lead: {
      title: "Crew Lead Dashboard",
      description: "See upcoming visits and mark work as completed.",
    },
    customer: {
      title: "Customer Portal",
      description:
        "View your maintenance contract, upcoming visits, and open invoices.",
    },
  };

  const copy = roleTitles[role];

  const customerId =
    role === "customer" ? await getViewCustomerId() : null;

  const [accountHealth, needsAttention, upcomingVisits] =
    customerId != null
      ? await Promise.all([
          fetchCustomerAccountHealth(customerId),
          fetchCustomerNeedsAttention(customerId).then((r) => r.data),
          fetchCustomerUpcomingVisits(customerId, 3).then((r) => r.data),
        ])
      : [null, [], []];

  const statsRow = (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Active Contracts" value={stats.activeContracts} />
      <StatCard label="Scheduled Visits" value={stats.scheduledVisits} />
      <StatCard
        label="Outstanding Balance"
        value={formatCurrency(stats.outstanding)}
        hint={`${stats.overdueCount} invoice(s) need attention`}
      />
      <StatCard
        label="Collected YTD"
        value={formatCurrency(stats.totalCollected)}
        hint={`Billed ${formatCurrency(stats.totalBilled)} total`}
      />
    </div>
  );

  return (
    <AppShell>
      <PageHeader title={copy.title} description={copy.description} />

      {role === "customer" && accountHealth ? (
        <p className="mb-6 text-sm text-stone-500">
          {accountHealth.sinceYear
            ? `Customer since ${accountHealth.sinceYear}`
            : "Trusted GreenScape customer"}
          <span className="text-stone-300"> · </span>
          {accountHealth.activeContracts} active{" "}
          {accountHealth.activeContracts === 1 ? "contract" : "contracts"}
          <span className="text-stone-300"> · </span>
          {accountHealth.openDisputes === 0
            ? "0 open disputes"
            : `${accountHealth.openDisputes} open dispute${accountHealth.openDisputes === 1 ? "" : "s"}`}
        </p>
      ) : null}

      {params.renewal === "1" ? (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          Renewal request sent. A GreenScape manager will follow up with your
          options.
        </div>
      ) : null}

      {params.renewal === "already" ? (
        <div className="mb-6 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
          A renewal request for this contract is already open with your account
          manager.
        </div>
      ) : null}

      {params.quote === "1" ? (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          Quote request sent. Your account manager will follow up with pricing
          for the additional service.
        </div>
      ) : null}

      {role === "customer" ? (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold text-green-950">
                  Needs attention
                </h2>
                {needsAttention.length > 0 ? (
                  <span className="text-sm text-stone-400">
                    {needsAttention.length}{" "}
                    {needsAttention.length === 1 ? "item" : "items"}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-stone-500">
                Bills, support replies, and renewals to review.
              </p>
              <NeedsAttentionList items={needsAttention} />
            </Card>

            <Card className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold text-green-950">
                  Upcoming visits
                </h2>
                <Link
                  href="/visits"
                  className="text-sm font-medium text-green-800 hover:underline"
                >
                  All visits
                </Link>
              </div>
              <p className="mt-1 text-sm text-stone-500">
                Your next scheduled maintenance visits.
              </p>
              {upcomingVisits.length === 0 ? (
                <p className="mt-4 text-sm text-stone-500">
                  No upcoming visits on the calendar right now.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-stone-100 border-t border-stone-100">
                  {upcomingVisits.map((visit) => (
                    <li
                      key={visit.id}
                      className="flex flex-wrap items-start justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-green-950">
                          {formatDate(visit.scheduled_date)}
                        </p>
                        <p className="text-sm text-stone-600">
                          {visit.contract_title}
                        </p>
                        <p className="text-xs text-stone-500">
                          {visit.property_name}
                          {visit.address ? ` · ${visit.address}` : ""}
                        </p>
                      </div>
                      <StatusBadge status={visit.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="mt-8">{statsRow}</div>

          <div className="mt-8 rounded-xl border border-green-800/15 bg-green-50/60 px-5 py-4">
            <p className="text-sm font-semibold text-green-950">
              Quick actions
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/contracts"
                className="rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700"
              >
                Contracts
              </Link>
              <Link
                href="/invoices"
                className="rounded-lg border border-green-800/40 bg-white px-4 py-2 text-sm font-medium text-green-900 shadow-sm hover:border-green-800 hover:bg-green-50"
              >
                Invoices
              </Link>
              <Link
                href="/visits"
                className="rounded-lg border border-green-800/40 bg-white px-4 py-2 text-sm font-medium text-green-900 shadow-sm hover:border-green-800 hover:bg-green-50"
              >
                Visits
              </Link>
              <Link
                href="/request-quote"
                className="rounded-lg border border-green-800/40 bg-white px-4 py-2 text-sm font-medium text-green-900 shadow-sm hover:border-green-800 hover:bg-green-50"
              >
                Request a quote
              </Link>
              <Link
                href="/contact"
                className="rounded-lg border border-green-800/40 bg-white px-4 py-2 text-sm font-medium text-green-900 shadow-sm hover:border-green-800 hover:bg-green-50"
              >
                Contact us
              </Link>
            </div>
          </div>
        </>
      ) : (
        <>
          {statsRow}
          <div className="mt-8">
            <Card>
              <h2 className="text-lg font-semibold text-green-950">
                Quick Actions
              </h2>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/contracts"
                  className="rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  View Contracts
                </Link>
                {(role === "manager" || role === "accountant") && (
                  <>
                    <Link
                      href="/reports/ar-aging"
                      className="rounded-lg border border-green-800 px-4 py-2 text-sm font-medium text-green-900 hover:bg-green-50"
                    >
                      AR Aging Report
                    </Link>
                    <Link
                      href="/reports/profitability"
                      className="rounded-lg border border-green-800 px-4 py-2 text-sm font-medium text-green-900 hover:bg-green-50"
                    >
                      Profitability Report
                    </Link>
                    {role === "manager" ? (
                      <Link
                        href="/support"
                        className="rounded-lg border border-green-800 px-4 py-2 text-sm font-medium text-green-900 hover:bg-green-50"
                      >
                        Customer Support
                      </Link>
                    ) : null}
                  </>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </AppShell>
  );
}
