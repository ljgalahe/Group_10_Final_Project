import type { ReactNode } from "react";
import { SectionHeading } from "@/components/ui";
import { ScheduleCalendar } from "@/components/visits/ScheduleCalendar";
import { WorkStatusSection } from "@/components/visits/WorkStatusSection";
import { formatCurrency } from "@/lib/format";
import type { JobRow } from "@/lib/visit-jobs";

export function VisitsSummaryBlocks({
  scheduled,
  completed,
  periodLabelText,
  afterSummary,
}: {
  scheduled: JobRow[];
  completed: JobRow[];
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
          description="Filter by customer, employee, job, or status, then click a day."
        />
        {allJobs.length === 0 ? (
          <p className="gs-help">No jobs in this range to show on the calendar.</p>
        ) : (
          <ScheduleCalendar jobs={allJobs} />
        )}
      </section>

      {afterSummary}
    </div>
  );
}
