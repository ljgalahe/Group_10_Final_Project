import { requireAppAccess, createDataClient } from "@/lib/auth-access";
import { AppShell } from "@/components/AppShell";
import { CrewLeadQuickActions } from "@/components/crew-lead/CrewLeadQuickActions";
import { CrewLeadTomorrowPreview } from "@/components/crew-lead/CrewLeadTomorrowPreview";
import {
  buildCrewSchedule,
  todayDateOnly,
} from "@/components/crew-lead/buildCrewSchedule";
import { Card, PageHeader, StatCard } from "@/components/ui";
import { getViewRole } from "@/lib/demo-role";
import { formatCurrency } from "@/lib/format";
import { fetchDashboardStats } from "@/lib/queries";

export default async function DashboardPage() {
  await requireAppAccess();

  const role = await getViewRole();
  const stats = await fetchDashboardStats();

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
  const today = todayDateOnly();
  let scheduleJobs: ReturnType<typeof buildCrewSchedule> = [];

  if (role === "crew_lead") {
    const supabase = await createDataClient();
    const [{ data: contracts }, { data: visits }] = await Promise.all([
      supabase
        .from("contracts")
        .select(
          "id, title, status, visits_per_week, season_start, season_end, customer_id, customers(id, name, address), contract_services(service_name, included)"
        )
        .eq("status", "active"),
      supabase
        .from("service_visits")
        .select(
          "id, scheduled_date, status, contract_id, contracts(id, title, customer_id, customers(id, name, address), contract_services(service_name, included))"
        )
        .order("scheduled_date", { ascending: true }),
    ]);
    scheduleJobs = buildCrewSchedule(contracts ?? [], visits ?? []);
  }

  return (
    <AppShell>
      <PageHeader title={copy.title} description={copy.description} />

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

      {role === "crew_lead" ? (
        <div className="mt-8 space-y-6">
          <CrewLeadTomorrowPreview jobs={scheduleJobs} today={today} />
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-green-950">
              Crew Lead Quick Actions
            </h2>
            <CrewLeadQuickActions />
          </Card>
        </div>
      ) : null}

      {(role === "manager" || role === "accountant") && (
        <div className="mt-8">
          <Card>
            <h2 className="text-lg font-semibold text-green-950">
              Quick Actions
            </h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href="/reports/ar-aging"
                className="rounded-lg border border-green-800 px-4 py-2 text-sm font-medium text-green-900 hover:bg-green-50"
              >
                AR Aging Report
              </a>
              <a
                href="/reports/profitability"
                className="rounded-lg border border-green-800 px-4 py-2 text-sm font-medium text-green-900 hover:bg-green-50"
              >
                Profitability Report
              </a>
            </div>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
