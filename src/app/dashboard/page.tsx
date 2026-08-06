import Link from "next/link";
import { redirect } from "next/navigation";
import { requestContractRenewal } from "@/app/actions/support";
import { requireAppAccess, createDataClient } from "@/lib/auth-access";
import { AppShell } from "@/components/AppShell";
import { CrewLeadCustomerRequests } from "@/components/crew-lead/CrewLeadCustomerRequests";
import { CrewLeadQuickActions } from "@/components/crew-lead/CrewLeadQuickActions";
import { CrewLeadTomorrowPreview } from "@/components/crew-lead/CrewLeadTomorrowPreview";
import {
  buildCrewSchedule,
  todayDateOnly,
} from "@/components/crew-lead/buildCrewSchedule";
import { CrewMemberAvailabilityPanel } from "@/components/crew-member/CrewMemberAvailabilityPanel";
import { CrewMemberHoursWorked } from "@/components/crew-member/CrewMemberHoursWorked";
import { CrewMemberTodayJobs } from "@/components/crew-member/CrewMemberTodayJobs";
import { ManagerApprovalsPanel } from "@/components/manager/ManagerApprovalsPanel";
import { Card, PageHeader, StatCard } from "@/components/ui";
import { filterJobsForCrewMember } from "@/lib/crew-member";
import type { VisitLaborEntry } from "@/lib/crew-hours";
import { getViewCustomerId, getViewRole } from "@/lib/demo-role";
import { formatCurrency, formatDate } from "@/lib/format";
import type {
  CustomerAttentionItem,
  SupportRequestQueueItem,
} from "@/lib/queries";
import {
  fetchCrewApplicableSupportRequests,
  fetchCustomerAccountHealth,
  fetchCustomerNeedsAttention,
  fetchCustomerUpcomingVisits,
  fetchDashboardStats,
  fetchPendingContractApprovals,
  fetchQuoteRequests,
  fetchVisitLaborEntries,
} from "@/lib/queries";
import type { ExtraWorkItem } from "@/components/crew-lead/schedule-types";

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

async function OpsDashboardCounts() {
  const [{ data: quotes }, { data: pending }] = await Promise.all([
    fetchQuoteRequests(),
    fetchPendingContractApprovals(),
  ]);
  const openQuotes = quotes.filter((q) => q.status === "new" || q.status === "survey_scheduled" || q.status === "budgeted").length;
  return (
    <p className="mt-4 text-sm text-stone-600">
      {openQuotes} open quote{openQuotes === 1 ? "" : "s"} · {pending.length}{" "}
      contract draft{pending.length === 1 ? "" : "s"} awaiting dual approval
    </p>
  );
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
  if (role === "inquiries") {
    redirect("/inquiries");
  }
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
    operations: {
      title: "Operations Dashboard",
      description:
        "Quotes, scheduling, crew availability, and contract drafts awaiting approval.",
    },
    crew_lead: {
      title: "Crew Lead Dashboard",
      description: "See upcoming visits and mark work as completed.",
    },
    crew_member: {
      title: "Crew Member Dashboard",
      description:
        "Today's assigned jobs, hours worked, and your availability / time-off requests.",
    },
    customer: {
      title: "Customer Portal",
      description:
        "View your maintenance contract, upcoming visits, and open invoices.",
    },
  };

  const copy = roleTitles[role] ?? {
    title: "Dashboard",
    description: "GreenScape Commercial portal.",
  };
  const today = todayDateOnly();
  let scheduleJobs: ReturnType<typeof buildCrewSchedule> = [];
  let memberJobs: ReturnType<typeof buildCrewSchedule> = [];
  let memberExtraWork: ExtraWorkItem[] = [];
  let memberLaborEntries: VisitLaborEntry[] = [];
  let memberLaborByVisit: Record<
    string,
    { quantity: number | null; description: string | null }
  > = {};
  const visitLabels: Record<string, string> = {};
  let crewSupportRequests: SupportRequestQueueItem[] = [];

  if (role === "crew_lead" || role === "manager" || role === "crew_member") {
    const supabase = await createDataClient();
    const [{ data: contracts }, { data: visits }, { data: extraWorkRows }] =
      await Promise.all([
        supabase
          .from("contracts")
          .select(
            "id, title, status, visits_per_week, season_start, season_end, customer_id, customers(id, name, address, customer_notes), contract_services(service_name, included)"
          )
          .eq("status", "active"),
        supabase
          .from("service_visits")
          .select(
            "id, scheduled_date, status, contract_id, contracts(id, title, customer_id, customers(id, name, address, customer_notes), contract_services(service_name, included))"
          )
          .order("scheduled_date", { ascending: true }),
        role === "crew_member"
          ? supabase
              .from("extra_work_orders")
              .select(
                "id, contract_id, title, description, quoted_amount, status"
              )
          : Promise.resolve({ data: null }),
      ]);
    scheduleJobs = buildCrewSchedule(contracts ?? [], visits ?? []);
    if (role === "crew_member") {
      memberJobs = filterJobsForCrewMember(scheduleJobs);
      memberExtraWork = (extraWorkRows ?? []).map((row) => ({
        id: row.id,
        contractId: row.contract_id,
        title: row.title,
        description: row.description,
        quotedAmount: Number(row.quoted_amount),
        status: row.status,
      }));
      const memberVisitIds = memberJobs.map((job) => job.id);
      const [{ data: laborRows }, { data: laborCosts }] = await Promise.all([
        fetchVisitLaborEntries(memberVisitIds),
        memberVisitIds.length
          ? supabase
              .from("visit_costs")
              .select("visit_id, quantity, description")
              .in("visit_id", memberVisitIds)
              .eq("cost_type", "labor")
          : Promise.resolve({ data: [] as never[] }),
      ]);
      memberLaborEntries = (laborRows ?? []).map((row) => ({
        id: row.id,
        visit_id: row.visit_id,
        member_demo_id: row.member_demo_id,
        member_name: row.member_name,
        member_role: row.member_role,
        hours: Number(row.hours),
        hourly_rate: Number(row.hourly_rate),
        started_at: row.started_at,
        ended_at: row.ended_at,
      }));
      for (const cost of laborCosts ?? []) {
        memberLaborByVisit[cost.visit_id] = {
          quantity:
            cost.quantity == null ? null : Number(cost.quantity),
          description: cost.description ?? null,
        };
      }
    }
    for (const job of scheduleJobs) {
      visitLabels[job.id] = `${job.customerName} · ${job.contractTitle}`;
    }
    for (const visit of visits ?? []) {
      const contractRaw = visit.contracts as
        | {
            title: string;
            customers: { name: string } | { name: string }[] | null;
          }
        | {
            title: string;
            customers: { name: string } | { name: string }[] | null;
          }[]
        | null;
      const contract = Array.isArray(contractRaw)
        ? contractRaw[0]
        : contractRaw;
      const customerRaw = contract?.customers;
      const customer = Array.isArray(customerRaw)
        ? customerRaw[0]
        : customerRaw;
      if (customer?.name) {
        visitLabels[visit.id] =
          `${customer.name} · ${contract?.title ?? "Visit"}`;
      }
    }
  }

  if (role === "crew_lead") {
    const { data } = await fetchCrewApplicableSupportRequests();
    crewSupportRequests = data;
  }

  const customerId =
    role === "customer" ? await getViewCustomerId() : null;

  const [accountHealth, needsAttention, upcomingVisits] =
    customerId != null
      ? await Promise.all([
          fetchCustomerAccountHealth(customerId),
          fetchCustomerNeedsAttention(customerId).then((r) => r.data),
          fetchCustomerUpcomingVisits(customerId, 1).then((r) => r.data),
        ])
      : [null, [], []];

  const nextVisit = upcomingVisits[0] ?? null;

  const staffStatsRow = (
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

  const customerStatsColumn =
    accountHealth != null ? (
      <div className="flex flex-col gap-3">
        <StatCard
          compact
          label="Open Balance"
          value={formatCurrency(accountHealth.openBalance)}
          hint={
            accountHealth.overdueCount > 0
              ? `${accountHealth.overdueCount} past due`
              : accountHealth.openBalance > 0
                ? "Nothing past due"
                : "You're paid up"
          }
        />
        <StatCard
          compact
          label="Next Visit"
          value={
            nextVisit ? formatDate(nextVisit.scheduled_date) : "None set"
          }
          hint={
            nextVisit
              ? nextVisit.contract_title.replace(/^20\d{2}\s+/, "")
              : "See Visits for the full schedule"
          }
        />
        <StatCard
          compact
          label="Active Contracts"
          value={accountHealth.activeContracts}
          hint={
            accountHealth.activeContracts === 1
              ? "Service agreement in season"
              : "Service agreements in season"
          }
        />
        <StatCard
          compact
          label="Open Requests"
          value={accountHealth.openRequests}
          hint={
            accountHealth.openRequests === 0
              ? "No pending Contact Us items"
              : "In progress with GreenScape"
          }
        />
      </div>
    ) : null;

  const propertyTitle =
    accountHealth?.customerName ?? "Customer Portal";
  const propertyDescription = accountHealth
    ? [
        accountHealth.address,
        accountHealth.sinceYear
          ? `Customer since ${accountHealth.sinceYear}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ") ||
      "Your GreenScape property portal—contracts, visits, and billing in one place."
    : copy.description;

  return (
    <AppShell>
      <PageHeader
        title={role === "customer" ? propertyTitle : copy.title}
        description={
          role === "customer" ? propertyDescription : copy.description
        }
      />

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
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
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

            {customerStatsColumn}
          </div>

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
                href="/profile"
                className="rounded-lg border border-green-800/40 bg-white px-4 py-2 text-sm font-medium text-green-900 shadow-sm hover:border-green-800 hover:bg-green-50"
              >
                Profile
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
      ) : null}

      {role !== "customer" && role !== "crew_member" ? staffStatsRow : null}

      {role === "manager" ? (
        <div className="mt-8 space-y-6">
          <ManagerApprovalsPanel visitLabels={visitLabels} />
          <Card>
            <h2 className="text-lg font-semibold text-green-950">
              Quick Actions
            </h2>
            <div className="mt-4 flex flex-wrap gap-3">
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
              <Link
                href="/support"
                className="rounded-lg border border-green-800 px-4 py-2 text-sm font-medium text-green-900 hover:bg-green-50"
              >
                Customer Support
              </Link>
              <Link
                href="/contracts"
                className="rounded-lg border border-green-800 px-4 py-2 text-sm font-medium text-green-900 hover:bg-green-50"
              >
                Approve contract drafts
              </Link>
            </div>
          </Card>
        </div>
      ) : null}

      {role === "operations" ? (
        <div className="mt-8 space-y-6">
          <Card>
            <h2 className="text-lg font-semibold text-green-950">
              Scheduling hub
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              Calendar, visit create/assign, missed visits needing reschedule,
              and crew time-off live on Scheduling.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/schedule"
                className="rounded-lg bg-green-900 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
              >
                Open Scheduling
              </Link>
              <Link
                href="/schedule#needs-rescheduling"
                className="rounded-lg border border-amber-700 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-50"
              >
                Needs rescheduling
              </Link>
              <Link
                href="/schedule#crew-availability"
                className="rounded-lg border border-green-800 px-4 py-2 text-sm font-medium text-green-900 hover:bg-green-50"
              >
                Crew time-off
              </Link>
            </div>
          </Card>
          <Card>
            <h2 className="text-lg font-semibold text-green-950">
              Operations Quick Actions
            </h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/quotes"
                className="rounded-lg border border-green-800 px-4 py-2 text-sm font-medium text-green-900 hover:bg-green-50"
              >
                Quotes inbox
              </Link>
              <Link
                href="/schedule"
                className="rounded-lg border border-green-800 px-4 py-2 text-sm font-medium text-green-900 hover:bg-green-50"
              >
                Scheduling
              </Link>
              <Link
                href="/contracts"
                className="rounded-lg border border-green-800 px-4 py-2 text-sm font-medium text-green-900 hover:bg-green-50"
              >
                Contracts
              </Link>
            </div>
            <OpsDashboardCounts />
          </Card>
        </div>
      ) : null}

      {role === "crew_lead" ? (
        <div className="mt-8 space-y-6">
          <CrewLeadTomorrowPreview jobs={scheduleJobs} today={today} />
          <CrewLeadCustomerRequests requests={crewSupportRequests} />
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-green-950">
              Crew Lead Quick Actions
            </h2>
            <CrewLeadQuickActions />
          </Card>
        </div>
      ) : null}

      {role === "crew_member" ? (
        <div className="mt-8 space-y-6">
          <CrewMemberTodayJobs
            jobs={memberJobs}
            today={today}
            extraWork={memberExtraWork}
            laborEntries={memberLaborEntries}
            laborByVisit={memberLaborByVisit}
          />
          <CrewMemberHoursWorked
            jobs={memberJobs}
            today={today}
            laborEntries={memberLaborEntries}
            laborByVisit={memberLaborByVisit}
          />
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-green-950">
              Availability &amp; Time Off
            </h2>
            <p className="mb-4 text-sm text-stone-500">
              Request time off or update your availability for manager review.
            </p>
            <CrewMemberAvailabilityPanel today={today} />
          </Card>
          <div className="flex flex-wrap gap-3">
            <a
              href="/schedule"
              className="rounded-lg border border-green-800 px-4 py-2 text-sm font-medium text-green-900 hover:bg-green-50"
            >
              Open Schedule
            </a>
            <a
              href="/visits"
              className="rounded-lg border border-green-800 px-4 py-2 text-sm font-medium text-green-900 hover:bg-green-50"
            >
              Open Visits
            </a>
          </div>
        </div>
      ) : null}

      {role === "accountant" ? (
        <div className="mt-8">
          <Card>
            <h2 className="text-lg font-semibold text-green-950">
              Quick Actions
            </h2>
            <div className="mt-4 flex flex-wrap gap-3">
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
              <Link
                href="/reports/journal-entries"
                className="rounded-lg border border-green-800 px-4 py-2 text-sm font-medium text-green-900 hover:bg-green-50"
              >
                Journal Entries
              </Link>
            </div>
          </Card>
        </div>
      ) : null}
    </AppShell>
  );
}
