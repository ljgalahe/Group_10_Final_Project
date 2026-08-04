import { redirect } from "next/navigation";
import { requireAppAccess } from "@/lib/auth-access";
import { AppShell } from "@/components/AppShell";
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

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-green-950">Quick Actions</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="/contracts"
              className="rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              View Contracts
            </a>
            {(role === "manager" || role === "accountant") && (
              <>
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
              </>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-green-950">
            Demo Tip for Presentation
          </h2>
          <p className="mt-3 text-sm text-stone-600">
            Use the <strong>View as</strong> dropdown in the top navigation to
            switch between Manager, Accountant, Crew Lead, and Customer without
            logging out.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
