import Link from "next/link";
import { Card, StatCard } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { OperationsDashboardData } from "@/app/dashboard/operations-dashboard-data";

export function OperationsDashboardPanel({
  data,
}: {
  data: OperationsDashboardData;
}) {
  return (
    <div className="mt-8 space-y-6">
      <div className="gs-kpi-grid">
        <StatCard
          label="Open Quotes"
          value={data.openQuotesCount}
          hint="New, survey scheduled, or budgeted"
        />
        <StatCard
          label="Contract Drafts"
          value={data.pendingApprovalsCount}
          hint="Awaiting Manager + Accountant approval"
        />
        <StatCard
          label="Upcoming Service Visits"
          value={data.scheduledServiceCount}
          hint="Scheduled from today forward"
        />
        <StatCard
          label="Upcoming Site Surveys"
          value={data.scheduledSurveyCount}
          hint="Pre-service Ops visits for quotes"
        />
        <StatCard
          label="Needs Rescheduling"
          value={data.needsRescheduleCount}
          hint="Missed, cancelled, overdue, or weather — same list as Scheduling"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-green-950">
                Upcoming Visits Scheduled
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Company service visits — same schedule Ops manages on Visits &amp;
                Scheduling.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm font-medium text-green-800">
              <Link href="/visits" className="hover:underline">
                Visits →
              </Link>
              <Link href="/schedule" className="hover:underline">
                Scheduling →
              </Link>
            </div>
          </div>
          {data.upcomingServiceVisits.length === 0 ? (
            <p className="mt-4 text-sm text-stone-500">
              No upcoming service visits scheduled.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-stone-100 border-t border-stone-100">
              {data.upcomingServiceVisits.map((visit) => (
                <li key={visit.id}>
                  <Link
                    href={visit.href}
                    className="group flex items-center gap-3 py-3 transition hover:bg-stone-50"
                  >
                    <span
                      className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-green-600"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-green-950">
                        {visit.customerName}
                      </p>
                      <p className="mt-0.5 text-sm text-stone-500">
                        {formatDate(visit.scheduledDate)}
                        {" · "}
                        {visit.contractTitle.replace(/^20\d{2}\s+/, "")}
                        {visit.crewLeadName ? ` · ${visit.crewLeadName}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium text-green-800 group-hover:underline">
                      Open
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-green-950">
                Upcoming Site Surveys
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Site surveys / property observations Ops completes before quoting.
              </p>
            </div>
            <Link
              href="/quotes"
              className="text-sm font-medium text-green-800 hover:underline"
            >
              Quotes →
            </Link>
          </div>
          {data.upcomingSurveyVisits.length === 0 ? (
            <p className="mt-4 text-sm text-stone-500">
              No upcoming site survey visits scheduled.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-stone-100 border-t border-stone-100">
              {data.upcomingSurveyVisits.map((visit) => (
                <li key={visit.id}>
                  <Link
                    href={visit.href}
                    className="group flex items-center gap-3 py-3 transition hover:bg-stone-50"
                  >
                    <span
                      className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-500"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-green-950">
                        {visit.customerName}
                      </p>
                      <p className="mt-0.5 text-sm text-stone-500">
                        {formatDate(visit.scheduledDate)}
                        {" · "}
                        {visit.title.replace(/^Survey staging — /, "")}
                        {visit.address ? ` · ${visit.address}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium text-green-800 group-hover:underline">
                      {visit.quoteId ? "Quote" : "Quotes"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-green-950">Scheduling Hub</h2>
        <p className="mt-1 text-sm text-stone-600">
          Calendar, visit create/assign,{" "}
          {data.needsRescheduleCount === 1
            ? "1 scheduled visit missed or needs rescheduling"
            : `${data.needsRescheduleCount} scheduled visits missed or need rescheduling`}
          , and crew time-off.
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
            Needs Rescheduling ({data.needsRescheduleCount})
          </Link>
          <Link
            href="/schedule#crew-availability"
            className="rounded-lg border border-green-800 px-4 py-2 text-sm font-medium text-green-900 hover:bg-green-50"
          >
            Crew Time-Off
          </Link>
          <Link
            href="/visits"
            className="rounded-lg border border-green-800 px-4 py-2 text-sm font-medium text-green-900 hover:bg-green-50"
          >
            Visits
          </Link>
        </div>
      </Card>
    </div>
  );
}
