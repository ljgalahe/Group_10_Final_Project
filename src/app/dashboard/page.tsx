import Link from "next/link";
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
import { CompanyPerformanceLeaderboard } from "@/components/CompanyPerformanceLeaderboard";
import { DashboardCollapsibleSection } from "@/components/DashboardCollapsibleSection";
import { ManagerAlertsCenter } from "@/components/ManagerAlertsCenter";
import { ManagerKpiStrip, type ManagerKpi } from "@/components/ManagerKpiStrip";
import { ManagerApprovalsPanel } from "@/components/manager/ManagerApprovalsPanel";
import {
  ServiceHoldAuditSync,
  ServiceHoldDashboardCard,
} from "@/components/ServiceHoldDashboardCard";
import { Card, PageHeader, StatCard } from "@/components/ui";
import {
  buildCustomerServiceHolds,
  type CustomerServiceHold,
} from "@/lib/service-hold";
import {
  fetchEquipment,
  fetchEquipmentUsage,
} from "@/app/equipment/queries";
import { filterJobsForCrewMember } from "@/lib/crew-member";
import type { VisitLaborEntry } from "@/lib/crew-hours";
import { buildCollectionRisk } from "@/lib/collection-risk";
import { buildCompanyPerformanceLeaderboard } from "@/lib/company-performance";
import type { PerformanceCategory } from "@/lib/company-performance";
import {
  buildManagerAlerts,
  type ManagerAlert,
} from "@/lib/manager-alerts";
import { getViewCustomerId, getViewRole } from "@/lib/demo-role";
import { formatCurrency, formatDate } from "@/lib/format";
import type {
  CustomerAttentionItem,
  SupportRequestQueueItem,
} from "@/lib/queries";
import {
  fetchAllVisitCosts,
  fetchContracts,
  fetchCrewApplicableSupportRequests,
  fetchCustomerAccountHealth,
  fetchCustomerNeedsAttention,
  fetchCustomerUpcomingVisits,
  fetchDashboardStats,
  fetchInvoices,
  fetchPayments,
  fetchPendingContractChangeRequests,
  fetchProfitabilityReport,
  fetchVisitLaborEntries,
  fetchVisits,
} from "@/lib/queries";
import type { ExtraWorkItem } from "@/components/crew-lead/schedule-types";
import { AccountantDashboardPanel } from "@/app/dashboard/components/AccountantDashboardPanel";
import { fetchAccountantDashboardData } from "@/app/dashboard/accountant-dashboard-data";

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

function parsePerfCategory(
  value: string | undefined
): PerformanceCategory | undefined {
  if (
    value === "crew" ||
    value === "equipment" ||
    value === "customer" ||
    value === "contract"
  ) {
    return value;
  }
  return undefined;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    renewal?: string;
    quote?: string;
    error?: string;
    perf?: string;
  }>;
}) {
  await requireAppAccess();

  const role = await getViewRole();
  const stats = await fetchDashboardStats();
  const accountantDashboard =
    role === "accountant" ? await fetchAccountantDashboardData() : null;
  const params = await searchParams;
  const initialPerfCategory = parsePerfCategory(params.perf);

  const roleTitles: Record<string, { title: string; description: string }> = {
    manager: {
      title: "Manager Dashboard",
      description:
        "Summary hub for collections, holds, alerts, and performance — open a section for detail.",
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
  let performanceCategories: ReturnType<
    typeof buildCompanyPerformanceLeaderboard
  > = [];
  let serviceHolds: CustomerServiceHold[] = [];
  let managerAlerts: ManagerAlert[] = [];
  let managerKpis: ManagerKpi[] = [];

  if (role === "manager") {
    const [
      { data: contracts },
      { data: visits },
      { data: visitCosts },
      equipment,
      equipmentUsage,
      { data: invoices },
      { data: payments },
      profitability,
      { data: pendingChangeRequests },
    ] = await Promise.all([
      fetchContracts(),
      fetchVisits(),
      fetchAllVisitCosts(),
      fetchEquipment().then((data) => data.assets),
      fetchEquipmentUsage(),
      fetchInvoices(),
      fetchPayments(),
      fetchProfitabilityReport(),
      fetchPendingContractChangeRequests(),
    ]);

    const contractCustomerById = new Map(
      contracts.map((contract) => [
        contract.id,
        String(contract.customer_id),
      ])
    );

    serviceHolds = buildCustomerServiceHolds(
      invoices.map((invoice) => ({
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        customer_id: String(invoice.customer_id),
        total: Number(invoice.total),
        amount_paid: Number(invoice.amount_paid),
        status: invoice.status,
        due_date: invoice.due_date,
        customers: invoice.customers
          ? { name: invoice.customers.name }
          : null,
      })),
      visits.map((visit) => ({
        id: visit.id,
        customer_id:
          (visit.contracts as { customer_id?: string } | null)?.customer_id ??
          null,
        contract_id: visit.contract_id,
        status: visit.status,
        scheduled_date: visit.scheduled_date,
      })),
      { today, contractCustomerById }
    );

    const customerRisk = buildCollectionRisk(
      invoices.map((invoice) => ({
        id: invoice.id,
        customer_id: String(invoice.customer_id),
        total: Number(invoice.total),
        amount_paid: Number(invoice.amount_paid),
        status: invoice.status,
        due_date: invoice.due_date,
        issue_date: invoice.issue_date ?? null,
        customers: invoice.customers ?? null,
      })),
      payments
    );

    performanceCategories = buildCompanyPerformanceLeaderboard({
      contracts: contracts.map((contract) => ({
        id: contract.id,
        title: contract.title,
        status: contract.status,
        assigned_crew: contract.assigned_crew ?? null,
        customer_id: contract.customer_id,
        visits_per_week: contract.visits_per_week ?? null,
      })),
      visits: visits.map((visit) => ({
        id: visit.id,
        contract_id: visit.contract_id,
        status: visit.status,
        scheduled_date: visit.scheduled_date,
        crew_notes: visit.crew_notes ?? null,
        completed_at: visit.completed_at ?? null,
      })),
      visitCosts: visitCosts.map((cost) => ({
        visit_id: cost.visit_id,
        cost_type: cost.cost_type,
        amount: Number(cost.amount),
        quantity: cost.quantity == null ? null : Number(cost.quantity),
        description: cost.description ?? null,
      })),
      equipment: equipment.map((asset) => ({
        id: asset.id,
        name: asset.name,
        status: asset.status,
        cost: asset.cost,
        salvage_value: asset.salvage_value,
        estimated_total_hours: asset.estimated_total_hours,
        hours_used: asset.hours_used,
      })),
      equipmentUsage: equipmentUsage.map((row) => ({
        equipment_id: row.equipment_id,
        visit_id: row.visit_id,
        hours: row.hours,
      })),
      invoices: invoices.map((invoice) => ({
        id: invoice.id,
        customer_id: String(invoice.customer_id),
        contract_id: invoice.contract_id ?? null,
        total: Number(invoice.total),
        amount_paid: Number(invoice.amount_paid),
        status: invoice.status,
        due_date: invoice.due_date,
        issue_date: invoice.issue_date ?? null,
        customers: invoice.customers ?? null,
      })),
      profitability,
      customerRisk,
      heldCustomerIds: serviceHolds.map((hold) => hold.customerId),
    });

    managerAlerts = buildManagerAlerts({
      today,
      serviceHolds,
      invoices: invoices.map((invoice) => ({
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        customer_id: String(invoice.customer_id),
        total: Number(invoice.total),
        amount_paid: Number(invoice.amount_paid),
        status: invoice.status,
        due_date: invoice.due_date,
        issue_date: invoice.issue_date ?? null,
        contract_id: invoice.contract_id ?? null,
        customers: invoice.customers
          ? { name: invoice.customers.name }
          : null,
      })),
      contracts: contracts.map((contract) => ({
        id: contract.id,
        title: contract.title,
        status: contract.status,
        season_end: contract.season_end ?? null,
        customer_id: String(contract.customer_id),
      })),
      profitability: profitability.map((row) => ({
        contractId: row.contractId,
        title: row.title,
        margin: row.margin,
        marginPct: row.marginPct,
      })),
      customerRisk,
      performanceCategories,
      equipment: equipment.map((asset) => ({
        id: asset.id,
        name: asset.name,
        status: asset.status,
        estimated_total_hours: Number(asset.estimated_total_hours),
        hours_used: Number(asset.hours_used),
      })),
      pendingChangeRequests: pendingChangeRequests.map((row) => ({
        id: row.id,
        contract_id: row.contract_id,
        status: row.status,
      })),
    });

    const totalRevenue = profitability.reduce((sum, row) => sum + row.revenue, 0);
    const totalMargin = profitability.reduce((sum, row) => sum + row.margin, 0);
    const avgMarginPct =
      totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

    const visitsRequiringAttention = visits.filter(
      (visit) =>
        visit.status === "scheduled" && visit.scheduled_date < today
    ).length;

    managerKpis = [
      {
        id: "collected",
        label: "Revenue collected",
        value: formatCurrency(stats.totalCollected),
        hint: `YTD against ${formatCurrency(stats.totalBilled)} billed`,
        href: "/payments",
      },
      {
        id: "ar",
        label: "Outstanding AR",
        value: formatCurrency(stats.outstanding),
        hint: `${stats.overdueCount} open invoice(s) need follow-up`,
        href: "/reports/ar-aging",
      },
      {
        id: "holds",
        label: "Customers on service hold",
        value: String(serviceHolds.length),
        hint:
          serviceHolds.length === 0
            ? "No accounts currently blocked"
            : "Invoices 30+ days overdue",
        href: "/reports/ar-aging?hold=1",
      },
      {
        id: "margin",
        label: "Average contract margin",
        value: `${avgMarginPct.toFixed(1)}%`,
        hint: "Across active contracts with billed revenue",
        href: "/reports/profitability",
      },
      {
        id: "visits",
        label: "Visits requiring attention",
        value: String(visitsRequiringAttention),
        hint: "Scheduled visits past their planned date",
        href: "/visits",
      },
    ];
  }

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
                  Needs Attention
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

      {role !== "customer" &&
      role !== "crew_member" &&
      role !== "manager" &&
      role !== "accountant"
        ? staffStatsRow
        : null}

      {role === "manager" ? (
        <div className="mt-6 space-y-5">
          <ServiceHoldAuditSync holds={serviceHolds} />
          <ManagerKpiStrip kpis={managerKpis} />
          <ManagerAlertsCenter alerts={managerAlerts} />
          <CompanyPerformanceLeaderboard
            categories={performanceCategories}
            initialCategory={initialPerfCategory}
          />
          <DashboardCollapsibleSection
            title="Service Hold Details"
            summary={
              serviceHolds.length === 0
                ? "No customers currently on hold"
                : `${serviceHolds.length} customer${serviceHolds.length === 1 ? "" : "s"} blocked from new service`
            }
            defaultOpen={false}
          >
            <ServiceHoldDashboardCard holds={serviceHolds} embedded />
          </DashboardCollapsibleSection>
          <DashboardCollapsibleSection
            title="Approvals & Crew Alerts"
            summary="Field concerns, extra-work approvals, and visit comments"
            defaultOpen={false}
          >
            <ManagerApprovalsPanel visitLabels={visitLabels} hideIntro />
          </DashboardCollapsibleSection>
          <Card className="p-4 sm:p-5">
            <h2 className="text-base font-semibold text-green-950">
              Quick Actions
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/reports/ar-aging"
                className="rounded-lg border border-green-800 px-3 py-1.5 text-sm font-medium text-green-900 hover:bg-green-50"
              >
                AR Aging
              </Link>
              <Link
                href="/reports/profitability"
                className="rounded-lg border border-green-800 px-3 py-1.5 text-sm font-medium text-green-900 hover:bg-green-50"
              >
                Profitability
              </Link>
              <Link
                href="/payments"
                className="rounded-lg border border-green-800 px-3 py-1.5 text-sm font-medium text-green-900 hover:bg-green-50"
              >
                Payments
              </Link>
            </div>
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
            <CrewLeadQuickActions
              todaysJobs={scheduleJobs.filter(
                (job) =>
                  job.scheduledDate === today && job.status !== "cancelled"
              )}
            />
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

      {role === "accountant" && accountantDashboard ? (
        <AccountantDashboardPanel data={accountantDashboard} />
      ) : null}
    </AppShell>
  );
}
