import Link from "next/link";
import type { OperationsDashboardData } from "@/app/dashboard/operations-dashboard-data";
import { ManagerKpiStrip, type ManagerKpi } from "@/components/ManagerKpiStrip";
import { Card, SectionHeading } from "@/components/ui";
import { formatDate } from "@/lib/format";

function VisitList({
  emptyMessage,
  items,
  accentClass,
}: {
  emptyMessage: string;
  accentClass: string;
  items: Array<{
    id: string;
    href: string;
    primary: string;
    secondary: string;
    actionLabel: string;
  }>;
}) {
  if (items.length === 0) {
    return <p className="mt-3 text-sm text-stone-500">{emptyMessage}</p>;
  }

  return (
    <ul className="mt-3 divide-y divide-stone-100 border-t border-stone-100">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={item.href}
            className="group flex items-center gap-3 py-3 transition hover:bg-stone-50/80"
          >
            <span
              className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${accentClass}`}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-green-950">{item.primary}</p>
              <p className="mt-0.5 text-sm text-stone-500">{item.secondary}</p>
            </div>
            <span className="shrink-0 text-sm font-medium text-green-800 group-hover:underline">
              {item.actionLabel}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function OperationsDashboardPanel({
  data,
}: {
  data: OperationsDashboardData;
}) {
  const kpis: ManagerKpi[] = [
    {
      id: "open-quotes",
      label: "Open Quotes",
      value: String(data.openQuotesCount),
      hint: "New, survey scheduled, or budgeted",
      href: "/quotes",
    },
    {
      id: "contract-drafts",
      label: "Contract Drafts",
      value: String(data.pendingApprovalsCount),
      hint: "Awaiting Manager + Accountant approval",
      href: "/contracts",
    },
    {
      id: "service-visits",
      label: "Upcoming Service",
      value: String(data.scheduledServiceCount),
      hint: "Scheduled from today forward",
      href: "/visits",
    },
    {
      id: "site-surveys",
      label: "Site Surveys",
      value: String(data.scheduledSurveyCount),
      hint: "Pre-service Ops visits for quotes",
      href: "/quotes",
    },
    {
      id: "needs-reschedule",
      label: "Needs Rescheduling",
      value: String(data.needsRescheduleCount),
      hint: "Missed, cancelled, overdue, or weather",
      href: "/schedule#needs-rescheduling",
    },
  ];

  const serviceItems = data.upcomingServiceVisits.map((visit) => ({
    id: visit.id,
    href: visit.href,
    primary: visit.customerName,
    secondary: [
      formatDate(visit.scheduledDate),
      visit.contractTitle.replace(/^20\d{2}\s+/, ""),
      visit.crewLeadName,
    ]
      .filter(Boolean)
      .join(" · "),
    actionLabel: "Open",
  }));

  const surveyItems = data.upcomingSurveyVisits.map((visit) => ({
    id: visit.id,
    href: visit.href,
    primary: visit.customerName,
    secondary: [
      formatDate(visit.scheduledDate),
      visit.title.replace(/^Survey staging — /, ""),
      visit.address,
    ]
      .filter(Boolean)
      .join(" · "),
    actionLabel: visit.quoteId ? "Quote" : "Quotes",
  }));

  return (
    <div className="mt-6 space-y-5">
      <ManagerKpiStrip kpis={kpis} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <SectionHeading
            mark="Field"
            title="Upcoming Visits"
            description="Company service visits Ops manages on Visits and Scheduling."
            action={
              <div className="flex flex-wrap gap-3 text-sm font-medium text-green-800">
                <Link href="/visits" className="hover:underline">
                  Visits →
                </Link>
                <Link href="/schedule" className="hover:underline">
                  Scheduling →
                </Link>
              </div>
            }
          />
          <VisitList
            emptyMessage="No upcoming service visits scheduled."
            accentClass="bg-green-600"
            items={serviceItems}
          />
        </Card>

        <Card className="p-4 sm:p-5">
          <SectionHeading
            mark="Pipeline"
            title="Upcoming Site Surveys"
            description="Property observations Ops completes before quoting."
            action={
              <Link
                href="/quotes"
                className="text-sm font-medium text-green-800 hover:underline"
              >
                Quotes →
              </Link>
            }
          />
          <VisitList
            emptyMessage="No upcoming site survey visits scheduled."
            accentClass="bg-amber-500"
            items={surveyItems}
          />
        </Card>
      </div>

      <Card className="p-4 sm:p-5">
        <SectionHeading
          mark="Dispatch"
          title="Scheduling Hub"
          description={
            data.needsRescheduleCount === 1
              ? "1 scheduled visit missed or needs rescheduling — open calendar, create/assign visits, and crew time-off."
              : `${data.needsRescheduleCount} scheduled visits missed or need rescheduling — open calendar, create/assign visits, and crew time-off.`
          }
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/schedule"
            className="rounded-lg bg-green-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-800"
          >
            Open Scheduling
          </Link>
          <Link
            href="/schedule#needs-rescheduling"
            className="rounded-lg border border-amber-700 px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-50"
          >
            Needs Rescheduling ({data.needsRescheduleCount})
          </Link>
          <Link
            href="/schedule#crew-availability"
            className="rounded-lg border border-green-800 px-3 py-1.5 text-sm font-medium text-green-900 hover:bg-green-50"
          >
            Crew Time-Off
          </Link>
          <Link
            href="/visits"
            className="rounded-lg border border-green-800 px-3 py-1.5 text-sm font-medium text-green-900 hover:bg-green-50"
          >
            Visits
          </Link>
          <Link
            href="/inquiries"
            className="rounded-lg border border-green-800 px-3 py-1.5 text-sm font-medium text-green-900 hover:bg-green-50"
          >
            Inquiries
          </Link>
        </div>
      </Card>
    </div>
  );
}
