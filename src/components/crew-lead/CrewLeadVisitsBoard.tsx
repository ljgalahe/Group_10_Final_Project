"use client";

import { useMemo, useState } from "react";
import { completeVisit } from "@/app/actions/business";
import { AssignedEmployeesList } from "@/components/crew-lead/AssignedEmployeesList";
import { CrewLeadVisitDetails } from "@/components/crew-lead/CrewLeadVisitDetails";
import { CrewVisitPhotos } from "@/components/crew-lead/CrewVisitPhotos";
import {
  getAssignedEmployeesForJob,
  loadVisitWorkStateForStatus,
} from "@/components/crew-lead/crewLeadStorage";
import type {
  ExtraWorkItem,
  ScheduleJob,
} from "@/components/crew-lead/schedule-types";
import { formatStatusLabel } from "@/components/crew-lead/visitWorkDefaults";
import { Card, EmptyState } from "@/components/ui";
import { formatVisitCostDescription } from "@/lib/crew-hours";
import { formatCurrency, formatDate } from "@/lib/format";

export type CrewLeadVisitCardData = {
  id: string;
  status: string;
  customerName: string;
  contractTitle: string;
  scheduledDate: string;
  crewNotes: string | null;
  totalCosts: number;
  costs: {
    id: string;
    cost_type: string;
    description: string | null;
    amount: number;
  }[];
  crewJob: ScheduleJob | null;
};

function titleCaseCostType(costType: string): string {
  const normalized = costType.trim().toLowerCase();
  if (normalized === "labor") return "Labor";
  if (normalized === "materials") return "Materials";
  if (normalized === "equipment") return "Equipment";
  return formatStatusLabel(costType);
}

function employeeNamesForVisit(visit: CrewLeadVisitCardData): string[] {
  const job = visit.crewJob;
  if (!job) return [];
  if (visit.status === "completed") {
    const state = loadVisitWorkStateForStatus(
      visit.id,
      "completed",
      [],
      false
    );
    const fromLabor = state.employees.map((row) => row.name);
    if (fromLabor.length > 0) return fromLabor;
    return state.assignedEmployees.map((row) => row.name);
  }
  return getAssignedEmployeesForJob(visit.id).map((row) => row.name);
}

/** Filterable Service Visits list for Crew Lead (flat cards). */
export function CrewLeadVisitsBoard({
  visits,
  extraWork,
  readOnly = false,
}: {
  visits: CrewLeadVisitCardData[];
  extraWork: ExtraWorkItem[];
  readOnly?: boolean;
}) {
  const [statusFilter, setStatusFilter] = useState<
    "all" | "completed" | "incomplete"
  >("all");
  const [customerName, setCustomerName] = useState("");
  const [jobName, setJobName] = useState("");
  const [employeeName, setEmployeeName] = useState("");

  const customerOptions = useMemo(() => {
    return Array.from(
      new Set(visits.map((visit) => visit.customerName).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [visits]);

  const jobNameOptions = useMemo(() => {
    return Array.from(
      new Set(visits.map((visit) => visit.contractTitle).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [visits]);

  const employeeOptions = useMemo(() => {
    const names = new Set<string>();
    for (const visit of visits) {
      employeeNamesForVisit(visit).forEach((name) => names.add(name));
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [visits]);

  const filtered = useMemo(() => {
    const customerQuery = customerName.trim().toLowerCase();
    const jobQuery = jobName.trim().toLowerCase();
    const employeeQuery = employeeName.trim().toLowerCase();

    return visits.filter((visit) => {
      if (statusFilter === "completed" && visit.status !== "completed") {
        return false;
      }
      if (statusFilter === "incomplete" && visit.status === "completed") {
        return false;
      }

      if (
        customerQuery &&
        !visit.customerName.toLowerCase().includes(customerQuery)
      ) {
        return false;
      }

      if (jobQuery && !visit.contractTitle.toLowerCase().includes(jobQuery)) {
        return false;
      }

      if (employeeQuery) {
        const names = employeeNamesForVisit(visit).map((name) =>
          name.toLowerCase()
        );
        if (!names.some((name) => name.includes(employeeQuery))) {
          return false;
        }
      }

      return true;
    });
  }, [visits, statusFilter, customerName, jobName, employeeName]);

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-lg font-semibold text-green-950">Filters</h2>
        <p className="mt-1 text-sm text-stone-500">
          {readOnly
            ? "Filter by completion status, customer name, or job name."
            : "Filter by completion status, customer name, job name, or employee name."}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              Customer Name
            </span>
            <input
              list="crew-visit-customers"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Search customer..."
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-800"
            />
            <datalist id="crew-visit-customers">
              {customerOptions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-stone-700">
              Job Name
            </span>
            <input
              list="crew-visit-jobs"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              placeholder="Search job name..."
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-800"
            />
            <datalist id="crew-visit-jobs">
              {jobNameOptions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </label>

          {!readOnly ? (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-stone-700">
                Employee Name
              </span>
              <input
                list="crew-visit-employees"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                placeholder="Search employee..."
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-800"
              />
              <datalist id="crew-visit-employees">
                {employeeOptions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </label>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-stone-500">
          Showing {filtered.length} of {visits.length} visits
        </p>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState message="No visits match these filters." />
      ) : (
        <div className="space-y-4">
          {filtered.map((visit) => {
            const crewJob = visit.crewJob;
            return (
              <div
                key={visit.id}
                className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-green-950">
                      {visit.contractTitle}
                    </p>
                    <p className="text-sm text-stone-500">
                      {visit.customerName} · {formatDate(visit.scheduledDate)}
                    </p>
                    {visit.crewNotes ? (
                      <p className="mt-2 text-sm text-stone-600">
                        {visit.crewNotes}
                      </p>
                    ) : null}
                    <AssignedEmployeesList
                      jobId={visit.id}
                      status={visit.status}
                      services={crewJob?.services ?? []}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-800">
                      {formatStatusLabel(visit.status)}
                    </span>
                    {!readOnly && visit.status === "scheduled" ? (
                      <form action={completeVisit}>
                        <input
                          type="hidden"
                          name="visit_id"
                          value={visit.id}
                        />
                        <input
                          type="hidden"
                          name="notes"
                          value="Visit completed on schedule"
                        />
                        <button
                          type="submit"
                          className="rounded-md bg-green-800 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                        >
                          Mark Complete
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-sm font-medium text-stone-700">
                    Visit Costs
                  </p>
                  {visit.costs.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-sm text-stone-600">
                      {visit.costs.map((cost) => {
                        const isLabor =
                          cost.cost_type.trim().toLowerCase() === "labor";
                        return (
                          <li key={cost.id}>
                            <span className="font-medium text-stone-800">
                              {titleCaseCostType(cost.cost_type)}
                            </span>
                            :{" "}
                            {formatVisitCostDescription(
                              visit.id,
                              cost.cost_type,
                              cost.description,
                              { hidePay: true }
                            )}
                            {!isLabor
                              ? ` — ${formatCurrency(Number(cost.amount))}`
                              : null}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-stone-400">
                      No costs logged yet.
                    </p>
                  )}
                </div>

                <div className="mt-4">
                  <CrewVisitPhotos
                    jobId={visit.id}
                    status={visit.status}
                    readOnly={readOnly}
                  />
                </div>

                {crewJob ? (
                  <CrewLeadVisitDetails
                    job={crewJob}
                    extraWork={extraWork}
                    readOnly={readOnly}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
