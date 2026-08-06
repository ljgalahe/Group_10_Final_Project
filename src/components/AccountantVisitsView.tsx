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
import {
  equipmentForServices,
  materialsForServices,
} from "@/components/crew-lead/visitWorkDefaults";
import { visitJournalReadyReason, type JournalStatus } from "@/lib/journal";
import { formatCurrency, formatDate as formatDateLocal } from "@/lib/format";
import {
  allocatedVisitRevenue,
  crewDetailsForVisit,
  estimatedVisitCost,
  gpsTimes,
  sumCostsByType,
  visitPriority,
} from "@/lib/visit-accounting";

/** Stable calendar-day label for accountant Visits SSR/client hydration. */
function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return formatDateLocal(dateStr);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

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

/** Infer contracted services from the visit contract title for supply labeling. */
function servicesFromContractTitle(title?: string | null): string[] {
  if (!title) return [];
  const lower = title.toLowerCase();
  if (lower.includes("irrigation")) return ["Irrigation Inspection"];
  if (lower.includes("fertiliz")) return ["Fertilization"];
  if (lower.includes("pond")) return ["Detention Pond Maintenance"];
  if (lower.includes("cleanup") || lower.includes("spring")) {
    return ["Spring Cleanup"];
  }
  if (lower.includes("weed")) return ["Bed Weeding"];
  if (
    lower.includes("grounds") ||
    lower.includes("mow") ||
    lower.includes("lawn") ||
    lower.includes("landscape")
  ) {
    return ["Mowing", "Edging", "Trimming"];
  }
  return [];
}

function parseNamedItemsFromDescription(description: string | null): string[] {
  if (!description?.trim()) return [];
  return description
    .split(/,|\+|\/|;/)
    .map((part) =>
      part
        .replace(/\ballocation\b/gi, "")
        .replace(/\bwear\b/gi, "")
        .trim()
    )
    .filter((part) => part.length > 1)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1));
}

function uniqueNames(names: string[]): string[] {
  const map = new Map<string, string>();
  for (const name of names) {
    const key = name.toLowerCase();
    if (!map.has(key)) map.set(key, name);
  }
  return [...map.values()];
}

function allocateNamedAmounts(
  names: string[],
  total: number,
  seed: string
): Array<{ name: string; amount: number }> {
  if (names.length === 0) return [];
  if (total <= 0) return names.map((name) => ({ name, amount: 0 }));

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const weights = names.map((_, index) => 1 + ((hash + index * 17) % 5));
  const weightSum = weights.reduce((sum, w) => sum + w, 0);
  let remainingCents = Math.round(total * 100);

  return names.map((name, index) => {
    if (index === names.length - 1) {
      return { name, amount: remainingCents / 100 };
    }
    const share = Math.round((remainingCents * weights[index]) / weightSum);
    remainingCents -= share;
    return { name, amount: share / 100 };
  });
}

type SupplyLine = { name: string; amount: number; hours?: number };

function materialsUsedForVisit(
  visit: AccountantVisit,
  materialsTotal: number
): SupplyLine[] {
  const services = servicesFromContractTitle(visit.contracts?.title);
  const fromServices = materialsForServices(services);
  const fromCosts = visit.visit_costs
    .filter((cost) => cost.cost_type === "materials")
    .flatMap((row) => parseNamedItemsFromDescription(row.description));
  const names = uniqueNames(
    fromServices.length > 0 ? fromServices : fromCosts
  );
  return allocateNamedAmounts(names, materialsTotal, `${visit.id}:mat`);
}

function equipmentUsedForVisit(
  visit: AccountantVisit,
  equipmentTotal: number,
  usage: VisitEquipmentUsageRow[]
): SupplyLine[] {
  if (usage.length > 0) {
    return allocateNamedAmounts(
      usage.map((row) => row.equipmentName),
      equipmentTotal,
      `${visit.id}:eq-reg`
    ).map((row, index) => ({
      ...row,
      hours: usage[index]?.hours,
    }));
  }

  const services = servicesFromContractTitle(visit.contracts?.title);
  const fromServices = equipmentForServices(services);
  const fromCosts = visit.visit_costs
    .filter((cost) => cost.cost_type === "equipment")
    .flatMap((row) => parseNamedItemsFromDescription(row.description));
  const names = uniqueNames(
    fromServices.length > 0 ? fromServices : fromCosts
  );
  return allocateNamedAmounts(names, equipmentTotal, `${visit.id}:eq`);
}

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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "scheduled" | "completed"
  >("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [crewFilter, setCrewFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<
    "all" | "today" | "last_7" | "last_30" | "this_month" | "this_year"
  >("all");
  const [billingFilter, setBillingFilter] = useState<
    "all" | "ready_to_invoice" | "already_invoiced" | "journal_ready"
  >("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [visitsListOpen, setVisitsListOpen] = useState(false);
  const today = todayIso;
  const todayVisits = visits.filter((visit) => visit.scheduled_date === today);

  const toggleExpanded = (visitId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(visitId)) next.delete(visitId);
      else next.add(visitId);
      return next;
    });
  };

  const crewLabelForVisit = (visit: AccountantVisit) => {
    const assigned = visit.contracts?.assigned_crew?.trim();
    if (assigned) return assigned;
    return crewDetailsForVisit(
      visit.id,
      visit.contracts?.assigned_crew,
      null,
      null,
      visit.visit_labor_entries?.map((entry) => ({
        visit_id: entry.visit_id,
        member_demo_id: entry.member_demo_id,
        member_name: entry.member_name,
        member_role: entry.member_role,
        hours: Number(entry.hours),
        hourly_rate: Number(entry.hourly_rate),
        started_at: entry.started_at,
        ended_at: entry.ended_at,
      })),
      visit.visit_costs.find((c) => c.cost_type === "labor")?.description
    ).leader;
  };

  const customerOptions = useMemo(() => {
    const names = new Set<string>();
    for (const visit of visits) {
      const name = visit.contracts?.customers?.name?.trim();
      if (name) names.add(name);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [visits]);

  const crewOptions = useMemo(() => {
    const names = new Set<string>();
    for (const visit of visits) {
      names.add(crewLabelForVisit(visit));
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [visits]);

  const journalReadyIds = useMemo(() => {
    const ids = new Set<string>();
    for (const visit of visits) {
      if (visitJournalStates[visit.id]) continue;
      if (visitJournalReadyReason(visit.status, visit.visit_costs.length) == null) {
        ids.add(visit.id);
      }
    }
    return ids;
  }, [visits, visitJournalStates]);

  const journalReadyCount = journalReadyIds.size;

  const inDateRange = (scheduledDate: string) => {
    if (dateRangeFilter === "all") return true;
    const visitDay = scheduledDate.slice(0, 10);
    if (dateRangeFilter === "today") return visitDay === today;
    if (dateRangeFilter === "this_year") {
      return visitDay.startsWith(`${today.slice(0, 4)}-`);
    }
    if (dateRangeFilter === "this_month") {
      return visitDay.startsWith(today.slice(0, 7));
    }
    const visitTs = Date.parse(`${visitDay}T00:00:00Z`);
    const todayTs = Date.parse(`${today}T00:00:00Z`);
    if (!Number.isFinite(visitTs) || !Number.isFinite(todayTs)) return true;
    const dayMs = 86_400_000;
    if (dateRangeFilter === "last_7") {
      return visitTs >= todayTs - 6 * dayMs && visitTs <= todayTs;
    }
    if (dateRangeFilter === "last_30") {
      return visitTs >= todayTs - 29 * dayMs && visitTs <= todayTs;
    }
    return true;
  };

  const filteredVisits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return visits.filter((visit) => {
      if (statusFilter !== "all" && visit.status !== statusFilter) return false;

      const customerName = visit.contracts?.customers?.name ?? "";
      if (customerFilter !== "all" && customerName !== customerFilter) return false;

      if (crewFilter !== "all" && crewLabelForVisit(visit) !== crewFilter) {
        return false;
      }

      if (!inDateRange(visit.scheduled_date)) return false;

      if (billingFilter === "ready_to_invoice") {
        if (visit.status !== "completed" || visit.invoices.length > 0) return false;
      } else if (billingFilter === "already_invoiced") {
        if (visit.status !== "completed" || visit.invoices.length === 0) return false;
      } else if (billingFilter === "journal_ready") {
        if (!journalReadyIds.has(visit.id)) return false;
      }

      if (q) {
        const haystack = [
          visit.contracts?.title,
          customerName,
          visit.crew_notes,
          visit.status,
          visit.scheduled_date,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [
    visits,
    searchQuery,
    statusFilter,
    customerFilter,
    crewFilter,
    dateRangeFilter,
    billingFilter,
    journalReadyIds,
    today,
  ]);

  const metrics = visits.reduce(
    (acc, visit) => {
      const totals = sumCostsByType(visit.visit_costs);
      const revenue = allocatedVisitRevenue(
        visit.contracts?.monthly_fee,
        visit.contracts?.visits_per_week
      );
      const laborCost = visit.visit_costs.find((cost) => cost.cost_type === "labor");
      const hours =
        laborCost?.quantity != null && Number(laborCost.quantity) > 0
          ? Number(laborCost.quantity)
          : (visit.visit_labor_entries ?? []).reduce(
              (sum, entry) => sum + Number(entry.hours),
              0
            );
      acc.labor += totals.labor;
      acc.materials += totals.materials;
      acc.equipment += totals.equipment;
      acc.revenue += revenue;
      acc.hours += hours;
      return acc;
    },
    { labor: 0, materials: 0, equipment: 0, revenue: 0, hours: 0 }
  );

  const invoicesReady = visits.filter(
    (visit) => visit.status === "completed" && visit.invoices.length === 0
  ).length;
  const profit = metrics.revenue - (metrics.labor + metrics.materials + metrics.equipment);
  const summaryVisits = todayVisits.length || visits.length;

  return (
    <div className="space-y-6" suppressHydrationWarning>
      <div className="rounded-xl border border-stone-200 bg-stone-100 p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-green-950">
          Accounting Metrics
        </p>
        <div className="gs-kpi-grid">
          <StatCard
            label="Today's Visits"
            value={todayVisits.length || summaryVisits}
            hint={todayVisits.length ? "Scheduled today" : "All tracked visits"}
          />
          <StatCard
            label="Crew Hours"
            value={metrics.hours.toLocaleString("en-US", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
            hint="Synced from crew labor"
          />
          <StatCard label="Labor Cost" value={formatCurrency(metrics.labor)} />
          <StatCard
            label="Material Cost"
            value={formatCurrency(metrics.materials)}
          />
          <StatCard
            label="Equipment Cost"
            value={formatCurrency(metrics.equipment)}
          />
          <StatCard label="Revenue" value={formatCurrency(metrics.revenue)} />
          <StatCard label="Profit" value={formatCurrency(profit)} />
          <StatCard
            label="Invoices Ready"
            value={invoicesReady}
            hint="Completed visits not yet invoiced"
          />
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-stone-100 p-4 shadow-sm">
        <label className="relative mb-3 block">
          <span className="sr-only">Search visits</span>
          <span
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400"
            aria-hidden
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3-3" />
            </svg>
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search..."
            className="w-full rounded-lg border border-stone-300 bg-white py-2.5 pl-9 pr-3 text-sm text-stone-800 shadow-sm placeholder:text-stone-400 focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700"
          />
        </label>
        <div className="flex flex-col gap-2.5">
          <label className="block">
            <span className="sr-only">Visit Status</span>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as "all" | "scheduled" | "completed"
                )
              }
              className="w-full appearance-none rounded-lg border border-stone-300 bg-white bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat px-3 py-2.5 pr-9 text-sm font-medium text-stone-700 shadow-sm focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2378716c'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
              }}
            >
              <option value="all">Visit Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Customer</span>
            <select
              value={customerFilter}
              onChange={(event) => setCustomerFilter(event.target.value)}
              className="w-full appearance-none rounded-lg border border-stone-300 bg-white bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat px-3 py-2.5 pr-9 text-sm font-medium text-stone-700 shadow-sm focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2378716c'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
              }}
            >
              <option value="all">Customer</option>
              {customerOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Crew</span>
            <select
              value={crewFilter}
              onChange={(event) => setCrewFilter(event.target.value)}
              className="w-full appearance-none rounded-lg border border-stone-300 bg-white bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat px-3 py-2.5 pr-9 text-sm font-medium text-stone-700 shadow-sm focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2378716c'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
              }}
            >
              <option value="all">Crew</option>
              {crewOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Date Range</span>
            <select
              value={dateRangeFilter}
              onChange={(event) =>
                setDateRangeFilter(
                  event.target.value as
                    | "all"
                    | "today"
                    | "last_7"
                    | "last_30"
                    | "this_month"
                    | "this_year"
                )
              }
              className="w-full appearance-none rounded-lg border border-stone-300 bg-white bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat px-3 py-2.5 pr-9 text-sm font-medium text-stone-700 shadow-sm focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2378716c'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
              }}
            >
              <option value="all">Date Range</option>
              <option value="today">Today</option>
              <option value="last_7">Last 7 days</option>
              <option value="last_30">Last 30 days</option>
              <option value="this_month">This month</option>
              <option value="this_year">This year</option>
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Billing Status</span>
            <select
              value={billingFilter}
              onChange={(event) =>
                setBillingFilter(
                  event.target.value as
                    | "all"
                    | "ready_to_invoice"
                    | "already_invoiced"
                    | "journal_ready"
                )
              }
              className="w-full appearance-none rounded-lg border border-stone-300 bg-white bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat px-3 py-2.5 pr-9 text-sm font-medium text-stone-700 shadow-sm focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2378716c'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
              }}
            >
              <option value="all">Billing Status</option>
              <option value="ready_to_invoice">Ready to invoice</option>
              <option value="already_invoiced">Already invoiced</option>
              <option value="journal_ready">
                Journal ready
                {journalReadyCount > 0
                  ? ` (${journalReadyCount.toLocaleString("en-US")})`
                  : ""}
              </option>
            </select>
          </label>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setVisitsListOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-stone-50"
          aria-expanded={visitsListOpen}
        >
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-green-950">Visits</h2>
            <p className="text-sm text-stone-500">
              {filteredVisits.length.toLocaleString("en-US")} matching{" "}
              {filteredVisits.length === 1 ? "visit" : "visits"}
            </p>
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`h-5 w-5 shrink-0 text-stone-500 transition-transform ${
              visitsListOpen ? "rotate-180" : ""
            }`}
            aria-hidden
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {visitsListOpen ? (
          <div className="space-y-5 border-t border-stone-100 px-4 py-4 sm:px-5">
            {filteredVisits.length === 0 ? (
              <EmptyState message="No visits match the selected filters." />
            ) : null}
            {filteredVisits.map((visit) => {
          const totals = sumCostsByType(visit.visit_costs);
          const totalCost = totals.labor + totals.materials + totals.equipment;
          const revenue = allocatedVisitRevenue(
            visit.contracts?.monthly_fee,
            visit.contracts?.visits_per_week
          );
          const grossProfit = revenue - totalCost;
          const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
          const estimated = estimatedVisitCost(totalCost, visit.id);
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
          const visitUsage = equipmentUsage.filter(
            (row) => row.visitId === visit.id
          );
          const equipmentUsed = equipmentUsedForVisit(
            visit,
            totals.equipment,
            visitUsage
          );
          const isCompleted = visit.status === "completed";
          const isExpanded = expandedIds.has(visit.id);
          const materialsUsed = isExpanded
            ? materialsUsedForVisit(visit, totals.materials)
            : [];
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

          const journalReady = journalReadyIds.has(visit.id);

          return (
            <article
              key={visit.id}
              className={`overflow-hidden rounded-xl border bg-white shadow-sm ${
                journalReady
                  ? "border-amber-300 ring-1 ring-amber-200"
                  : "border-stone-200"
              }`}
            >
              <button
                type="button"
                onClick={() => toggleExpanded(visit.id)}
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
                    {formatCurrency(totalCost)} cost
                  </p>
                  {isCompleted && equipmentUsed.length > 0 ? (
                    <p className="mt-1 text-xs text-stone-500">
                      Equipment:{" "}
                      {equipmentUsed.map((row) => row.name).join(", ")}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {journalReady ? (
                    <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                      Journal ready
                    </span>
                  ) : null}
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
                      label="Total Cost"
                      value={formatCurrency(totalCost)}
                    />
                    <DottedRow
                      label="Gross Profit"
                      value={formatCurrency(grossProfit)}
                    />
                    <DottedRow label="Margin" value={`${margin.toFixed(1)}%`} />
                  </div>
                </section>

                <section className="rounded-lg bg-stone-100 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-green-950">
                    Crew Hours &amp; Hourly Billing
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
                        {formatCurrency(variance)} ({variancePct.toFixed(0)}%)
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
                </section>

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
                <section className="rounded-lg bg-stone-100 p-4">
                  <h3 className="mb-1 text-sm font-semibold text-green-950">
                    Materials &amp; Equipment Used
                  </h3>
                  <p className="mb-3 text-xs text-stone-500">
                    {isCompleted
                      ? "Specific materials and equipment charged to this completed job."
                      : "Planned supplies for this visit — finalized when the job is completed."}
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-md border border-stone-200 bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                        Materials
                      </p>
                      {materialsUsed.length === 0 ? (
                        <p className="mt-2 text-sm text-stone-400">
                          No materials recorded
                        </p>
                      ) : (
                        <ul className="mt-2 space-y-1.5 text-sm text-stone-800">
                          {materialsUsed.map((row) => (
                            <li
                              key={row.name}
                              className="flex items-start justify-between gap-3"
                            >
                              <span>{row.name}</span>
                              <span className="shrink-0 font-medium tabular-nums text-green-900">
                                {formatCurrency(row.amount)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="mt-2 border-t border-stone-100 pt-2 text-sm text-stone-700">
                        Materials total:{" "}
                        <span className="font-semibold text-green-900">
                          {formatCurrency(totals.materials)}
                        </span>
                      </p>
                    </div>
                    <div className="rounded-md border border-stone-200 bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                        Equipment
                      </p>
                      {equipmentUsed.length === 0 ? (
                        <p className="mt-2 text-sm text-stone-400">
                          No equipment recorded
                        </p>
                      ) : (
                        <ul className="mt-2 space-y-1.5 text-sm text-stone-800">
                          {equipmentUsed.map((row) => (
                            <li
                              key={row.name}
                              className="flex items-start justify-between gap-3"
                            >
                              <span>
                                {row.name}
                                {row.hours != null ? (
                                  <span className="text-stone-500">
                                    {" "}
                                    · {row.hours.toFixed(1)} hrs
                                  </span>
                                ) : null}
                              </span>
                              <span className="shrink-0 font-medium tabular-nums text-green-900">
                                {formatCurrency(row.amount)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="mt-2 border-t border-stone-100 pt-2 text-sm text-stone-700">
                        Equipment total:{" "}
                        <span className="font-semibold text-green-900">
                          {formatCurrency(totals.equipment)}
                        </span>
                      </p>
                    </div>
                  </div>
                </section>
              </div>

              <div className="mt-4">
                <VisitEquipmentUsed
                  visitId={visit.id}
                  equipment={equipment}
                  usage={visitUsage}
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
        ) : null}
      </section>
    </div>
  );
}
