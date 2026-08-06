"use client";

import { useMemo, useState } from "react";
import { CrewLeadVisitDetails } from "@/components/crew-lead/CrewLeadVisitDetails";
import { CrewVisitPhotos } from "@/components/crew-lead/CrewVisitPhotos";
import type { CrewLeadVisitCardData } from "@/components/crew-lead/CrewLeadVisitsBoard";
import type { ExtraWorkItem } from "@/components/crew-lead/schedule-types";
import { CrewSiteNotes } from "@/components/crew-lead/CrewSiteNotes";
import { Card, EmptyState, StatusBadge } from "@/components/ui";
import { formatDate } from "@/lib/format";
import {
  coworkerNamesForJob,
  crewLeadNameForJob,
  scheduledArrivalForJob,
} from "@/lib/crew-member";

/** Filterable, read-only Service Visits list for crew members (assigned visits only). */
export function CrewMemberVisitsBoard({
  visits,
  extraWork,
}: {
  visits: CrewLeadVisitCardData[];
  extraWork: ExtraWorkItem[];
}) {
  const [statusFilter, setStatusFilter] = useState<
    "all" | "completed" | "incomplete"
  >("all");
  const [jobName, setJobName] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const jobOptions = useMemo(() => {
    return Array.from(
      new Set(visits.map((visit) => visit.contractTitle).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [visits]);

  const filtered = useMemo(() => {
    const jobQuery = jobName.trim().toLowerCase();

    return visits.filter((visit) => {
      if (statusFilter === "completed" && visit.status !== "completed") {
        return false;
      }
      if (statusFilter === "incomplete" && visit.status === "completed") {
        return false;
      }

      if (
        jobQuery &&
        !visit.contractTitle.toLowerCase().includes(jobQuery) &&
        !visit.customerName.toLowerCase().includes(jobQuery)
      ) {
        return false;
      }

      return true;
    });
  }, [visits, statusFilter, jobName]);

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-lg font-semibold text-green-950">Filters</h2>
        <p className="mt-1 text-sm text-stone-500">
          Filter your assigned visits by job name or completion status.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-stone-700">
              Status
            </span>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as "all" | "completed" | "incomplete"
                )
              }
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-800"
            >
              <option value="all">All Visits</option>
              <option value="completed">Completed</option>
              <option value="incomplete">Pending</option>
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-stone-700">
              Job Name
            </span>
            <input
              list="crew-member-visit-jobs"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              placeholder="Search job name..."
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-800"
            />
            <datalist id="crew-member-visit-jobs">
              {jobOptions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </label>
        </div>
        <p className="mt-3 text-xs text-stone-500">
          Showing {filtered.length} of {visits.length} assigned visits
        </p>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState message="No visits match these filters." />
      ) : (
        <div className="space-y-4">
          {filtered.map((visit) => {
            const crewJob = visit.crewJob;
            const open = expandedId === visit.id;
            const coworkers = coworkerNamesForJob(visit.id);
            const arrival = scheduledArrivalForJob(visit.id);

            return (
              <div
                key={visit.id}
                className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-green-950">
                      {visit.contractTitle}
                    </p>
                    <p className="mt-1 text-sm text-stone-600">
                      {visit.customerName}
                      {crewJob?.address ? ` · ${crewJob.address}` : ""}
                    </p>
                    <p className="mt-2 text-sm text-stone-700">
                      <span className="font-medium">Scheduled:</span>{" "}
                      {formatDate(visit.scheduledDate)} · {arrival}
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
                    {crewJob ? (
                      <p className="mt-1 text-xs text-stone-500">
                        Services:{" "}
                        {crewJob.services.join(", ") || "General Maintenance"}
                      </p>
                    ) : null}
                    {visit.crewNotes ? (
                      <p className="mt-2 text-sm text-stone-600">
                        {visit.crewNotes}
                      </p>
                    ) : null}
                    {crewJob ? (
                      <div className="mt-2">
                        <CrewSiteNotes notes={crewJob.customerNotes} compact />
                      </div>
                    ) : null}
                  </div>
                  <StatusBadge status={visit.status} />
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setExpandedId(open ? null : visit.id)}
                    className="rounded-md border border-green-800 px-3 py-1.5 text-xs font-medium text-green-900 hover:bg-green-50"
                  >
                    {open ? "Hide details" : "More Details"}
                  </button>
                </div>

                {open && crewJob ? (
                  <div className="mt-4 space-y-3 border-t border-stone-100 pt-4">
                    <CrewVisitPhotos
                      jobId={visit.id}
                      status={visit.status}
                      readOnly
                    />
                    <CrewLeadVisitDetails
                      job={crewJob}
                      extraWork={extraWork}
                      readOnly
                      showCustomerNotes={false}
                    />
                  </div>
                ) : open ? (
                  <p className="mt-4 text-sm text-stone-500">
                    Detailed visit information is not available for this stop.
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
