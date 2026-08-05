"use client";

import { useMemo, useState } from "react";
import { completeVisit } from "@/app/actions/business";
import {
  getAssignedEmployeesForJob,
  loadVisitWorkStateForStatus,
} from "@/components/crew-lead/crewLeadStorage";
import type {
  ExtraWorkItem,
  ScheduleJob,
} from "@/components/crew-lead/schedule-types";
import { VisitWorkPanel } from "@/components/crew-lead/VisitWorkPanel";
import {
  equipmentForServices,
  materialsForServices,
} from "@/components/crew-lead/visitWorkDefaults";
import { Card, EmptyState, StatusBadge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  PROOF_PACKAGES,
  SCHEDULE_CREW,
  type ProofOverlay,
} from "@/lib/visit-demo";

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

type StatusFilter = "all" | "completed" | "incomplete";

const SELECT_CLASS =
  "mt-1 block w-full min-w-0 max-w-full appearance-none rounded-lg border border-stone-300 bg-white bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat py-2 pl-3 pr-10 text-stone-800";

const SELECT_CHEVRON = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23575757'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
} as const;

type VisitRow = CrewLeadVisitCardData & {
  jobLabel: string;
  location: string;
  employeeNames: string[];
  crewHours: { name: string; role: string; hours: number }[];
  proof: ProofOverlay | null;
  materials: string[];
  equipment: string[];
};

function employeeNamesForVisit(visit: CrewLeadVisitCardData): string[] {
  const overlay = SCHEDULE_CREW[visit.id];
  if (overlay?.crew?.length) return overlay.crew.map((m) => m.name);

  if (visit.status === "completed") {
    const state = loadVisitWorkStateForStatus(visit.id, "completed", [], false);
    const fromLabor = state.employees.map((row) => row.name);
    if (fromLabor.length > 0) return fromLabor;
    return state.assignedEmployees.map((row) => row.name);
  }
  return getAssignedEmployeesForJob(visit.id).map((row) => row.name);
}

function enrichVisit(visit: CrewLeadVisitCardData): VisitRow {
  const overlay = SCHEDULE_CREW[visit.id];
  const proof =
    PROOF_PACKAGES.find((p) => p.visitId === visit.id) ?? null;
  const services = visit.crewJob?.services ?? [];
  const jobLabel =
    overlay?.jobLabel ??
    (services[0] ?? visit.contractTitle);

  let crewHours =
    overlay?.crew.map((m) => ({
      name: m.name,
      role: m.role,
      hours: m.hours,
    })) ?? [];

  if (crewHours.length === 0) {
    const state = loadVisitWorkStateForStatus(
      visit.id,
      visit.status,
      [],
      false
    );
    if (state.employees.length > 0) {
      crewHours = state.employees.map((e) => ({
        name: e.name,
        role: "Crew",
        hours: e.hours,
      }));
    } else {
      crewHours = state.assignedEmployees.map((m) => ({
        name: m.name,
        role: m.role,
        hours: 0,
      }));
    }
  }

  return {
    ...visit,
    jobLabel,
    location: visit.crewJob?.address ?? "Oxford, MS",
    employeeNames: employeeNamesForVisit(visit),
    crewHours,
    proof,
    materials: materialsForServices(services.length ? services : [jobLabel]),
    equipment: equipmentForServices(services.length ? services : [jobLabel]),
  };
}

function ProofPhotos({ proof }: { proof: ProofOverlay }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {(
        [
          ["Before", proof.beforeImage, proof.before],
          ["After", proof.afterImage, proof.after],
          [
            "Concern",
            proof.concernImage,
            proof.concernLabel ?? "No concerns noted",
          ],
        ] as const
      ).map(([label, src, caption]) => (
        <figure
          key={label}
          className="overflow-hidden rounded-lg border border-stone-200 bg-white"
        >
          <p className="border-b border-stone-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">
            {label}
          </p>
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={caption}
              className="h-36 w-full object-cover"
            />
          ) : (
            <div className="flex h-36 items-center justify-center bg-stone-100 text-xs text-stone-400">
              No photo
            </div>
          )}
          <figcaption className="px-3 py-2 text-xs text-stone-600">
            {caption}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

/** Filterable, categorized Service Visits board for Crew Lead (or read-only crew member). */
export function CrewLeadVisitsBoard({
  visits,
  extraWork,
  readOnly = false,
}: {
  visits: CrewLeadVisitCardData[];
  extraWork: ExtraWorkItem[];
  readOnly?: boolean;
}) {
  const rows = useMemo(() => visits.map(enrichVisit), [visits]);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [jobFilter, setJobFilter] = useState("all");
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const customerOptions = useMemo(
    () =>
      [...new Set(rows.map((r) => r.customerName))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  const employeeOptions = useMemo(() => {
    if (readOnly) return [];
    const names = new Set<string>();
    rows.forEach((r) => r.employeeNames.forEach((n) => names.add(n)));
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [rows, readOnly]);

  const jobOptions = useMemo(
    () =>
      [...new Set(rows.map((r) => r.jobLabel))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (statusFilter === "completed" && row.status !== "completed") {
        return false;
      }
      if (statusFilter === "incomplete" && row.status === "completed") {
        return false;
      }
      if (customerFilter !== "all" && row.customerName !== customerFilter) {
        return false;
      }
      if (
        employeeFilter !== "all" &&
        !row.employeeNames.includes(employeeFilter)
      ) {
        return false;
      }
      if (jobFilter !== "all" && row.jobLabel !== jobFilter) {
        return false;
      }
      return true;
    });
  }, [rows, statusFilter, customerFilter, employeeFilter, jobFilter]);

  const groupMode: "company" | "employee" | "job" =
    employeeFilter !== "all"
      ? "employee"
      : jobFilter !== "all"
        ? "job"
        : "company";

  const groups = useMemo(() => {
    const map = new Map<string, VisitRow[]>();
    for (const row of filtered) {
      if (groupMode === "employee" && employeeFilter === "all") {
        const names =
          row.employeeNames.length > 0 ? row.employeeNames : ["Unassigned"];
        for (const name of names) {
          const list = map.get(name) ?? [];
          if (!list.some((v) => v.id === row.id)) list.push(row);
          map.set(name, list);
        }
        continue;
      }

      const key =
        groupMode === "employee"
          ? employeeFilter
          : groupMode === "job"
            ? row.jobLabel
            : row.customerName;

      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([title, list]) =>
          [
            title,
            [...list].sort((a, b) =>
              a.scheduledDate.localeCompare(b.scheduledDate)
            ),
          ] as [string, VisitRow[]]
      );
  }, [filtered, groupMode, employeeFilter]);

  function clearVisitSelection() {
    setOpenGroup(null);
    setSelectedId(null);
  }

  return (
    <div className="space-y-4">
      <Card className="min-w-0 overflow-hidden">
        <h2 className="text-lg font-semibold text-green-950">Filters</h2>
        <p className="mt-1 text-sm text-stone-500">
          {readOnly
            ? "Filter by completion status, customer, or job."
            : "Filter by completion status, customer, employee, or job."}
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block min-w-0 text-sm">
            <span className="mb-1 block font-medium text-stone-700">Status</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                setSelectedId(null);
              }}
              className={SELECT_CLASS}
              style={SELECT_CHEVRON}
            >
              <option value="all">All visits</option>
              <option value="completed">Complete</option>
              <option value="incomplete">Incomplete</option>
            </select>
          </label>

          <label className="block min-w-0 text-sm">
            <span className="mb-1 block font-medium text-stone-700">
              Customer Name
            </span>
            <select
              value={customerFilter}
              onChange={(e) => {
                setCustomerFilter(e.target.value);
                clearVisitSelection();
              }}
              className={SELECT_CLASS}
              style={SELECT_CHEVRON}
            >
              <option value="all">All customers</option>
              {customerOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          {!readOnly ? (
            <label className="block min-w-0 text-sm">
              <span className="mb-1 block font-medium text-stone-700">
                Employee Name
              </span>
              <select
                value={employeeFilter}
                onChange={(e) => {
                  setEmployeeFilter(e.target.value);
                  clearVisitSelection();
                }}
                className={SELECT_CLASS}
                style={SELECT_CHEVRON}
              >
                <option value="all">All employees</option>
                {employeeOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="block min-w-0 text-sm">
            <span className="mb-1 block font-medium text-stone-700">
              Job Name
            </span>
            <select
              value={jobFilter}
              onChange={(e) => {
                setJobFilter(e.target.value);
                clearVisitSelection();
              }}
              className={SELECT_CLASS}
              style={SELECT_CHEVRON}
            >
              <option value="all">All jobs</option>
              {jobOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="mt-3 text-xs text-stone-500">
          Showing {filtered.length} of {rows.length}{" "}
          {rows.length === 1 ? "visit" : "visits"}
        </p>
      </Card>

      {groups.length === 0 ? (
        <EmptyState message="No visits match these filters." />
      ) : (
        <div className="space-y-3">
          {groups.map(([title, list]) => {
            const isOpen = openGroup === title;
            return (
              <div
                key={title}
                className={`overflow-hidden rounded-xl border shadow-sm ${
                  isOpen
                    ? "border-green-800 bg-white"
                    : "border-stone-200 bg-white"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setOpenGroup((cur) => (cur === title ? null : title));
                    setSelectedId(null);
                  }}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <div>
                    <p className="text-lg font-semibold text-green-950">
                      {title}
                    </p>
                    <p className="mt-0.5 text-sm text-stone-500">
                      {list.length} visit{list.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-green-800">
                    {isOpen ? "Hide" : "View visits"}
                  </span>
                </button>

                {isOpen ? (
                  <div className="space-y-2 border-t border-stone-100 bg-stone-50 px-4 py-4">
                    {list.map((visit) => {
                      const active = selectedId === visit.id;
                      return (
                        <div key={visit.id}>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedId((cur) =>
                                cur === visit.id ? null : visit.id
                              )
                            }
                            className={`flex w-full items-start justify-between gap-3 rounded-lg border px-4 py-3 text-left transition ${
                              active
                                ? "border-green-700 bg-green-50"
                                : "border-stone-200 bg-white hover:border-green-600"
                            }`}
                          >
                            <div>
                              <p className="font-medium text-green-950">
                                {visit.jobLabel}
                              </p>
                              <p className="mt-0.5 text-sm text-stone-600">
                                {visit.customerName} ·{" "}
                                {formatDate(visit.scheduledDate)}
                              </p>
                              <p className="mt-0.5 text-xs text-stone-500">
                                {visit.location}
                              </p>
                            </div>
                            <StatusBadge status={visit.status} />
                          </button>

                          {active ? (
                            <div className="mt-2 space-y-4 rounded-lg border border-stone-200 bg-white p-4">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-green-950">
                                    Visit details
                                  </p>
                                  <p className="mt-1 text-sm text-stone-600">
                                    {visit.location}
                                  </p>
                                  <p className="mt-0.5 text-xs text-stone-500">
                                    {visit.contractTitle}
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <StatusBadge status={visit.status} />
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
                                        className="rounded-md bg-green-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                                      >
                                        Mark complete
                                      </button>
                                    </form>
                                  ) : null}
                                </div>
                              </div>

                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                                  Employees & hours
                                </p>
                                {visit.crewHours.length === 0 ? (
                                  <p className="mt-2 text-sm text-stone-500">
                                    No crew hours listed yet.
                                  </p>
                                ) : (
                                  <ul className="mt-2 space-y-1">
                                    {visit.crewHours.map((member) => (
                                      <li
                                        key={`${visit.id}-${member.name}`}
                                        className="flex justify-between gap-2 rounded-md bg-stone-50 px-3 py-2 text-sm"
                                      >
                                        <span>
                                          {member.name}
                                          <span className="text-stone-500">
                                            {" "}
                                            · {member.role}
                                          </span>
                                        </span>
                                        <span className="font-medium text-stone-800">
                                          {member.hours > 0
                                            ? `${member.hours} hrs`
                                            : "—"}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>

                              <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                                    Materials
                                  </p>
                                  <p className="mt-1 text-sm text-stone-800">
                                    {visit.materials.join(" · ")}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                                    Equipment
                                  </p>
                                  <p className="mt-1 text-sm text-stone-800">
                                    {visit.equipment.join(" · ")}
                                  </p>
                                </div>
                              </div>

                              {visit.totalCosts > 0 ? (
                                <p className="text-sm text-stone-600">
                                  Visit costs:{" "}
                                  <span className="font-medium">
                                    {formatCurrency(visit.totalCosts)}
                                  </span>
                                </p>
                              ) : null}

                              {visit.proof ? (
                                <div>
                                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                                    Photo proof
                                  </p>
                                  <ProofPhotos proof={visit.proof} />
                                </div>
                              ) : (
                                <p className="text-sm text-stone-500">
                                  No photo proof on file for this visit.
                                </p>
                              )}

                              {visit.crewJob ? (
                                <details className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
                                  <summary className="cursor-pointer text-sm font-medium text-green-900">
                                    {readOnly ? "Crew plan" : "Edit crew plan"}
                                  </summary>
                                  <VisitWorkPanel
                                    job={visit.crewJob}
                                    contractExtraWork={extraWork.filter(
                                      (item) =>
                                        item.contractId ===
                                        visit.crewJob?.contractId
                                    )}
                                    variant="planning"
                                    readOnly={readOnly}
                                  />
                                </details>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
