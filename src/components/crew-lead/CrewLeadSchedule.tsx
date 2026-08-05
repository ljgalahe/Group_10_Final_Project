"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type L from "leaflet";
import "leaflet/dist/leaflet.css";
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
import {
  SCHEDULE_CREW,
  crewPayTotal,
  generateDailySampleJobs,
} from "@/lib/visit-demo";
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

/** OpenStreetMap with today's stop pins only (no route line). */
function StopsMap({ jobs }: { jobs: ScheduleJob[] }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const stopsKey = jobs.map((job) => job.id).join("|");

  useEffect(() => {
    let cancelled = false;

    async function setupMap() {
      const L = (await import("leaflet")).default;

      if (cancelled || !mapRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapRef.current, {
        scrollWheelZoom: false,
        zoomControl: true,
      });
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const numberedIcon = (label: string) =>
        L.divIcon({
          className: "",
          html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">
            <span style="background:#166534;color:#fff;border:2px solid #fff;border-radius:9999px;padding:2px 7px;font-size:11px;font-weight:700;box-shadow:0 1px 3px rgba(0,0,0,.35);white-space:nowrap;">${label}</span>
            <span style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid #166534;margin-top:1px;"></span>
          </div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

      const latLngs: L.LatLngExpression[] = [];

      jobs.forEach((job, index) => {
        latLngs.push([job.lat, job.lng]);
        L.marker([job.lat, job.lng], {
          icon: numberedIcon(String(index + 1)),
          title: `${index + 1}. ${job.customerName} — ${job.address}`,
        }).addTo(map);
      });

      if (latLngs.length === 0) {
        map.setView([34.3665, -89.5192], 13);
      } else if (latLngs.length === 1) {
        map.setView(latLngs[0], 14);
      } else {
        map.fitBounds(L.latLngBounds(latLngs), { padding: [36, 36] });
      }

      window.setTimeout(() => map.invalidateSize(), 80);
    }

    void setupMap();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopsKey]);

  return (
    <div className="relative overflow-hidden rounded-lg border border-stone-200">
      <div ref={mapRef} className="h-72 w-full sm:h-80" />
      {jobs.length === 0 ? (
        <p className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center bg-white/70 text-sm text-stone-600">
          No stops mapped for today.
        </p>
      ) : null}
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
  const todaysRoute = useMemo(
    () => jobs.filter((job) => job.scheduledDate === today),
    [jobs, today]
  );
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
          <h2 className="text-2xl font-bold text-green-950">
            Today&apos;s Route
          </h2>
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
                            notes={job.customerNotes}
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
            <div className="mt-3">
              <StopsMap jobs={todaysRoute} />
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
                      <CrewSiteNotes notes={job.customerNotes} compact />
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedJobId(open ? null : `cal-${job.id}`)
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
          </ul>
        )}
      </Card>
    </div>
  );
}
