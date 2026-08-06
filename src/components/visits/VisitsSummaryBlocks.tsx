import type { ReactNode } from "react";
import { SectionHeading } from "@/components/ui";
import { ScheduleCalendar } from "@/components/visits/ScheduleCalendar";
import { WeatherAffectedTiles } from "@/components/visits/WeatherAffectedTiles";
import { WorkStatusSection } from "@/components/visits/WorkStatusSection";
import { formatCurrency } from "@/lib/format";
import type { JobRow } from "@/lib/visit-jobs";

function JumpStatCard({
  href,
  label,
  value,
  hint,
}: {
  href: string;
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <a
      href={href}
      className="gs-stat-tile group block transition hover:bg-stone-50/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--complete)]"
    >
      <p className="gs-mark">{label}</p>
      <p className="mt-1.5 gs-metric-value text-3xl text-green-950">
        {value}
      </p>
      <p className="mt-1 text-sm text-stone-600">{hint}</p>
      <p className="gs-text-link mt-3 text-sm">
        Jump to section <span aria-hidden>↓</span>
      </p>
    </a>
  );
}

export function VisitsSummaryBlocks({
  scheduled,
  completed,
  weatherAffected,
  weatherCount,
  periodLabelText,
  afterSummary,
}: {
  scheduled: JobRow[];
  completed: JobRow[];
  weatherAffected: JobRow[];
  weatherCount: number;
  periodLabelText: string;
  afterSummary?: ReactNode;
}) {
  const allJobs = [...scheduled, ...completed];
  const crewPay = allJobs.reduce((s, j) => s + j.crewPay, 0);
  const costs = allJobs.reduce((s, j) => s + j.costTotal, 0);
  const payTotal = crewPay + costs;

  return (
    <div className="gs-stack">
      <section className="gs-section gs-reveal">
        <SectionHeading
          mark="Status"
          title="Work Completed vs Pending"
          description="Click a pie slice or key for counts. Search updates the chart. Use Work directory below to list by status."
        />
        <WorkStatusSection completed={completed} pending={scheduled} />
      </section>

      <div className="gs-stat-row">
        <JumpStatCard
          href="#weather-affected"
          label="Weather Affected"
          value={weatherCount}
          hint="Delayed, rescheduled, or weather response"
        />
        <div className="gs-stat-tile">
          <p className="gs-mark">Period total</p>
          <p className="mt-1.5 gs-metric-value text-3xl text-green-950">
            {formatCurrency(payTotal)}
          </p>
          <p className="mt-1 text-sm text-stone-600">
            {periodLabelText} · crew {formatCurrency(crewPay)} + costs{" "}
            {formatCurrency(costs)}
          </p>
          <p className="mt-2 text-sm font-medium text-stone-700">
            {allJobs.length} {allJobs.length === 1 ? "visit" : "visits"}
          </p>
        </div>
      </div>

      <section className="gs-section">
        <SectionHeading
          mark="Calendar"
          title="Schedule"
          description="Filter by company, employee, job, or status, then click a day."
        />
        {allJobs.length === 0 ? (
          <p className="gs-help">No jobs in this range to show on the calendar.</p>
        ) : (
          <ScheduleCalendar jobs={allJobs} />
        )}
      </section>

      {afterSummary}

      <section id="weather-affected" className="gs-section scroll-mt-24">
        <SectionHeading
          mark="Weather"
          title="Weather Affected"
          description="Original planned date, rescheduled date, and any cost over the original plan."
        />
        <WeatherAffectedTiles jobs={weatherAffected} />
      </section>
    </div>
  );
}
