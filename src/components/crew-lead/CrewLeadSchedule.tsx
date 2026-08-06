"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CrewSiteNotes } from "@/components/crew-lead/CrewSiteNotes";
import { ScheduleWeatherStrip } from "@/components/crew-lead/ScheduleWeatherStrip";
import type {
  ExtraWorkItem,
  ScheduleJob,
} from "@/components/crew-lead/schedule-types";
import { VisitWorkPanel } from "@/components/crew-lead/VisitWorkPanel";
import { ServiceHoldBadge } from "@/components/ServiceHoldBanner";
import { Card, EmptyState, StatusBadge } from "@/components/ui";
import { ScheduleCalendar } from "@/components/visits/ScheduleCalendar";
import {
  fetchRoadRoute,
  formatDriveSummary,
  orderStopsFromYard,
  selectEconomicalStops,
  type RoadRouteResult,
} from "@/lib/crew-route";
import {
  CREW_LEAD_OPTIONS,
  CREW_LEADS,
  DEMO_YARD,
  crewForCustomer,
  crewLabel,
  employeesForCrew,
  type DemoCrewId,
} from "@/lib/demo-org";
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

function jobsForCrew(jobs: ScheduleJob[], crew: DemoCrewId): ScheduleJob[] {
  return jobs.filter(
    (job) =>
      crewForCustomer(job.customerId, job.customerName) === crew
  );
}

/** One map/drive stop per property; keep all visit cards under that stop. */
function groupJobsBySite(jobs: ScheduleJob[]): ScheduleJob[][] {
  const groups = new Map<string, ScheduleJob[]>();
  for (const job of jobs) {
    const key = `${job.customerId}:${job.lat.toFixed(4)},${job.lng.toFixed(4)}`;
    const list = groups.get(key) ?? [];
    list.push(job);
    groups.set(key, list);
  }
  return Array.from(groups.values());
}

function planCrewDayRoute(jobs: ScheduleJob[]): ScheduleJob[][] {
  const siteGroups = groupJobsBySite(jobs);
  const selected = selectEconomicalStops(
    siteGroups.map((group) => ({
      id: group[0].id,
      lat: group[0].lat,
      lng: group[0].lng,
      group,
    }))
  );
  const ordered = orderStopsFromYard(selected);
  return ordered.map((s) => s.group);
}

type RouteMapProps = {
  stops: ScheduleJob[];
  roadRoute: RoadRouteResult | null;
  routeLoading: boolean;
};

/** Yard start + stop pins + OSRM road polyline. */
function RouteMap({ stops, roadRoute, routeLoading }: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const stopsKey = stops.map((job) => job.id).join("|");
  const routeKey = roadRoute
    ? `${roadRoute.distanceMeters.toFixed(0)}:${roadRoute.coordinates.length}`
    : "none";

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

      const yardIcon = L.divIcon({
        className: "",
        html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">
          <span style="background:#92400e;color:#fff;border:2px solid #fff;border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700;box-shadow:0 1px 3px rgba(0,0,0,.35);white-space:nowrap;">Yard</span>
          <span style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #92400e;margin-top:1px;"></span>
        </div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

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

      const latLngs: L.LatLngExpression[] = [
        [DEMO_YARD.lat, DEMO_YARD.lng],
      ];

      L.marker([DEMO_YARD.lat, DEMO_YARD.lng], {
        icon: yardIcon,
        title: `${DEMO_YARD.name} — ${DEMO_YARD.address}`,
        zIndexOffset: 500,
      })
        .bindPopup(
          `<strong>${DEMO_YARD.name}</strong><br/>${DEMO_YARD.address}<br/><em>Dispatch start</em>`
        )
        .addTo(map);

      stops.forEach((job, index) => {
        latLngs.push([job.lat, job.lng]);
        L.marker([job.lat, job.lng], {
          icon: numberedIcon(String(index + 1)),
          title: `${index + 1}. ${job.customerName} — ${job.address}`,
        })
          .bindPopup(
            `<strong>${index + 1}. ${job.customerName}</strong><br/>${job.address}`
          )
          .addTo(map);
      });

      if (roadRoute?.coordinates?.length) {
        L.polyline(roadRoute.coordinates, {
          color: "#166534",
          weight: 5,
          opacity: 0.85,
          lineJoin: "round",
        }).addTo(map);
      } else if (stops.length > 0) {
        const fallback: L.LatLngExpression[] = [
          [DEMO_YARD.lat, DEMO_YARD.lng],
          ...stops.map((j) => [j.lat, j.lng] as L.LatLngExpression),
        ];
        L.polyline(fallback, {
          color: "#166534",
          weight: 3,
          opacity: 0.45,
          dashArray: "8 8",
        }).addTo(map);
      }

      if (latLngs.length === 1) {
        map.setView(latLngs[0], 13);
      } else {
        map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40] });
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
  }, [stopsKey, routeKey]);

  return (
    <div className="relative overflow-hidden rounded-lg border border-stone-200">
      <div ref={mapRef} className="h-72 w-full sm:h-80" />
      {routeLoading ? (
        <p className="pointer-events-none absolute bottom-2 left-2 z-[1000] rounded bg-white/90 px-2 py-1 text-xs text-stone-600 shadow">
          Loading road route…
        </p>
      ) : null}
      {stops.length === 0 ? (
        <p className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center bg-white/70 text-sm text-stone-600">
          No stops for this crew today.
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
  const [selectedCrew, setSelectedCrew] = useState<DemoCrewId>("A");
  const [roadRoute, setRoadRoute] = useState<RoadRouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

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
  const todaysJobsAll = useMemo(
    () => jobs.filter((job) => job.scheduledDate === today),
    [jobs, today]
  );

  const todaysRouteStops = useMemo(() => {
    const crewJobs = jobsForCrew(todaysJobsAll, selectedCrew);
    return planCrewDayRoute(crewJobs);
  }, [todaysJobsAll, selectedCrew]);

  const mapStops = useMemo(
    () => todaysRouteStops.map((group) => group[0]),
    [todaysRouteStops]
  );

  const dayRoster = useMemo(
    () => employeesForCrew(selectedCrew, { dateIso: today }),
    [selectedCrew, today]
  );

  const visitParty = useMemo(
    () =>
      employeesForCrew(selectedCrew, { dateIso: today, forVisit: true }),
    [selectedCrew, today]
  );

  const leadName = CREW_LEADS[selectedCrew];
  const driveSummary = formatDriveSummary(roadRoute);

  useEffect(() => {
    let cancelled = false;
    const waypoints = [
      { lat: DEMO_YARD.lat, lng: DEMO_YARD.lng },
      ...mapStops.map((j) => ({ lat: j.lat, lng: j.lng })),
    ];

    if (waypoints.length < 2) {
      setRoadRoute(null);
      setRouteLoading(false);
      return;
    }

    setRouteLoading(true);
    void fetchRoadRoute(waypoints).then((result) => {
      if (cancelled) return;
      setRoadRoute(result);
      setRouteLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [mapStops]);

  const selectedJobs = jobs.filter((job) => {
    if (job.scheduledDate !== selectedDate) return false;
    if (filteredVisitIds && !filteredVisitIds.has(job.id)) return false;
    return true;
  });

  const crewSiteCount = groupJobsBySite(
    jobsForCrew(todaysJobsAll, selectedCrew)
  ).length;
  const droppedForEconomy = Math.max(0, crewSiteCount - todaysRouteStops.length);

  return (
    <div className="space-y-6">
      <ScheduleWeatherStrip today={today} />

      <section id="todays-route" className="scroll-mt-4">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-green-950">
              Today&apos;s Route
            </h2>
          </div>
          <label className="flex flex-col gap-1 text-sm text-stone-700">
            <span className="font-medium text-green-950">Crew lead</span>
            <select
              value={selectedCrew}
              onChange={(e) => setSelectedCrew(e.target.value as DemoCrewId)}
              className="min-w-[14rem] rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-green-950 shadow-sm focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700"
            >
              {CREW_LEAD_OPTIONS.map((opt) => (
                <option key={opt.crew} value={opt.crew}>
                  {opt.name} — {crewLabel(opt.crew)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mb-4 grid gap-3 rounded-lg border border-amber-200/80 bg-amber-50/60 px-4 py-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/70">
              Dispatch yard
            </p>
            <p className="mt-0.5 font-medium text-green-950">{DEMO_YARD.name}</p>
            <p className="text-sm text-stone-600">{DEMO_YARD.address}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/70">
              {leadName} · {crewLabel(selectedCrew)} today
            </p>
            <p className="mt-0.5 text-sm text-stone-700">
              {todaysRouteStops.length} stop
              {todaysRouteStops.length === 1 ? "" : "s"}
              {driveSummary ? ` · ${driveSummary}` : ""}
              {droppedForEconomy > 0
                ? ` · ${droppedForEconomy} farther site${droppedForEconomy === 1 ? "" : "s"} held for another day for economy`
                : ""}
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3">
          <h3 className="text-sm font-semibold text-green-950">
            Crew Assigned Today
          </h3>
          <p className="mt-0.5 text-xs text-stone-500">
            Full day roster for {leadName}. Working party on each stop typically
            includes the lead plus field staff.
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {dayRoster.map((member) => (
              <li
                key={member.id}
                className={`rounded-md border px-2.5 py-1 text-xs ${
                  member.role === "Crew lead"
                    ? "border-green-800 bg-green-800 text-white"
                    : "border-stone-200 bg-white text-stone-700"
                }`}
              >
                <span className="font-medium">{member.name}</span>
                <span
                  className={
                    member.role === "Crew lead"
                      ? " text-green-100"
                      : " text-stone-500"
                  }
                >
                  {" "}
                  · {member.role}
                </span>
              </li>
            ))}
          </ul>
          {visitParty.length > 0 && visitParty.length < dayRoster.length ? (
            <p className="mt-2 text-xs text-stone-500">
              Typical stop party:{" "}
              {visitParty.map((m) => m.name).join(", ")}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h3 className="text-lg font-semibold text-green-950">
              Optimized Stops
            </h3>
            <p className="mt-1 text-xs text-stone-500">
              Jobs clustered near each other and ordered from the yard for the
              shortest practical drive.
            </p>
            {todaysRouteStops.length === 0 ? (
              <p className="mt-3 text-sm text-stone-500">
                No jobs on {leadName}&apos;s route today.
              </p>
            ) : (
              <ol className="mt-3 max-h-[28rem] space-y-3 overflow-y-auto">
                <li className="rounded-lg border border-amber-200 bg-amber-50/80 p-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-800 text-[10px] font-bold uppercase text-white">
                      Y
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-green-950">
                        {DEMO_YARD.name}
                      </p>
                      <p className="text-sm text-stone-600">
                        {DEMO_YARD.address}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        Start — load equipment &amp; depart
                      </p>
                    </div>
                  </div>
                </li>
                {todaysRouteStops.map((group, index) => {
                  const primary = group[0];
                  const open = expandedJobId === primary.id;
                  return (
                    <li
                      key={primary.id}
                      className="rounded-lg border border-stone-200 bg-stone-50 p-3"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-800 text-xs font-bold text-white">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-green-950">
                              {primary.customerName}
                            </p>
                            {primary.serviceHold ? (
                              <ServiceHoldBadge onHold />
                            ) : null}
                          </div>
                          <p className="text-sm text-stone-600">
                            {primary.address}
                          </p>
                          <ul className="mt-1 space-y-0.5 text-xs text-stone-500">
                            {group.map((job) => (
                              <li key={job.id}>
                                {job.services.join(", ") ||
                                  job.contractTitle ||
                                  "General Maintenance"}{" "}
                                · ID …{job.customerIdShort}
                              </li>
                            ))}
                          </ul>
                          <p className="mt-1 text-xs text-stone-600">
                            <span className="font-semibold text-stone-800">
                              Assigned crew:
                            </span>{" "}
                            {visitParty.map((m) => m.name).join(", ")}
                          </p>
                          <CrewSiteNotes
                            notes={primary.customerNotes}
                            compact
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedJobId(open ? null : primary.id)
                            }
                            className="mt-2 text-xs font-semibold text-green-800 hover:underline"
                          >
                            {open ? "Hide Visit Details" : "Open Visit Details"}
                          </button>
                          {open ? (
                            <VisitWorkPanel
                              job={primary}
                              contractExtraWork={extraWork.filter(
                                (item) =>
                                  item.contractId === primary.contractId
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
              Road Route Map
            </h3>
            <p className="mt-1 text-xs text-stone-500">
              Brown pin = yard start. Green numbers = stop order. Line follows
              actual roads (OSRM).
            </p>
            <div className="mt-3">
              <RouteMap
                stops={mapStops}
                roadRoute={roadRoute}
                routeLoading={routeLoading}
              />
            </div>
          </Card>
        </div>
      </section>

      <Card>
        <h3 className="text-lg font-semibold text-green-950">Schedule</h3>
        {calendarJobs.length === 0 ? (
          <p className="mt-4 text-sm text-stone-400">
            No jobs in this range to show on the calendar.
          </p>
        ) : (
          <ScheduleCalendar
            jobs={calendarJobs}
            hidePay
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
              const jobCrew = crewForCustomer(job.customerId, job.customerName);

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
                        {job.serviceHold ? <ServiceHoldBadge onHold /> : null}
                        {jobCrew ? (
                          <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-green-900">
                            {CREW_LEADS[jobCrew]} · {crewLabel(jobCrew)}
                          </span>
                        ) : null}
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
