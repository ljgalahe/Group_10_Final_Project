import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CompletedSortToggle } from "@/components/visits/CompletedSortToggle";
import { OrganizedJobList } from "@/components/visits/JobList";
import { VisitPeriodFilters } from "@/components/visits/VisitPeriodFilters";
import { EmptyState, PageHeader, StatCard } from "@/components/ui";
import { requireAppAccess } from "@/lib/auth-access";
import { formatCurrency } from "@/lib/format";
import { fetchAllVisitCosts, fetchVisits } from "@/lib/queries";
import type { VisitCost } from "@/lib/types";
import { buildJobRows, groupCompletedJobs, summaryFromJobs } from "@/lib/visit-jobs";
import {
  buildCompletedQuery,
  parseCompletedSortMode,
  parseVisitPeriod,
  periodLabel,
} from "@/lib/visit-period";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function WorkPendingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAppAccess();

  const params = await searchParams;
  const period = parseVisitPeriod(params);
  const sort = parseCompletedSortMode(params);

  const [{ data: visits }, { data: allCosts }] = await Promise.all([
    fetchVisits(),
    fetchAllVisitCosts(),
  ]);

  const costsByVisit = new Map<string, VisitCost[]>();
  for (const cost of allCosts) {
    const list = costsByVisit.get(cost.visit_id) ?? [];
    list.push(cost);
    costsByVisit.set(cost.visit_id, list);
  }

  const jobs = buildJobRows(visits, costsByVisit, period);
  const summary = summaryFromJobs(jobs);
  const pending = summary.scheduled;
  const groups = groupCompletedJobs(pending, sort);
  const backQs = buildCompletedQuery(period, sort);
  const listMode =
    sort === "job" ? "jobs" : sort === "date" ? "date" : "company";

  return (
    <AppShell>
      <PageHeader
        title="Work pending"
        description={`Scheduled jobs still open for ${periodLabel(period)}. Order by date, company, or job.`}
        action={
          <Link
            href={`/visits?${backQs}`}
            className="rounded-md border border-green-800 px-3 py-2 text-sm font-medium text-green-900 hover:bg-green-50"
          >
            ← Back to Visits
          </Link>
        }
      />

      <div className="mb-6 space-y-4">
        <VisitPeriodFilters
          period={period}
          organize="company"
          basePath="/visits/pending"
          extraQuery={{ sort }}
        />
        <CompletedSortToggle
          period={period}
          sort={sort}
          basePath="/visits/pending"
        />
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Jobs pending"
          value={pending.length}
          hint={`In ${periodLabel(period)}`}
        />
        <StatCard
          label="Crew pay planned"
          value={formatCurrency(summary.schedulePay)}
          hint="Across pending visits"
        />
      </div>

      {pending.length === 0 ? (
        <EmptyState message="No pending work in this time range. Try All time or August 2026." />
      ) : (
        <OrganizedJobList
          groups={groups}
          organizeBy={listMode}
          emptyMessage="No pending work in this time range."
        />
      )}
    </AppShell>
  );
}
