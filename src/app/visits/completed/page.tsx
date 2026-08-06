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

export default async function WorkCompletedPage({
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
  const completed = summary.completed;
  const groups = groupCompletedJobs(completed, sort);
  const backQs = buildCompletedQuery(period, sort);
  const listMode =
    sort === "job" ? "jobs" : sort === "date" ? "date" : "company";

  return (
    <AppShell>
      <PageHeader
        title="Work Completed"
        description={`Finished jobs for ${periodLabel(period)}. Order by date, company, or job.`}
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
          basePath="/visits/completed"
          extraQuery={{ sort }}
        />
        <CompletedSortToggle period={period} sort={sort} />
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Jobs Completed"
          value={completed.length}
          hint={`In ${periodLabel(period)}`}
        />
        <StatCard
          label="Crew Pay Logged"
          value={formatCurrency(summary.completedPay)}
          hint="Across completed visits"
        />
      </div>

      {completed.length === 0 ? (
        <EmptyState message="No completed work in this time range. Try All time or June 2026." />
      ) : (
        <OrganizedJobList
          groups={groups}
          organizeBy={listMode}
          emptyMessage="No completed work in this time range."
        />
      )}
    </AppShell>
  );
}
