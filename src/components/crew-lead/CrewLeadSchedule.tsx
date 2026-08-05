"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, EmptyState, StatusBadge } from "@/components/ui";
import type {
  ExtraWorkItem,
  ScheduleJob,
} from "@/components/crew-lead/schedule-types";
import { normalizeServiceName } from "@/components/crew-lead/buildCrewSchedule";
import { VisitWorkPanel } from "@/components/crew-lead/VisitWorkPanel";
import { AssignedEmployeesList } from "@/components/crew-lead/AssignedEmployeesList";
import { ScheduleWeatherStrip } from "@/components/crew-lead/ScheduleWeatherStrip";

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

function monthLabel(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function RouteMap({ jobs }: { jobs: ScheduleJob[] }) {
  // Oxford, MS city bounds
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

function MonthCalendar({
  year,
  monthIndex,
  jobsByDate,
  selectedDate,
  today,
  onSelect,
}: {
  year: number;
  monthIndex: number;
  jobsByDate: Map<string, ScheduleJob[]>;
  selectedDate: string;
  today: string;
  onSelect: (date: string) => void;
}) {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const startWeekday = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-center text-sm font-semibold text-green-950">
        {monthLabel(year, monthIndex)}
      </h3>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-stone-500">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }
          const iso = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const count = jobsByDate.get(iso)?.length ?? 0;
          const isSelected = selectedDate === iso;
          const isToday = today === iso;

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              className={`aspect-square rounded-md border p-0.5 text-left transition ${
                isSelected
                  ? "border-green-800 bg-green-800 text-white"
                  : isToday
                    ? "border-green-600 bg-green-50 text-green-950"
                    : "border-stone-200 bg-white text-stone-800 hover:border-green-700"
              }`}
            >
              <span className="block text-[11px] font-semibold leading-none">
                {day}
              </span>
              {count > 0 ? (
                <span
                  className={`mt-1 block truncate text-[9px] leading-none ${
                    isSelected ? "text-green-100" : "text-green-800"
                  }`}
                >
                  {count} job{count === 1 ? "" : "s"}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </Card>
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
  const [customerId, setCustomerId] = useState("");
  const [service, setService] = useState("");
  const [selectedDate, setSelectedDate] = useState(today);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#todays-route") {
      document.getElementById("todays-route")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, []);

  const customers = useMemo(() => {
    const map = new Map<string, string>();
    for (const job of jobs) {
      map.set(job.customerId, `${job.customerName} (${job.customerIdShort})`);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [jobs]);

  const services = useMemo(() => {
    const map = new Map<string, string>();
    for (const job of jobs) {
      for (const raw of job.services) {
        const normalized = normalizeServiceName(raw);
        map.set(normalized.toLowerCase(), normalized);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [jobs]);

  const filtered = useMemo(() => {
    return jobs.filter((job) => {
      if (customerId && job.customerId !== customerId) return false;
      if (
        service &&
        !job.services.some(
          (s) => normalizeServiceName(s).toLowerCase() === service.toLowerCase()
        )
      ) {
        return false;
      }
      return true;
    });
  }, [jobs, customerId, service]);

  const todaysRoute = filtered.filter((job) => job.scheduledDate === today);

  const jobsByDate = useMemo(() => {
    const groups = new Map<string, ScheduleJob[]>();
    for (const job of filtered) {
      const list = groups.get(job.scheduledDate) ?? [];
      list.push(job);
      groups.set(job.scheduledDate, list);
    }
    return groups;
  }, [filtered]);

  const selectedJobs = jobsByDate.get(selectedDate) ?? [];

  const calendarMonths = useMemo(() => {
    const [y, m] = today.split("-").map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1));
    return [0, 1, 2].map((offset) => {
      const d = new Date(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + offset, 1)
      );
      return { year: d.getUTCFullYear(), monthIndex: d.getUTCMonth() };
    });
  }, [today]);

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
                No jobs on today&apos;s route for the current filters.
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
        <h2 className="text-lg font-semibold text-green-950">Filters</h2>
        <p className="mt-1 text-sm text-stone-500">
          Narrow the next 3 months of crew work by customer ID and service.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-stone-700">
              Customer ID
            </span>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-800"
            >
              <option value="">All customers</option>
              {customers.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-stone-700">
              Service being performed
            </span>
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-800"
            >
              <option value="">All services</option>
              {services.map((name) => (
                <option key={name.toLowerCase()} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <section>
        <div className="mb-3">
          <h2 className="text-2xl font-bold text-green-950">
            3-Month Calendar
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Select a day to see jobs ({filtered.length} total in range).
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {calendarMonths.map(({ year, monthIndex }) => (
            <MonthCalendar
              key={`${year}-${monthIndex}`}
              year={year}
              monthIndex={monthIndex}
              jobsByDate={jobsByDate}
              selectedDate={selectedDate}
              today={today}
              onSelect={setSelectedDate}
            />
          ))}
        </div>

        <Card className="mt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-green-950">
              {formatDisplayDate(selectedDate)}
            </h3>
            <span className="text-xs text-stone-500">
              {selectedJobs.length} job{selectedJobs.length === 1 ? "" : "s"}
            </span>
          </div>
          {selectedJobs.length === 0 ? (
            <EmptyState message="No jobs scheduled on this day for the current filters." />
          ) : (
            <ul className="space-y-4">
              {selectedJobs.map((job) => {
                const open = expandedJobId === `cal-${job.id}`;
                return (
                  <li
                    key={job.id}
                    className="rounded-lg border border-stone-200 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-green-950">
                          {job.customerName}
                        </p>
                        <p className="text-sm text-stone-500">
                          ID …{job.customerIdShort} · {job.contractTitle}
                        </p>
                        <p className="mt-1 text-sm text-stone-600">
                          {job.address}
                        </p>
                        <p className="mt-1 text-xs text-stone-500">
                          Services:{" "}
                          {job.services.length > 0
                            ? job.services.join(", ")
                            : "General Maintenance"}
                        </p>
                        <AssignedEmployeesList
                          jobId={job.id}
                          status={job.status}
                          services={job.services}
                        />
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
                      <div className="flex items-center gap-2">
                        <StatusBadge status={job.status} />
                        {job.source === "projected" ? (
                          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-stone-600">
                            Planned
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {open ? (
                      <VisitWorkPanel
                        job={job}
                        contractExtraWork={extraWork.filter(
                          (item) => item.contractId === job.contractId
                        )}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
