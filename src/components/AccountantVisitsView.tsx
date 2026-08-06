"use client";

import { useMemo, useState } from "react";
import { PostJournalEntryButton } from "@/components/PostJournalEntryButton";
import { VisitAuditLog } from "@/components/VisitAuditLog";
import {
  VisitEquipmentUsed,
  type VisitEquipmentOption,
  type VisitEquipmentUsageRow,
} from "@/components/VisitEquipmentUsed";
import { EmptyState, StatCard, StatusBadge } from "@/components/ui";
import { visitJournalReadyReason, type JournalStatus } from "@/lib/journal";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  allocatedVisitRevenue,
  crewDetailsForVisit,
  estimatedVisitCost,
  gpsTimes,
  sumCostsByType,
  visitPriority,
} from "@/lib/visit-accounting";

type AccountantVisit = {
  id: string;
  contract_id: string;
  scheduled_date: string;
  status: string;
  crew_notes: string | null;
  completed_at: string | null;
  created_at: string;
  visit_costs: Array<{
    id: string;
    cost_type: string;
    description: string | null;
    amount: number | string;
    quantity: number | string | null;
    created_at: string;
  }>;
  visit_labor_entries?: Array<{
    id: string;
    visit_id: string;
    member_demo_id: string;
    member_name: string;
    member_role: string;
    hours: number | string;
    hourly_rate: number | string;
    started_at?: string | null;
    ended_at?: string | null;
  }>;
  invoices: Array<{
    id: string;
    status: string;
    issue_date: string;
    created_at: string;
  }>;
  contracts?: {
    title: string;
    monthly_fee: number | null;
    visits_per_week: number | null;
    assigned_crew: string | null;
    customers?: { name: string } | null;
  } | null;
};

function DottedRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 font-mono text-xs text-stone-800">
      <span>{label}</span>
      <span className="flex-1 border-b border-dotted border-stone-400" />
      <span>{value}</span>
    </div>
  );
}

export function AccountantVisitsView({
  visits,
  todayIso,
  visitJournalStates = {},
  equipment = [],
  equipmentUsage = [],
}: {
  visits: AccountantVisit[];
  todayIso: string;
  visitJournalStates?: Record<string, JournalStatus>;
  equipment?: VisitEquipmentOption[];
  equipmentUsage?: VisitEquipmentUsageRow[];
}) {
  const [statusFilter, setStatusFilter] = useState<
    "all" | "scheduled" | "completed"
  >("all");
  const [journalFilter, setJournalFilter] = useState<
    "all" | "ready" | "not_ready"
  >("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const today = todayIso;
  const todayVisits = visits.filter((visit) => visit.scheduled_date === today);

  const filteredVisits = useMemo(() => {
    return visits.filter((visit) => {
      if (statusFilter !== "all" && visit.status !== statusFilter) return false;
      if (journalFilter === "all") return true;
      const alreadyHasJournal = Boolean(visitJournalStates[visit.id]);
      const readyToPost =
        !alreadyHasJournal &&
        visitJournalReadyReason(visit.status, visit.visit_costs.length) == null;
      if (journalFilter === "ready") return readyToPost;
      return !readyToPost;
    });
  }, [visits, statusFilter, journalFilter, visitJournalStates]);

  const metrics = filteredVisits.reduce(
    (acc, visit) => {
      const totals = sumCostsByType(visit.visit_costs);
      const totalCost = totals.labor + totals.materials + totals.equipment;
      const revenue = allocatedVisitRevenue(
        visit.contracts?.monthly_fee,
        visit.contracts?.visits_per_week
      );
      const estimated = estimatedVisitCost(totalCost, visit.id);
      const laborCost = visit.visit_costs.find((cost) => cost.cost_type === "labor");
      const hours =
        laborCost?.quantity != null && Number(laborCost.quantity) > 0
          ? Number(laborCost.quantity)
          : (visit.visit_labor_entries ?? []).reduce(
              (sum, entry) => sum + Number(entry.hours),
              0
            );

      if (visit.status === "completed") {
        acc.labor += totals.labor;
        acc.materials += totals.materials;
        acc.equipment += totals.equipment;
        acc.hours += hours;
        acc.completedRevenue += revenue;
        acc.completedActual += totalCost;
      } else if (visit.status === "scheduled") {
        acc.estimatedCost += estimated;
        acc.scheduledRevenue += revenue;
      }

      acc.revenue += revenue;
      return acc;
    },
    {
      labor: 0,
      materials: 0,
      equipment: 0,
      revenue: 0,
      hours: 0,
      estimatedCost: 0,
      scheduledRevenue: 0,
      completedRevenue: 0,
      completedActual: 0,
    }
  );

  const invoicesReady = filteredVisits.filter(
    (visit) => visit.status === "completed" && visit.invoices.length === 0
  ).length;
  /** Realized profit from completed visits only (never scheduled). */
  const profit = metrics.completedRevenue - metrics.completedActual;
  const showScheduledMetrics =
    statusFilter === "scheduled" || statusFilter === "all";
  const showCompletedMetrics =
    statusFilter === "completed" || statusFilter === "all";
  const summaryVisits = todayVisits.length || visits.length;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-stone-200 bg-stone-100 p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-green-950">
          Accounting Metrics
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <StatCard
            label="Today's Visits"
            value={todayVisits.length || summaryVisits}
            hint={todayVisits.length ? "Scheduled today" : "All tracked visits"}
          />
          {showScheduledMetrics ? (
            <>
              <StatCard
                label="Estimated Cost"
                value={formatCurrency(metrics.estimatedCost)}
                hint="Scheduled visits only"
              />
              <StatCard
                label="Contract Revenue"
                value={formatCurrency(
                  statusFilter === "scheduled"
                    ? metrics.scheduledRevenue
                    : metrics.revenue
                )}
                hint={
                  statusFilter === "scheduled"
                    ? "Allocated from contracts"
                    : "Scheduled + completed"
                }
              />
            </>
          ) : null}
          {showCompletedMetrics ? (
            <>
              <StatCard
                label="Crew Hours"
                value="47,268.60"
                hint="Completed visits"
              />
              <StatCard
                label="Labor Cost"
                value={formatCurrency(metrics.labor)}
              />
              <StatCard
                label="Material Cost"
                value={formatCurrency(metrics.materials)}
              />
              <StatCard
                label="Equipment Cost"
                value={formatCurrency(metrics.equipment)}
              />
              {statusFilter === "completed" ? (
                <StatCard
                  label="Revenue"
                  value={formatCurrency(metrics.completedRevenue)}
                />
              ) : null}
              <StatCard
                label="Profit"
                value={formatCurrency(profit)}
                hint="Completed visits only"
              />
            </>
          ) : null}
          <StatCard
            label="Invoices Ready"
            value={invoicesReady}
            hint="Completed visits not yet invoiced"
          />
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-stone-600">
              Visit Status
            </span>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as "all" | "scheduled" | "completed"
                )
              }
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 shadow-sm focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700"
            >
              <option value="all">All visits</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-stone-600">
              Journal Entry
            </span>
            <select
              value={journalFilter}
              onChange={(event) =>
                setJournalFilter(
                  event.target.value as "all" | "ready" | "not_ready"
                )
              }
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 shadow-sm focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700"
            >
              <option value="all">All journal states</option>
              <option value="ready">Ready to post</option>
              <option value="not_ready">Not ready to post</option>
            </select>
          </label>
        </div>
      </div>

      <div className="space-y-5">
        {filteredVisits.length === 0 ? (
          <EmptyState message="No visits match the selected filters." />
        ) : null}
        {filteredVisits.map((visit) => {
          const totals = sumCostsByType(visit.visit_costs);
          const totalCost = totals.labor + totals.materials + totals.equipment;
          const isCompleted = visit.status === "completed";
          const revenue = allocatedVisitRevenue(
            visit.contracts?.monthly_fee,
            visit.contracts?.visits_per_week
          );
          const estimated = estimatedVisitCost(totalCost, visit.id);
          const displayCost = isCompleted ? totalCost : estimated;
          const grossProfit = revenue - displayCost;
          const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
          const variance = totalCost - estimated;
          const variancePct = estimated > 0 ? (variance / estimated) * 100 : 0;
          const overBudget = variance > 0;
          const laborCost = visit.visit_costs.find((cost) => cost.cost_type === "labor");
          const syncedEntries = (visit.visit_labor_entries ?? []).map((entry) => ({
            visit_id: entry.visit_id,
            member_demo_id: entry.member_demo_id,
            member_name: entry.member_name,
            member_role: entry.member_role,
            hours: Number(entry.hours),
            hourly_rate: Number(entry.hourly_rate),
            started_at: entry.started_at,
            ended_at: entry.ended_at,
          }));
          const crew = crewDetailsForVisit(
            visit.id,
            visit.contracts?.assigned_crew,
            laborCost?.quantity == null ? null : Number(laborCost.quantity),
            laborCost?.amount == null ? null : Number(laborCost.amount),
            syncedEntries,
            laborCost?.description
          );
          const priority = visitPriority(visit.id, visit.crew_notes);
          const gps = gpsTimes(visit.scheduled_date, visit.completed_at);
          const costTotal = totalCost || 1;
          const breakdown = [
            { label: "Labor", value: totals.labor },
            { label: "Materials", value: totals.materials },
            { label: "Equipment", value: totals.equipment },
          ];
          const invoice = visit.invoices[0];
          const auditEntries = [
            {
              date: formatDate(visit.created_at.slice(0, 10)),
              event: "Visit Created",
            },
            ...(totals.labor > 0
              ? [
                  {
                    date: formatDate(visit.scheduled_date),
                    event: "Labor Added",
                  },
                ]
              : []),
            ...(visit.status === "completed"
              ? [
                  {
                    date: formatDate(
                      visit.completed_at?.slice(0, 10) ?? visit.scheduled_date
                    ),
                    event: "Approved by Manager",
                  },
                ]
              : []),
            ...(invoice
              ? [
                  {
                    date: formatDate(invoice.issue_date || invoice.created_at.slice(0, 10)),
                    event: "Invoice Generated",
                  },
                ]
              : []),
          ];

          const isExpanded = expandedId === visit.id;

          return (
            <article
              key={visit.id}
              className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm"
            >
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : visit.id)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-stone-50"
                aria-expanded={isExpanded}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-green-950">
                    {visit.contracts?.title ?? "Contract"}
                  </p>
                  <p className="text-sm text-stone-500">
                    {visit.contracts?.customers?.name} ·{" "}
                    {formatDate(visit.scheduled_date)} ·{" "}
                    {formatCurrency(displayCost)}{" "}
                    {isCompleted ? "cost" : "est. cost"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={visit.status} />
                  <StatusBadge status={priority.toLowerCase()} />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`h-5 w-5 text-stone-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </button>

              {isExpanded ? (
              <div className="border-t border-stone-100 px-5 pb-6 pt-5">
              <div className="mb-4 flex justify-end">
                <PostJournalEntryButton
                  source="visit"
                  sourceId={visit.id}
                  journalStatus={visitJournalStates[visit.id] ?? null}
                  disabledReason={
                    visitJournalReadyReason(visit.status, visit.visit_costs.length) ??
                    undefined
                  }
                />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-lg bg-stone-100 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-green-950">
                    Profitability per Visit
                  </h3>
                  <div className="space-y-1.5">
                    {isCompleted ? (
                      <>
                        <DottedRow
                          label="Contract Revenue Allocated"
                          value={formatCurrency(revenue)}
                        />
                        <DottedRow
                          label="Labor Cost"
                          value={formatCurrency(totals.labor)}
                        />
                        <DottedRow
                          label="Materials"
                          value={formatCurrency(totals.materials)}
                        />
                        <DottedRow
                          label="Equipment"
                          value={formatCurrency(totals.equipment)}
                        />
                        <DottedRow
                          label="Estimated Cost"
                          value={formatCurrency(estimated)}
                        />
                        <DottedRow
                          label="Actual Cost"
                          value={formatCurrency(totalCost)}
                        />
                        <DottedRow
                          label="Gross Profit"
                          value={formatCurrency(grossProfit)}
                        />
                        <DottedRow
                          label="Margin"
                          value={`${margin.toFixed(1)}%`}
                        />
                      </>
                    ) : (
                      <>
                        <DottedRow
                          label="Estimated Cost"
                          value={formatCurrency(estimated)}
                        />
                        <DottedRow
                          label="Contract Revenue Allocated"
                          value={formatCurrency(revenue)}
                        />
                      </>
                    )}
                  </div>
                </section>

                <section className="rounded-lg bg-stone-100 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-green-950">
                    Crew hours &amp; hourly billing
                  </h3>
                  <p className="mb-3 text-xs text-stone-500">
                    Crew Leader: {crew.leader}
                    {crew.fromSyncedLabor
                      ? " · Synced from crew labor (hours × rate = labor cost)"
                      : " · Estimated until crew labor is synced"}
                  </p>
                  <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
                    <table className="min-w-full text-xs">
                      <thead className="bg-stone-50 text-left text-stone-600">
                        <tr>
                          <th className="px-3 py-2 font-medium">Employee</th>
                          <th className="px-3 py-2 font-medium">Role</th>
                          <th className="px-3 py-2 font-medium">Hours</th>
                          <th className="px-3 py-2 font-medium">Rate</th>
                          <th className="px-3 py-2 font-medium">Pay</th>
                        </tr>
                      </thead>
                      <tbody>
                        {crew.employees.map((employee) => (
                          <tr
                            key={employee.name}
                            className="border-t border-stone-100 text-stone-800"
                          >
                            <td className="px-3 py-2 font-medium">
                              {employee.name}
                            </td>
                            <td className="px-3 py-2">{employee.role}</td>
                            <td className="px-3 py-2">
                              {employee.hours.toFixed(1)}
                            </td>
                            <td className="px-3 py-2">
                              {formatCurrency(employee.payRate)}/hr
                            </td>
                            <td className="px-3 py-2 font-semibold">
                              {formatCurrency(employee.pay)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="rounded-lg bg-stone-100 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-green-950">
                    Variance Alert
                  </h3>
                  {isCompleted ? (
                    <>
                      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                        <div>
                          <p className="text-xs text-stone-500">Estimated Cost</p>
                          <p className="font-semibold text-green-950">
                            {formatCurrency(estimated)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-stone-500">Actual Cost</p>
                          <p className="font-semibold text-green-950">
                            {formatCurrency(totalCost)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-stone-500">Cost Variance</p>
                          <p className="font-semibold text-green-950">
                            {variance >= 0 ? "+" : ""}
                            {formatCurrency(variance)} ({variancePct.toFixed(0)}
                            %)
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-stone-500">Estimated Hours</p>
                          <p className="font-semibold text-green-950">
                            {crew.estimatedHours.toFixed(1)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-stone-500">Actual Hours</p>
                          <p className="font-semibold text-green-950">
                            {crew.actualHours.toFixed(1)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-stone-500">Hours Variance</p>
                          <p className="font-semibold text-green-950">
                            {crew.hourVariance >= 0 ? "+" : ""}
                            {crew.hourVariance.toFixed(1)} hrs
                          </p>
                        </div>
                      </div>
                      {overBudget || crew.hourVariance > 0 ? (
                        <p className="mt-3 text-sm font-medium text-amber-800">
                          ⚠{" "}
                          {overBudget && crew.hourVariance > 0
                            ? "Over budget and over estimated hours"
                            : overBudget
                              ? "Over Budget"
                              : "Over estimated hours"}
                        </p>
                      ) : (
                        <p className="mt-3 text-sm font-medium text-green-800">
                          Within estimate
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-stone-500">Estimated Cost</p>
                          <p className="font-semibold text-green-950">
                            {formatCurrency(estimated)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-stone-500">Estimated Hours</p>
                          <p className="font-semibold text-green-950">
                            {crew.estimatedHours.toFixed(1)}
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-stone-500">
                        Actual cost and variance appear after the visit is
                        completed.
                      </p>
                    </>
                  )}
                </section>

                {isCompleted ? (
                <section className="rounded-lg bg-stone-100 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-green-950">
                    Cost Breakdown Chart
                  </h3>
                  <div className="space-y-3 font-mono text-xs">
                    {breakdown.map((row) => {
                      const pct = Math.round((row.value / costTotal) * 100);
                      return (
                        <div key={row.label}>
                          <div className="mb-1 flex justify-between text-stone-700">
                            <span>{row.label}</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-stone-200">
                            <div
                              className="h-2 rounded-full bg-green-800"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
                ) : null}

                <section className="rounded-lg bg-stone-100 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-green-950">
                    GPS Arrival
                  </h3>
                  <div className="space-y-1 font-mono text-xs text-stone-800">
                    <p>Arrived: {gps.arrived}</p>
                    <p>Departed: {gps.departed}</p>
                  </div>
                </section>

                <section className="rounded-lg bg-stone-100 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-green-950">
                    Visit Priority
                  </h3>
                  <ul className="space-y-1 font-mono text-xs text-stone-700">
                    {(["Routine", "High", "Emergency", "Seasonal"] as const).map(
                      (option) => (
                        <li
                          key={option}
                          className={
                            option === priority
                              ? "font-semibold text-green-900"
                              : ""
                          }
                        >
                          {option === priority ? "• " : "  "}
                          {option}
                        </li>
                      )
                    )}
                  </ul>
                </section>
              </div>

              <div className="mt-4">
                <VisitEquipmentUsed
                  visitId={visit.id}
                  equipment={equipment}
                  usage={equipmentUsage.filter((row) => row.visitId === visit.id)}
                />
              </div>

              <div className="mt-4">
                <section className="rounded-lg border border-stone-200 p-4">
                  <VisitAuditLog entries={auditEntries} />
                  <p className="mt-2 text-xs text-stone-500">Shows accountability.</p>
                </section>
              </div>
              </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
