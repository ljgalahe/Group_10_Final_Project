import type { ReactNode } from "react";
import { Card } from "@/components/ui";
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
  tone,
}: {
  href: string;
  label: string;
  value: string | number;
  hint: string;
  tone: "sky" | "emerald" | "green";
}) {
  const styles =
    tone === "sky"
      ? "border-sky-200 bg-sky-50 hover:border-sky-600 hover:bg-sky-100 focus-visible:ring-sky-600"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50 hover:border-emerald-600 hover:bg-emerald-100 focus-visible:ring-emerald-600"
        : "border-green-200 bg-green-50 hover:border-green-700 hover:bg-green-100 focus-visible:ring-green-700";

  const valueColor =
    tone === "sky"
      ? "text-sky-900"
      : tone === "emerald"
        ? "text-emerald-900"
        : "text-green-900";

  const linkColor =
    tone === "sky"
      ? "text-sky-800"
      : tone === "emerald"
        ? "text-emerald-800"
        : "text-green-800";

  return (
    <a
      href={href}
      className={`block rounded-xl border p-5 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 ${styles}`}
    >
      <p className="text-sm font-medium text-stone-600">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${valueColor}`}>{value}</p>
      <p className="mt-1 text-xs text-stone-500">{hint}</p>
      <p className={`mt-3 text-xs font-medium ${linkColor}`}>
        Jump to section ↓
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
  completedHref,
  pendingHref,
  afterSummary,
  /** Company-wide scheduling calendar lives on Operations → Scheduling. */
  showSchedule = true,
}: {
  scheduled: JobRow[];
  completed: JobRow[];
  weatherAffected: JobRow[];
  weatherCount: number;
  periodLabelText: string;
  completedHref: string;
  pendingHref: string;
  afterSummary?: ReactNode;
  showSchedule?: boolean;
}) {
  const allJobs = [...scheduled, ...completed];
  const crewPay = allJobs.reduce((s, j) => s + j.crewPay, 0);
  const costs = allJobs.reduce((s, j) => s + j.costTotal, 0);
  const payTotal = crewPay + costs;

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-semibold text-green-950">
          Work completed vs pending
        </h3>
        <p className="mt-1 text-sm text-stone-500">
          Search to filter the pie, or click Completed / Pending for the full
          list.
        </p>
        <WorkStatusSection
          completed={completed}
          pending={scheduled}
          completedHref={completedHref}
          pendingHref={pendingHref}
        />
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <JumpStatCard
          href="#weather-affected"
          label="Weather affected"
          value={weatherCount}
          hint="Delayed, rescheduled, or weather response"
          tone="sky"
        />
        <div className="rounded-xl border border-green-800 bg-gradient-to-br from-green-50 to-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-800">
            Period total
          </p>
          <p className="mt-2 text-3xl font-bold text-green-950">
            {formatCurrency(payTotal)}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            {periodLabelText} · crew {formatCurrency(crewPay)} + costs{" "}
            {formatCurrency(costs)}
          </p>
          <p className="mt-3 text-xs text-stone-500">
            {allJobs.length} {allJobs.length === 1 ? "visit" : "visits"}
          </p>
        </div>
      </div>

      {showSchedule ? (
        <Card>
          <h3 className="text-lg font-semibold text-green-950">Schedule</h3>
          <p className="mt-1 text-sm text-stone-500">
            Filter by company, employee, job, or status (green = completed, orange
            = pending), then click a day.
          </p>
          {allJobs.length === 0 ? (
            <p className="mt-4 text-sm text-stone-400">
              No jobs in this range to show on the calendar.
            </p>
          ) : (
            <ScheduleCalendar jobs={allJobs} />
          )}
        </Card>
      ) : null}

      {afterSummary}

      <Card id="weather-affected" className="scroll-mt-24">
        <h3 className="text-lg font-semibold text-green-950">
          Weather affected
        </h3>
        <p className="mt-1 text-sm text-stone-500">
          Search, then choose a weather category to review company details.
        </p>
        <WeatherAffectedTiles jobs={weatherAffected} />
      </Card>
    </div>
  );
}
