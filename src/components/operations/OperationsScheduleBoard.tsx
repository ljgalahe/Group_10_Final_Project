"use client";

import { useMemo } from "react";
import {
  autoGroupVisitsByLocation,
  createServiceVisit,
  rescheduleServiceVisit,
} from "@/app/actions/operations-schedule";
import { Card, StatusBadge } from "@/components/ui";
import { ScheduleCalendar } from "@/components/visits/ScheduleCalendar";
import { locationKey } from "@/lib/location-group";
import {
  filterJobsNeedingReschedule,
  isPersistedVisitId,
  missReasonForJob,
} from "@/lib/needs-reschedule";
import type { JobRow } from "@/lib/visit-jobs";
import { DEMO_CREW_LEADS } from "@/lib/types";

export type OpsVisitRow = {
  id: string;
  scheduled_date: string;
  status: string;
  visit_kind: string | null;
  crew_lead_name: string | null;
  contract_id: string;
  contract_title: string;
  customer_name: string;
  address: string | null;
};

export type OpsContractOption = {
  id: string;
  title: string;
  customer_name: string;
};

function opsVisitsToJobRows(visits: OpsVisitRow[]): JobRow[] {
  return visits.map((v) => ({
    visitId: v.id,
    companyName: v.customer_name,
    location: v.address ?? "—",
    jobLabel: v.contract_title,
    date: v.scheduled_date,
    status: v.status,
    crew: v.crew_lead_name
      ? [
          {
            name: v.crew_lead_name,
            role: "Crew Lead",
            hours: 0,
            payRate: 0,
          },
        ]
      : [],
    crewPay: 0,
    costTotal: 0,
    weather: null,
    proof: null,
  }));
}

export function OperationsScheduleBoard({
  visits,
  contracts,
  today,
  /** Same JobRow set as Visits / calendar (buildJobRows) — source of truth for Needs Rescheduling. */
  calendarJobs: calendarJobsProp,
}: {
  visits: OpsVisitRow[];
  contracts: OpsContractOption[];
  today: string;
  calendarJobs?: JobRow[];
}) {
  const calendarJobs = useMemo(
    () => calendarJobsProp ?? opsVisitsToJobRows(visits),
    [calendarJobsProp, visits]
  );

  const visitById = useMemo(() => {
    const map = new Map<string, OpsVisitRow>();
    for (const v of visits) map.set(v.id, v);
    return map;
  }, [visits]);

  // Same definition + JobRow set as Operations Dashboard needsRescheduleCount.
  const needsReschedule = useMemo(
    () => filterJobsNeedingReschedule(calendarJobs, today),
    [calendarJobs, today]
  );

  const needsIds = useMemo(
    () => new Set(needsReschedule.map((j) => j.visitId)),
    [needsReschedule]
  );

  const clusters = useMemo(() => {
    const map = new Map<string, OpsVisitRow[]>();
    for (const v of visits.filter(
      (x) => x.status === "scheduled" && !needsIds.has(x.id)
    )) {
      const key = locationKey(v.address);
      const list = map.get(key) ?? [];
      list.push(v);
      map.set(key, list);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [visits, needsIds]);

  const unassigned = visits.filter(
    (v) =>
      v.status === "scheduled" && !needsIds.has(v.id) && !v.crew_lead_name
  );

  return (
    <div className="space-y-6">
      {/* Same Schedule card Manager Visits used (VisitsSummaryBlocks + ScheduleCalendar). */}
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
          <ScheduleCalendar jobs={calendarJobs} />
        )}
      </Card>

      <Card
        id="needs-rescheduling"
        className="scroll-mt-24 border-amber-300 bg-amber-50/50"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-green-950">
              Needs Rescheduling
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              Same visit set as the Operations Dashboard count — overdue
              scheduled, cancelled/missed, and weather delays or reschedules from
              the shared schedule job rows.
            </p>
          </div>
          <span className="rounded-full bg-amber-200 px-3 py-1 text-sm font-semibold text-amber-950">
            {needsReschedule.length}
          </span>
        </div>

        {needsReschedule.length === 0 ? (
          <p className="mt-4 text-sm text-stone-500">
            No missed or cancelled visits waiting to be rescheduled.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {needsReschedule.map((job) => {
              const live = visitById.get(job.visitId);
              const crewLead =
                live?.crew_lead_name ??
                job.crew.find((m) => /lead/i.test(m.role))?.name ??
                job.crew[0]?.name ??
                null;
              const canReschedule = isPersistedVisitId(job.visitId);
              return (
                <li
                  key={job.visitId}
                  className="rounded-lg border border-amber-200 bg-white px-4 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-green-950">
                        {job.companyName}
                      </p>
                      <p className="text-sm text-stone-600">{job.jobLabel}</p>
                      <p className="mt-1 text-xs text-stone-500">
                        Original date {job.date}
                        {job.location ? ` · ${job.location}` : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge status={job.status} />
                        <span className="text-xs font-medium text-amber-900">
                          {missReasonForJob(job, today)}
                        </span>
                      </div>
                    </div>
                    {canReschedule ? (
                      <form
                        action={rescheduleServiceVisit}
                        className="flex flex-wrap items-end gap-2"
                      >
                        <input type="hidden" name="visit_id" value={job.visitId} />
                        <label className="text-xs text-stone-600">
                          New date
                          <input
                            type="date"
                            name="scheduled_date"
                            required
                            defaultValue={today}
                            className="mt-1 block rounded border border-stone-300 px-2 py-1 text-sm"
                          />
                        </label>
                        <label className="text-xs text-stone-600">
                          Crew Lead
                          <select
                            name="crew_lead_name"
                            defaultValue={crewLead || DEMO_CREW_LEADS[0]}
                            className="mt-1 block rounded border border-stone-300 px-2 py-1 text-sm"
                          >
                            {DEMO_CREW_LEADS.map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="submit"
                          className="rounded bg-amber-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
                        >
                          Reschedule
                        </button>
                      </form>
                    ) : (
                      <p className="max-w-xs text-xs text-stone-500">
                        Sample schedule row — create or assign a live visit above
                        to place a makeup date on the board.
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-green-950">
          Efficient Same-Day Routing
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Groups unassigned visits by location (ZIP / city) onto one day with one
          Crew Lead — prefer nearby properties together.
        </p>
        <form
          action={autoGroupVisitsByLocation}
          className="mt-4 flex flex-wrap items-end gap-3"
        >
          <label className="text-sm">
            <span className="text-stone-600">Target date</span>
            <input
              type="date"
              name="target_date"
              required
              defaultValue={today}
              className="mt-1 block rounded-md border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="text-stone-600">Crew Lead</span>
            <select
              name="crew_lead_name"
              className="mt-1 block rounded-md border border-stone-300 px-3 py-2"
              defaultValue={DEMO_CREW_LEADS[0]}
            >
              {DEMO_CREW_LEADS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-md bg-green-900 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
          >
            Auto-group largest cluster ({unassigned.length} unassigned)
          </button>
        </form>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {clusters.slice(0, 6).map(([key, list]) => (
            <div
              key={key}
              className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
            >
              <p className="font-medium text-green-950">Area {key}</p>
              <p className="text-stone-600">
                {list.length} visit{list.length === 1 ? "" : "s"}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-green-950">
          Create Service Visit
        </h2>
        <form
          action={createServiceVisit}
          className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <label className="text-sm sm:col-span-2">
            <span className="text-stone-600">Contract</span>
            <select
              name="contract_id"
              required
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
              defaultValue=""
            >
              <option value="" disabled>
                Select contract
              </option>
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.customer_name} — {c.title}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-stone-600">Date</span>
            <input
              type="date"
              name="scheduled_date"
              required
              defaultValue={today}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="text-stone-600">Crew Lead</span>
            <select
              name="crew_lead_name"
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
              defaultValue={DEMO_CREW_LEADS[0]}
            >
              {DEMO_CREW_LEADS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <input type="hidden" name="visit_kind" value="service" />
          <div className="sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              className="rounded-md bg-green-900 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
            >
              Schedule visit
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
