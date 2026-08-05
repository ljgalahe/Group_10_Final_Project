"use client";

import { useEffect, useMemo, useState } from "react";
import { AssignedEmployeesList } from "@/components/crew-lead/AssignedEmployeesList";
import { CrewSiteNotes } from "@/components/crew-lead/CrewSiteNotes";
import { ScheduleWeatherStrip } from "@/components/crew-lead/ScheduleWeatherStrip";
import type {
  ExtraWorkItem,
  ScheduleJob,
} from "@/components/crew-lead/schedule-types";
import { VisitWorkPanel } from "@/components/crew-lead/VisitWorkPanel";
import { Card, EmptyState, StatusBadge } from "@/components/ui";
import { ScheduleCalendar } from "@/components/visits/ScheduleCalendar";
import { SCHEDULE_CREW, crewPayTotal, generateDailySampleJobs } from "@/lib/visit-demo";
import type { JobRow } from "@/lib/visit-jobs";

function formatDisplayDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function scheduleJobsToJobRows(jobs: ScheduleJob[]): JobRow[] {
  const samples = new Map(
    generateDailySampleJobs().map((j) => [j.visitId, j] as const)
  );
  return jobs.map((job) => {
    const overlay = SCHEDULE_CREW[job.id];
    const sample = samples.get(job.id);
    const crew = overlay?.crew ?? sample?.crew ?? [];
    return {
      visitId: job.id,
      companyName: job.customerName,
      location: job.address,
      jobLabel:
        overlay?.jobLabel ??
        sample?.jobLabel ??
        (job.services.length > 0
          ? job.services.join(", ")
          : job.contractTitle),
      date: job.scheduledDate,
      status: job.status,
      crew,
      crewPay: crew.length ? crewPayTotal(crew) : (sample?.crewPay ?? 0),
      costTotal: sample?.costTotal ?? 0,
      weather: sample?.weather ?? null,
      proof: sample?.proof ?? null,
    };
  });
}

function RouteMap({ jobs }: { jobs: ScheduleJob[] }) {
  const oxfordMinLat = 34.34;
  const oxfordMaxLat = 34.39;
  const oxfordMinLng = -89.56;
  const oxfordMaxLng = -89.48;

  const lats = jobs.map((j) => j.lat);
  const lngs = jobs.map((j) => j.lng);
  const minLat = jobs.length
    ? Math.min(oxfordMinLat, ...lats) - 0.01
    : oxfordMinLat;
  const maxLat = jobs.length
    ? Math.max(oxfordMaxLat, ...lats) + 0.01
    : oxfordMaxLat;
  const minLng = jobs.length
    ? Math.min(oxfordMinLng, ...lngs) - 0.01
    : oxfordMinLng;
  const maxLng = jobs.length
    ? Math.max(oxfordMaxLng, ...lngs) + 0.01
    : oxfordMaxLng;

  const project = (lat: number, lng: number) => {
    const x = ((lng - minLng) / (maxLng - minLng || 1)) * 100;
    const y = ((maxLat - lat) / (maxLat - minLat || 1)) * 100;
    return { x, y };
  };

  const centerLat = 34.3665;
  const centerLng = -89.5192;
  const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${centerLat}%2C${centerLng}`;

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-stone-200">
        <iframe
          title="Oxford Mississippi route map"
          src={osmUrl}
          className="h-52 w-full border-0"
          loading="lazy"
        />
      </div>
      <div className="relative h-48 overflow-hidden rounded-lg border border-emerald-900/20 bg-gradient-to-br from-emerald-50 via-stone-100 to-sky-50">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(120,113,108,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(120,113,108,0.15) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <p className="absolute left-3 top-3 text-xs font-semibold uppercase tracking-wide text-emerald-900/70">
          Oxford, MS route pins
        </p>
        {jobs.length === 0 ? (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-stone-500">
            No stops mapped for today.
          </p>
        ) : (
          jobs.map((job, index) => {
            const { x, y } = project(job.lat, job.lng);
            return (
              <div
                key={job.id}
                className="absolute -translate-x-1/2 -translate-y-full"
                style={{ left: `${x}%`, top: `${y}%` }}
                title={`${job.customerName} — ${job.address}`}
              >
                <div className="flex flex-col items-center">
                  <span className="rounded-full bg-green-800 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                    {index + 1}
                  </span>
                  <span className="mt-0.5 h-0 w-0 border-x-4 border-x-transparent border-t-[6px] border-t-green-800" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function CrewLeadSchedule({
  jobs,
  today,
  extraWork = [],
}: {
  jobs: ScheduleJob[];
  today: string;
  extraWork?: ExtraWorkItem[];
}) {
  const [selectedDate, setSelectedDate] = useState(today);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [filteredVisitIds, setFilteredVisitIds] = useState<Set<string> | null>(
    null
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#todays-route") {
      document.getElementById("todays-route")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, []);

  const calendarJobs = useMemo(() => scheduleJobsToJobRows(jobs), [jobs]);
  const todaysRoute = jobs.filter((job) => job.scheduledDate === today);
  const selectedJobs = jobs.filter((job) => {
    if (job.scheduledDate !== selectedDate) return false;
    if (filteredVisitIds && !filteredVisitIds.has(job.id)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <ScheduleWeatherStrip today={today} />

      <section id="todays-route" className="scroll-mt-4">
        <div className="mb-3">
          <h2 className="text-2xl font-bold text-green-950">Today&apos;s Route</h2>
          <p className="mt-1 text-sm text-stone-600">
            Jobs expected today ({formatDisplayDate(today)}) around Oxford,
            Mississippi.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h3 className="text-lg font-semibold text-green-950">
              Today&apos;s stops
            </h3>
            {todaysRoute.length === 0 ? (
              <p className="mt-3 text-sm text-stone-500">
                No jobs on today&apos;s route.
              </p>
            ) : (
              <ol className="mt-3 max-h-[28rem] space-y-3 overflow-y-auto">
                {todaysRoute.map((job, index) => {
                  const open = expandedJobId === job.id;
                  return (
                    <li
                      key={job.id}
                      className="rounded-lg border border-stone-200 bg-stone-50 p-3"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-800 text-xs font-bold text-white">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-green-950">
                            {job.customerName}
                          </p>
                          <p className="text-sm text-stone-600">{job.address}</p>
                          <p className="mt-1 text-xs text-stone-500">
                            {job.services.join(", ") || "General Maintenance"} ·
                            ID …{job.customerIdShort}
                          </p>
                          <AssignedEmployeesList
                            jobId={job.id}
                            status={job.status}
                            services={job.services}
                          />
                          <CrewSiteNotes
                            customerId={job.customerId}
                            compact
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedJobId(open ? null : job.id)
                            }
                            className="mt-2 text-xs font-semibold text-green-800 hover:underline"
                          >
                            {open ? "Hide Visit Details" : "Open Visit Details"}
                          </button>
                          {open ? (
                            <VisitWorkPanel
                              job={job}
                              contractExtraWork={extraWork.filter(
                                (item) => item.contractId === job.contractId
                              )}
                              variant="planning"
                            />
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-green-950">
              Oxford, MS map
            </h3>
            <p className="mt-1 text-sm text-stone-500">
              Today&apos;s stops plotted around Oxford.
            </p>
            <div className="mt-3">
              <RouteMap jobs={todaysRoute} />
            </div>
          </Card>
        </div>
      </section>

      <Card>
        <h3 className="text-lg font-semibold text-green-950">Schedule</h3>
        <p className="mt-1 text-sm text-stone-500">
          Filter by company, employee, job, or status (green = completed, orange
          = pending), then click a day.
        </p>
        {calendarJobs.length === 0 ? (
          <p className="mt-4 text-sm text-stone-400">
            No jobs in this range to show on the calendar.
          </p>
        ) : (
          <ScheduleCalendar
            jobs={calendarJobs}
            onDateChange={(date) => {
              if (date) setSelectedDate(date);
            }}
            onFilteredJobsChange={(filtered) => {
              setFilteredVisitIds(new Set(filtered.map((j) => j.visitId)));
            }}
          />
        )}
      </Card>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-green-950">
            {formatDisplayDate(selectedDate)}
          </h3>
          <span className="text-xs text-stone-500">
            {selectedJobs.length} job{selectedJobs.length === 1 ? "" : "s"}
          </span>
        </div>
        {selectedJobs.length === 0 ? (
          <EmptyState message="No jobs scheduled on this day. Use the calendar filters and pick another day." />
        ) : (
          <ul className="space-y-3">
            {selectedJobs.map((job) => {
              const open = expandedJobId === `cal-${job.id}`;
              const serviceLabel =
                job.services.length > 0
                  ? job.services.join(", ")
                  : "General Maintenance";
              const showSeparateServices =
                serviceLabel.toLowerCase() !==
                job.contractTitle.trim().toLowerCase();

              return (
                <li
                  key={job.id}
                  className="rounded-lg border border-stone-200 px-4 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-green-950">
                          {job.customerName}
                        </p>
                        <StatusBadge status={job.status} />
                        {job.source === "projected" ? (
                          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-stone-600">
                            Planned
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-stone-600">
                        {job.contractTitle}
                        {showSeparateServices ? ` · ${serviceLabel}` : null}
                      </p>
                      <p className="mt-0.5 text-sm text-stone-500">
                        {job.address}
                      </p>
                      <CrewSiteNotes customerId={job.customerId} compact />
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedJobId(open ? null : `cal-${job.id}`)
                        }
                        className="mt-2 text-xs font-semibold text-green-800 hover:underline"
                      >
                        {open ? "Hide Visit Details" : "Open Visit Details"}
                      </button>
                    </div>
                  </div>
                  {open ? (
                    <VisitWorkPanel
                      job={job}
                      contractExtraWork={extraWork.filter(
                        (item) => item.contractId === job.contractId
                      )}
                      variant="planning"
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
