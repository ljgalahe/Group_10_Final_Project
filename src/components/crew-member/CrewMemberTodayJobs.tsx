"use client";

import { useMemo, useState } from "react";
import { Card, StatusBadge } from "@/components/ui";
import { VisitWorkPanel } from "@/components/crew-lead/VisitWorkPanel";
import { CrewSiteNotes } from "@/components/crew-lead/CrewSiteNotes";
import type {
  ExtraWorkItem,
  ScheduleJob,
} from "@/components/crew-lead/schedule-types";
import {
  coworkerNamesForJob,
  crewLeadNameForJob,
  mapsDirectionsUrl,
  scheduledArrivalForJob,
} from "@/lib/crew-member";

function formatShort(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Today's assigned jobs for the crew member dashboard (read-only). */
export function CrewMemberTodayJobs({
  jobs,
  today,
  extraWork = [],
}: {
  jobs: ScheduleJob[];
  today: string;
  extraWork?: ExtraWorkItem[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const todaysJobs = useMemo(
    () =>
      jobs.filter(
        (job) => job.scheduledDate === today && job.status !== "cancelled"
      ),
    [jobs, today]
  );

  return (
    <div className="space-y-6">
      <Card className="border-green-800/20 bg-stone-50">
        <h2 className="text-lg font-semibold text-green-950">
          Today&apos;s Assigned Jobs
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          {formatShort(today)} · {todaysJobs.length} stop
          {todaysJobs.length === 1 ? "" : "s"} assigned to you
        </p>

        {todaysJobs.length === 0 ? (
          <p className="mt-4 text-sm text-stone-500">
            No jobs assigned to you today. Check Schedule for upcoming visits.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {todaysJobs.map((job) => {
              const open = expandedId === job.id;
              const coworkers = coworkerNamesForJob(job.id);
              return (
                <li
                  key={job.id}
                  className="rounded-lg border border-stone-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-green-950">
                        {job.customerName}
                      </p>
                      <p className="mt-1 text-sm text-stone-600">{job.address}</p>
                      <p className="mt-2 text-sm text-stone-700">
                        <span className="font-medium">Arrival:</span>{" "}
                        {scheduledArrivalForJob(job.id)}
                      </p>
                      <p className="mt-1 text-sm text-stone-700">
                        <span className="font-medium">Crew lead:</span>{" "}
                        {crewLeadNameForJob()}
                      </p>
                      <p className="mt-1 text-sm text-stone-700">
                        <span className="font-medium">Crew members:</span>{" "}
                        {coworkers.length > 0
                          ? coworkers.join(", ")
                          : "You (solo on this stop)"}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        Services:{" "}
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
                      Open in Maps
                    </a>
                    <button
                      type="button"
                      onClick={() => setExpandedId(open ? null : job.id)}
                      className="rounded-md border border-green-800 px-3 py-1.5 text-xs font-medium text-green-900 hover:bg-green-50"
                    >
                      {open ? "Hide details" : "View details"}
                    </button>
                  </div>

                  {open ? (
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
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
