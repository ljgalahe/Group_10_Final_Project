"use client";

import { useMemo, useState } from "react";
import { completeVisit } from "@/app/actions/business";
import { AssignedEmployeesList } from "@/components/crew-lead/AssignedEmployeesList";
import { CrewLeadVisitDetails } from "@/components/crew-lead/CrewLeadVisitDetails";
import { CrewVisitPhotos } from "@/components/crew-lead/CrewVisitPhotos";
import {
  getAssignedEmployeesForJob,
  loadVisitWorkState,
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
  // Read-only localStorage load — do not call loadVisitWorkStateForStatus here
  // (that autofills + writes for every completed visit and freezes the tab).
  if (visit.status === "completed") {
    const state = loadVisitWorkState(visit.id);
    const fromLabor = state.employees.map((row) => row.name);
    if (fromLabor.length > 0) return fromLabor;
    return state.assignedEmployees.map((row) => row.name);
  }
  return getAssignedEmployeesForJob(visit.id).map((row) => row.name);
}

function isScheduledStatus(status: string): boolean {
  return status === "scheduled" || status === "on_hold";
}

function VisitCard({
  visit,
  extraWork,
  readOnly,
}: {
  visit: CrewLeadVisitCardData;
  extraWork: ExtraWorkItem[];
  readOnly: boolean;
}) {
  const crewJob = visit.crewJob;
  const isCompleted = visit.status === "completed";

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-green-950">{visit.contractTitle}</p>
          <p className="text-sm text-stone-500">
            {visit.customerName} · {formatDate(visit.scheduledDate)}
          </p>
          {visit.crewNotes ? (
            <p className="mt-2 text-sm text-stone-600">{visit.crewNotes}</p>
          ) : null}
          <AssignedEmployeesList
            jobId={visit.id}
            status={visit.status}
            services={crewJob?.services ?? []}
          />
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex rounded-md px-2.5 py-0.5 text-xs font-semibold ${
              isCompleted
                ? "gs-complete-badge border"
                : "border border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            {isCompleted ? "Completed" : "Scheduled"}
          </span>
          {!readOnly && visit.status === "scheduled" ? (
            <form action={completeVisit}>
              <input type="hidden" name="visit_id" value={visit.id} />
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
        <p className="text-sm font-medium text-stone-700">Visit Costs</p>
        {visit.costs.length > 0 ? (
          <ul className="mt-2 space-y-1 text-sm text-stone-600">
            {visit.costs.map((cost) => {
              const isLabor = cost.cost_type.trim().toLowerCase() === "labor";
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
                  {!isLabor ? ` — ${formatCurrency(Number(cost.amount))}` : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-stone-400">No costs logged yet.</p>
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
}

/** Filterable Service Visits list — flat cards once a filter is applied. */
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
    "all" | "completed" | "scheduled"
  >("all");
  const [dateFilter, setDateFilter] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [jobName, setJobName] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [organizeByCustomer, setOrganizeByCustomer] = useState(false);
  const [openCustomer, setOpenCustomer] = useState<string | null>(null);

  const hasActiveFilter =
    statusFilter !== "all" ||
    dateFilter.trim().length > 0 ||
    customerName.trim().length > 0 ||
    jobName.trim().length > 0 ||
    employeeName.trim().length > 0;

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
    const day = dateFilter.trim();

    return visits
      .filter((visit) => {
        if (day && visit.scheduledDate.slice(0, 10) !== day) {
          return false;
        }

        if (statusFilter === "completed" && visit.status !== "completed") {
          return false;
        }
        if (statusFilter === "scheduled" && !isScheduledStatus(visit.status)) {
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
      })
      .sort((a, b) => {
        const byDate = a.scheduledDate.localeCompare(b.scheduledDate);
        if (byDate !== 0) return byDate;
        return a.customerName.localeCompare(b.customerName);
      });
  }, [visits, statusFilter, dateFilter, customerName, jobName, employeeName]);

  const customerGroups = useMemo(() => {
    const map = new Map<string, CrewLeadVisitCardData[]>();
    for (const visit of filtered) {
      const key = visit.customerName || "Unknown customer";
      const list = map.get(key) ?? [];
      list.push(visit);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-lg font-semibold text-green-950">Filters</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-stone-700">Date</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setOpenCustomer(null);
              }}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-800"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-stone-700">
              Status
            </span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(
                  e.target.value as "all" | "completed" | "scheduled"
                );
                setOpenCustomer(null);
              }}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-800"
            >
              <option value="all">All Visits</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-stone-700">
              Customer Name
            </span>
            <input
              list="crew-visit-customers"
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                setOpenCustomer(null);
              }}
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
              onChange={(e) => {
                setJobName(e.target.value);
                setOpenCustomer(null);
              }}
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
                onChange={(e) => {
                  setEmployeeName(e.target.value);
                  setOpenCustomer(null);
                }}
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

        <label className="mt-4 flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={organizeByCustomer}
            onChange={(e) => {
              setOrganizeByCustomer(e.target.checked);
              setOpenCustomer(null);
            }}
            className="rounded border-stone-300"
          />
          Organize by customer
        </label>

        {hasActiveFilter ? (
          <p className="mt-3 text-xs text-stone-500">
            Showing {filtered.length} of {visits.length} visits
            {dateFilter ? ` · ${formatDate(dateFilter)}` : ""}
            {statusFilter === "scheduled"
              ? " · scheduled"
              : statusFilter === "completed"
                ? " · completed"
                : ""}
          </p>
        ) : null}
      </Card>

      {!hasActiveFilter ? null : filtered.length === 0 ? (
        <EmptyState message="No visits match these filters." />
      ) : organizeByCustomer ? (
        <div className="max-h-[36rem] space-y-0 overflow-y-auto overscroll-contain border-t border-stone-200 pr-1">
          {customerGroups.map(([customer, customerVisits]) => {
            const isOpen = openCustomer === customer;
            return (
              <div
                key={customer}
                className={`gs-list-row border-b border-stone-200 transition ${
                  isOpen
                    ? "bg-[var(--cream)]"
                    : "bg-transparent hover:bg-white/40"
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenCustomer((current) =>
                      current === customer ? null : customer
                    )
                  }
                  className="flex w-full items-center justify-between gap-3 px-1 py-4 text-left sm:px-2"
                >
                  <div>
                    <p className="font-display text-xl font-semibold text-green-950">
                      {customer}
                    </p>
                    <p className="mt-0.5 text-sm text-stone-500">
                      {customerVisits.length}{" "}
                      {customerVisits.length === 1 ? "visit" : "visits"}
                    </p>
                  </div>
                  <span className="gs-text-link">
                    {isOpen ? "Hide" : "View"}
                    <span aria-hidden>{isOpen ? " ↑" : " →"}</span>
                  </span>
                </button>
                {isOpen ? (
                  <div className="space-y-4 border-t border-stone-200 px-1 py-4 sm:px-2">
                    {customerVisits.map((visit) => (
                      <VisitCard
                        key={visit.id}
                        visit={visit}
                        extraWork={extraWork}
                        readOnly={readOnly}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((visit) => (
            <VisitCard
              key={visit.id}
              visit={visit}
              extraWork={extraWork}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
}
