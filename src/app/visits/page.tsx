import { AppShell } from "@/components/AppShell";
import {
  CrewLeadVisitsBoard,
  type CrewLeadVisitCardData,
} from "@/components/crew-lead/CrewLeadVisitsBoard";
import {
  normalizeServiceName,
  oxfordAddressForCustomer,
} from "@/components/crew-lead/buildCrewSchedule";
import type {
  ExtraWorkItem,
  ScheduleJob,
} from "@/components/crew-lead/schedule-types";
import { OrganizedJobList } from "@/components/visits/JobList";
import {
  OrganizeToggle,
  VisitPeriodFilters,
} from "@/components/visits/VisitPeriodFilters";
import { VisitsSummaryBlocks } from "@/components/visits/VisitsSummaryBlocks";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { createDataClient, requireAppAccess } from "@/lib/auth-access";
import { getViewRole } from "@/lib/demo-role";
import {
  fetchAllVisitCosts,
  fetchVisitCosts,
  fetchVisits,
} from "@/lib/queries";
import type { VisitCost } from "@/lib/types";
import {
  buildJobRows,
  groupJobsByCompany,
  groupJobsByTask,
  summaryFromJobs,
} from "@/lib/visit-jobs";
import {
  buildVisitsQuery,
  parseOrganizeMode,
  parseVisitPeriod,
  periodLabel,
} from "@/lib/visit-period";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function VisitsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAppAccess();

  const role = await getViewRole();
  const { data: visits } = await fetchVisits();

  let extraWork: ExtraWorkItem[] = [];
  const crewJobsByVisitId = new Map<string, ScheduleJob>();

  if (role === "crew_lead") {
    const supabase = await createDataClient();
    const [{ data: enrichedVisits }, { data: extraWorkRows }] =
      await Promise.all([
        supabase
          .from("service_visits")
          .select(
            "id, scheduled_date, status, contract_id, contracts(id, title, customer_id, customers(id, name, address), contract_services(service_name, included))"
          )
          .order("scheduled_date", { ascending: true }),
        supabase
          .from("extra_work_orders")
          .select("id, contract_id, title, description, quoted_amount, status"),
      ]);

    extraWork = (extraWorkRows ?? []).map((row) => ({
      id: row.id,
      contractId: row.contract_id,
      title: row.title,
      description: row.description,
      quotedAmount: Number(row.quoted_amount),
      status: row.status,
    }));

    for (const visit of enrichedVisits ?? []) {
      const contractRaw = visit.contracts as
        | {
            id: string;
            title: string;
            customer_id: string;
            customers:
              | { id: string; name: string; address: string | null }
              | { id: string; name: string; address: string | null }[]
              | null;
            contract_services:
              | { service_name: string; included: boolean }[]
              | null;
          }
        | {
            id: string;
            title: string;
            customer_id: string;
            customers:
              | { id: string; name: string; address: string | null }
              | { id: string; name: string; address: string | null }[]
              | null;
            contract_services:
              | { service_name: string; included: boolean }[]
              | null;
          }[]
        | null;
      const contract = Array.isArray(contractRaw)
        ? contractRaw[0]
        : contractRaw;
      const customerRaw = contract?.customers;
      const customer = Array.isArray(customerRaw)
        ? customerRaw[0]
        : customerRaw;
      if (!contract || !customer) continue;

      const services = Array.from(
        new Map(
          (contract.contract_services ?? [])
            .filter((s) => s.included)
            .map((s) => {
              const name = normalizeServiceName(s.service_name);
              return [name.toLowerCase(), name] as const;
            })
        ).values()
      );

      crewJobsByVisitId.set(visit.id, {
        id: visit.id,
        contractId: contract.id,
        scheduledDate: visit.scheduled_date.slice(0, 10),
        status: visit.status,
        customerId: customer.id,
        customerName: customer.name,
        customerIdShort: customer.id.slice(-4),
        address: oxfordAddressForCustomer(customer.id, customer.address),
        contractTitle: contract.title,
        services,
        lat: 34.3665,
        lng: -89.5192,
        source: "visit",
      });
    }

    const cardData: CrewLeadVisitCardData[] = await Promise.all(
      visits.map(async (visit) => {
        const contract = visit.contracts as {
          title: string;
          customers: { name: string } | null;
        } | null;
        const { data: costs } = await fetchVisitCosts(visit.id);
        const costRows = costs ?? [];
        const totalCosts = costRows.reduce(
          (sum, c) => sum + Number(c.amount),
          0
        );
        const crewJob = crewJobsByVisitId.get(visit.id) ?? null;

        return {
          id: visit.id,
          status: visit.status,
          customerName: contract?.customers?.name ?? "Unknown Customer",
          contractTitle: contract?.title ?? "Contract",
          scheduledDate: visit.scheduled_date,
          crewNotes: visit.crew_notes,
          totalCosts,
          costs: costRows.map((cost) => ({
            id: cost.id,
            cost_type: cost.cost_type,
            description: cost.description,
            amount: Number(cost.amount),
          })),
          crewJob,
        };
      })
    );

    return (
      <AppShell>
        <PageHeader
          title="Service Visits"
          description="Filter by company, employee, or job. Open a visit for location, hours, supplies, and photo proof."
        />
        {cardData.length === 0 ? (
          <EmptyState message="No visits scheduled. Run the seed script to load demo visits." />
        ) : (
          <CrewLeadVisitsBoard visits={cardData} extraWork={extraWork} />
        )}
      </AppShell>
    );
  }

  const params = await searchParams;
  const period = parseVisitPeriod(params);
  const organize = parseOrganizeMode(params);

  const { data: allCosts } = await fetchAllVisitCosts();
  const costsByVisit = new Map<string, VisitCost[]>();
  for (const cost of allCosts) {
    const list = costsByVisit.get(cost.visit_id) ?? [];
    list.push(cost);
    costsByVisit.set(cost.visit_id, list);
  }

  const jobs = buildJobRows(visits, costsByVisit, period);
  const summary = summaryFromJobs(jobs);
  const groups =
    organize === "jobs" ? groupJobsByTask(jobs) : groupJobsByCompany(jobs);
  const completedHref = `/visits/completed?${buildVisitsQuery(period, organize, { sort: "date" })}`;
  const pendingHref = `/visits/pending?${buildVisitsQuery(period, organize, { sort: "date" })}`;

  return (
    <AppShell>
      <PageHeader
        title="Service Visits"
        description={`Summary and job list for ${periodLabel(period)}. Switch the time range or organize by company or job.`}
      />

      <div className="mb-6">
        <VisitPeriodFilters period={period} organize={organize} />
      </div>

      <VisitsSummaryBlocks
        scheduled={summary.scheduled}
        completed={summary.completed}
        weatherAffected={summary.weatherAffected}
        weatherCount={summary.weatherCount}
        periodLabelText={periodLabel(period)}
        completedHref={completedHref}
        pendingHref={pendingHref}
        afterSummary={
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-green-950">
                  Work directory
                </h3>
                <p className="mt-1 text-sm text-stone-500">
                  {organize === "company"
                    ? "Browse companies, open a job, then a visit for crew, pay, costs, and photo proof."
                    : "Browse jobs across companies, then open a visit for crew, pay, costs, and photo proof."}
                </p>
              </div>
              <OrganizeToggle period={period} organize={organize} />
            </div>

            <div className="mt-4">
              <OrganizedJobList
                groups={groups}
                organizeBy={organize}
                emptyMessage="No jobs in this time range. Try All time or June 2026."
              />
            </div>
          </Card>
        }
      />
    </AppShell>
  );
}
