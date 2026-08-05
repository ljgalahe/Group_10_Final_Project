"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, EmptyState, StatusBadge } from "@/components/ui";
import { ScheduleWeatherStrip } from "@/components/crew-lead/ScheduleWeatherStrip";
import { VisitWorkPanel } from "@/components/crew-lead/VisitWorkPanel";
import { CrewSiteNotes } from "@/components/crew-lead/CrewSiteNotes";
import { addDays } from "@/components/crew-lead/dateHelpers";
import type {
  ExtraWorkItem,
  ScheduleJob,
} from "@/components/crew-lead/schedule-types";
import {
  coworkerNamesForJob,
  crewLeadNameForJob,
  estimatedDurationHours,
  mapsDirectionsUrl,
  scheduledArrivalForJob,
} from "@/lib/crew-member";

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

function weekDates(anchor: string): string[] {
  const [y, m, d] = anchor.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay();
  const sunday = addDays(anchor, -day);
  return Array.from({ length: 7 }, (_, i) => addDays(sunday, i));
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
            <CrewSiteNotes customerId={job.customerId} compact />
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
        />
      ) : null}
    </li>
  );
}

/** Read-only day/week schedule for crew members (assigned visits only). */
export function CrewMemberSchedule({
  jobs,
  today,
  extraWork = [],
}: {
  jobs: ScheduleJob[];
  today: string;
  extraWork?: ExtraWorkItem[];
}) {
  const [view, setView] = useState<"day" | "week">("day");
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

  const week = useMemo(() => weekDates(selectedDate), [selectedDate]);

  const visibleJobs = useMemo(
    () => jobs.filter((job) => job.scheduledDate === selectedDate),
    [jobs, selectedDate]
  );

  return (
    <div className="space-y-6">
      <ScheduleWeatherStrip today={today} />

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-green-950">
              My Schedule
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Read-only day and week views of visits assigned to you.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-stone-300 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setView("day")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  view === "day"
                    ? "bg-green-800 text-white"
                    : "text-stone-700 hover:bg-stone-50"
                }`}
              >
                Day
              </button>
              <button
                type="button"
                onClick={() => setView("week")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  view === "week"
                    ? "bg-green-800 text-white"
                    : "text-stone-700 hover:bg-stone-50"
                }`}
              >
                Week
              </button>
            </div>
            <label className="text-sm">
              <span className="sr-only">Date</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
              />
            </label>
          </div>
        </div>
      </Card>

      <section id="todays-route" className="scroll-mt-4">
        <div className="mb-3">
          <h2 className="text-2xl font-bold text-green-950">
            {view === "day"
              ? formatDisplayDate(selectedDate)
              : `Week of ${formatDisplayDate(week[0])}`}
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            {view === "week" ? (
              <>
                {formatDisplayDate(selectedDate)} · {visibleJobs.length}{" "}
                assigned visit
                {visibleJobs.length === 1 ? "" : "s"}
              </>
            ) : (
              <>
                {visibleJobs.length} assigned visit
                {visibleJobs.length === 1 ? "" : "s"}
              </>
            )}
          </p>
        </div>

        {view === "week" ? (
          <div className="mb-4 grid grid-cols-7 gap-1">
            {week.map((iso) => {
              const count = jobs.filter((j) => j.scheduledDate === iso).length;
              const isSelected = selectedDate === iso;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setSelectedDate(iso)}
                  aria-pressed={isSelected}
                  className={`rounded-md border px-1 py-2 text-center text-xs transition ${
                    isSelected
                      ? "border-green-800 bg-green-800 text-white"
                      : iso === today
                        ? "border-green-600 bg-green-50 text-green-950"
                        : "border-stone-200 bg-white text-stone-800 hover:border-green-700"
                  }`}
                >
                  <span className="block font-semibold">
                    {formatDisplayDate(iso).split(",")[0]}
                  </span>
                  <span className="mt-1 block text-[10px]">
                    {count} job{count === 1 ? "" : "s"}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {visibleJobs.length === 0 ? (
          <EmptyState message="No visits assigned to you on this day." />
        ) : (
          <ul className="space-y-4">
            {visibleJobs.map((job) => (
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
      </section>
    </div>
  );
}
