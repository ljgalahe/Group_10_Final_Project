"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, EmptyState, StatusBadge } from "@/components/ui";
import { ScheduleWeatherStrip } from "@/components/crew-lead/ScheduleWeatherStrip";
import { VisitWorkPanel } from "@/components/crew-lead/VisitWorkPanel";
import { CrewSiteNotes } from "@/components/crew-lead/CrewSiteNotes";
import type {
  ExtraWorkItem,
  ScheduleJob,
} from "@/components/crew-lead/schedule-types";
import { scheduleJobsToJobRows } from "@/components/crew-lead/scheduleJobsToJobRows";
import { loadVisitWorkState } from "@/components/crew-lead/crewLeadStorage";
import { ScheduleCalendar } from "@/components/visits/ScheduleCalendar";
import {
  coworkerNamesForJob,
  crewLeadNameForJob,
  estimatedDurationHours,
  mapsDirectionsUrl,
  scheduledArrivalForJob,
} from "@/lib/crew-member";
import { resolveMemberHours } from "@/lib/crew-hours";
import { DEMO_CREW_MEMBER } from "@/lib/types";

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

function JobCard({
  job,
  expanded,
  onToggle,
  extraWork,
}: {
  job: ScheduleJob;
  expanded: boolean;
  onToggle: () => void;
  extraWork: ExtraWorkItem[];
}) {
  const coworkers = coworkerNamesForJob(job.id);
  const duration = estimatedDurationHours(job.id);
  const arrival = scheduledArrivalForJob(job.id);
  const [yourHours, setYourHours] = useState(0);

  useEffect(() => {
    setYourHours(
      resolveMemberHours({
        visitId: job.id,
        status: job.status,
        memberId: DEMO_CREW_MEMBER.id,
        localState: loadVisitWorkState(job.id),
      })
    );
  }, [job.id, job.status]);

  return (
    <li className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-green-950">{job.customerName}</p>
          <p className="mt-1 text-sm text-stone-600">{job.address}</p>
          <p className="mt-2 text-sm text-stone-700">
            <span className="font-medium">Date:</span>{" "}
            {formatDisplayDate(job.scheduledDate)}
          </p>
          <p className="mt-1 text-sm text-stone-700">
            <span className="font-medium">Start:</span> {arrival}
            {" · "}
            <span className="font-medium">Est. duration:</span> {duration} hrs
          </p>
          <p className="mt-1 text-sm text-stone-700">
            <span className="font-medium">Your hours:</span>{" "}
            {yourHours > 0 ? `${yourHours.toFixed(1)} hrs` : "Not logged yet"}
          </p>
          <p className="mt-1 text-sm text-stone-700">
            <span className="font-medium">Crew lead:</span>{" "}
            {crewLeadNameForJob()}
          </p>
          <p className="mt-1 text-sm text-stone-700">
            <span className="font-medium">Other members:</span>{" "}
            {coworkers.length > 0 ? coworkers.join(", ") : "None"}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Planned services:{" "}
            {job.services.join(", ") || "General Maintenance"}
          </p>
          <div className="mt-2">
            <CrewSiteNotes notes={job.customerNotes} compact />
          </div>
        </div>
        <StatusBadge status={job.status} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={mapsDirectionsUrl(job.address)}
          target="_blank"
          rel="noreferrer"
          className="rounded-md bg-green-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
        >
          Get directions
        </a>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-md border border-green-800 px-3 py-1.5 text-xs font-medium text-green-900 hover:bg-green-50"
        >
          {expanded ? "Hide visit details" : "Open visit details"}
        </button>
      </div>

      {expanded ? (
        <VisitWorkPanel
          job={job}
          contractExtraWork={extraWork.filter(
            (item) => item.contractId === job.contractId
          )}
          readOnly
          showCustomerNotes={false}
        />
      ) : null}
    </li>
  );
}

/** Read-only schedule for crew members — same calendar/filter chrome as crew lead. */
export function CrewMemberSchedule({
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
  const todaysAssigned = jobs.filter((job) => job.scheduledDate === today);
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
            Today&apos;s Assigned Jobs
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Visits assigned to you today ({formatDisplayDate(today)}).
          </p>
        </div>

        <Card>
          {todaysAssigned.length === 0 ? (
            <p className="text-sm text-stone-500">
              No visits assigned to you today.
            </p>
          ) : (
            <ul className="max-h-[28rem] space-y-3 overflow-y-auto">
              {todaysAssigned.map((job) => (
                <JobCard
                  key={`today-${job.id}`}
                  job={job}
                  expanded={expandedJobId === `today-${job.id}`}
                  onToggle={() =>
                    setExpandedJobId((id) =>
                      id === `today-${job.id}` ? null : `today-${job.id}`
                    )
                  }
                  extraWork={extraWork}
                />
              ))}
            </ul>
          )}
        </Card>
      </section>

      <Card>
        <h3 className="text-lg font-semibold text-green-950">Schedule</h3>
        <p className="mt-1 text-sm text-stone-500">
          Filter by company, employee, job, or status (green = completed, orange
          = pending), then click a day. Only your assigned visits are shown.
        </p>
        {calendarJobs.length === 0 ? (
          <p className="mt-4 text-sm text-stone-400">
            No assigned jobs in this range to show on the calendar.
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
            {selectedJobs.length} visit{selectedJobs.length === 1 ? "" : "s"}
          </span>
        </div>
        {selectedJobs.length === 0 ? (
          <EmptyState message="No visits assigned to you on this day. Use the calendar filters and pick another day." />
        ) : (
          <ul className="space-y-3">
            {selectedJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                expanded={expandedJobId === job.id}
                onToggle={() =>
                  setExpandedJobId((id) => (id === job.id ? null : job.id))
                }
                extraWork={extraWork}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
