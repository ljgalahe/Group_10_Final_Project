"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, EmptyState, StatCard, StatusBadge } from "@/components/ui";
import { chatHrefForEquipmentReplacement } from "@/lib/chat-demo";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  createEquipment,
  logEquipmentHours,
  reactivateEquipment,
  retireEquipment,
  updateEquipment,
} from "./actions";
import {
  accumulatedDepreciation,
  bookValue,
  hoursRemaining,
  nonDepreciableBookValue,
} from "./equipment-math";
import {
  EQUIPMENT_CATEGORIES,
  aggregateEquipmentRevenue,
  categoryIsDepreciable,
  categoryTracksUsefulLife,
  type CompletedVisitOption,
  type EquipmentCategory,
  type EquipmentReportData,
  type EquipmentRow,
  type EquipmentUsageRow,
} from "./equipment-types";

type Props = {
  report: EquipmentReportData;
  usage: EquipmentUsageRow[];
  visits: CompletedVisitOption[];
};

type FormMode = "closed" | "create" | "edit";

/** Circular life meter: fills as remaining life approaches 0%. */
function LifeRemainingRing({
  remainingHours,
  estimatedHours,
}: {
  remainingHours: number;
  estimatedHours: number;
}) {
  const remainingPct =
    estimatedHours > 0
      ? Math.max(
          0,
          Math.min(100, (remainingHours / estimatedHours) * 100)
        )
      : 0;
  const fillPct = 100 - remainingPct;
  const color =
    remainingPct >= 50
      ? "#15803d"
      : remainingPct >= 25
        ? "#ca8a04"
        : "#dc2626";

  const size = 28;
  const stroke = 3.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - fillPct / 100);
  const label = `${remainingPct.toFixed(0)}% life remaining`;

  return (
    <span
      className="relative inline-flex"
      title={label}
      aria-label={label}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="shrink-0 -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e7e5e4"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
    </span>
  );
}

function AssetForm({
  mode,
  initial,
  onClose,
}: {
  mode: FormMode;
  initial?: EquipmentRow | null;
  onClose: () => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<EquipmentCategory>(
    initial?.category ?? "Mowers"
  );

  if (mode === "closed") return null;

  const hideDepreciationFields = !categoryTracksUsefulLife(selectedCategory);

  async function handleSubmit(formData: FormData) {
    if (mode === "edit") {
      await updateEquipment(formData);
    } else {
      await createEquipment(formData);
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="equipment-form-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-stone-200 bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3
              id="equipment-form-title"
              className="text-lg font-semibold text-green-950"
            >
              {mode === "edit" ? "Edit equipment" : "Add equipment"}
            </h3>
            <p className="mt-0.5 text-sm text-stone-500">
              {hideDepreciationFields
                ? "Hand/power tools are tracked without salvage or life-hour depreciation."
                : "Unit-of-production uses estimated life hours with cost and salvage."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-stone-500 hover:bg-stone-100 hover:text-stone-800"
          >
            Close
          </button>
        </div>
        <form
          action={handleSubmit}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {mode === "edit" && initial ? (
            <input type="hidden" name="id" value={initial.id} />
          ) : null}
          <label className="block text-sm sm:col-span-2 lg:col-span-2">
            <span className="text-stone-600">Name</span>
            <input
              name="name"
              required
              defaultValue={initial?.name ?? ""}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-stone-600">Category</span>
            <select
              name="category"
              value={selectedCategory}
              onChange={(e) =>
                setSelectedCategory(e.target.value as EquipmentCategory)
              }
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            >
              {EQUIPMENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-stone-600">Purchase date</span>
            <input
              type="date"
              name="purchase_date"
              required
              defaultValue={initial?.purchase_date ?? ""}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-stone-600">Cost</span>
            <input
              type="number"
              name="cost"
              min={0}
              step="0.01"
              required
              defaultValue={initial?.cost ?? ""}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
          {hideDepreciationFields ? (
            <>
              <input type="hidden" name="salvage_value" value="0" />
              <input type="hidden" name="estimated_total_hours" value="1" />
            </>
          ) : (
            <>
              <label className="block text-sm">
                <span className="text-stone-600">Salvage value</span>
                <input
                  type="number"
                  name="salvage_value"
                  min={0}
                  step="0.01"
                  required
                  defaultValue={initial?.salvage_value ?? 0}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="text-stone-600">Estimated life hours</span>
                <input
                  type="number"
                  name="estimated_total_hours"
                  min={0.01}
                  step="0.01"
                  required
                  defaultValue={initial?.estimated_total_hours ?? ""}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </label>
            </>
          )}
          <label className="block text-sm sm:col-span-2 lg:col-span-3">
            <span className="text-stone-600">Notes</span>
            <input
              name="notes"
              defaultValue={initial?.notes ?? ""}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              className="rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-900"
            >
              {mode === "edit" ? "Save changes" : "Add equipment"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EquipmentReport({ report, usage, visits }: Props) {
  const { assets, jobs, companyRevenue } = report;
  const [category, setCategory] = useState<"All" | EquipmentCategory>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | "active" | "retired">(
    "active"
  );
  const [formMode, setFormMode] = useState<FormMode>("closed");
  const [editing, setEditing] = useState<EquipmentRow | null>(null);
  const [detailAsset, setDetailAsset] = useState<EquipmentRow | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [companyFilter, setCompanyFilter] = useState<string>("All");
  const [equipmentFilter, setEquipmentFilter] = useState<string>("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const companies = useMemo(() => {
    const names = new Set<string>();
    for (const row of usage) {
      if (row.customer_name) names.add(row.customer_name);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [usage]);

  const usageEquipmentOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const row of usage) {
      if (!byId.has(row.equipment_id)) {
        byId.set(row.equipment_id, row.equipment_name);
      }
    }
    return Array.from(byId.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [usage]);

  const filteredUsage = useMemo(() => {
    return usage.filter((row) => {
      if (companyFilter !== "All" && row.customer_name !== companyFilter) {
        return false;
      }
      if (equipmentFilter !== "All" && row.equipment_id !== equipmentFilter) {
        return false;
      }
      const date = row.visit_date || row.used_on;
      if (dateFrom && date < dateFrom) return false;
      if (dateTo && date > dateTo) return false;
      return true;
    });
  }, [usage, companyFilter, equipmentFilter, dateFrom, dateTo]);

  const jobsInRange = useMemo(() => {
    return jobs.filter((job) => {
      if (dateFrom && job.visit_date < dateFrom) return false;
      if (dateTo && job.visit_date > dateTo) return false;
      return true;
    });
  }, [jobs, dateFrom, dateTo]);

  const revenueAssets = useMemo(
    () => aggregateEquipmentRevenue(assets, jobsInRange),
    [assets, jobsInRange]
  );

  const allocatedRevenueTotal = useMemo(
    () =>
      Math.round(
        revenueAssets.reduce((sum, a) => sum + a.revenue_produced, 0) * 100
      ) / 100,
    [revenueAssets]
  );

  const companyRevenueInView = useMemo(() => {
    // Job revenues in range sum to the invoice dollars attributed to those jobs.
    return (
      Math.round(
        jobsInRange.reduce((sum, job) => sum + job.job_revenue, 0) * 100
      ) / 100
    );
  }, [jobsInRange]);

  const enriched = useMemo(() => {
    return revenueAssets.map((a) => {
      if (!categoryIsDepreciable(a.category)) {
        return {
          ...a,
          accum: 0,
          book: nonDepreciableBookValue(a.cost),
          remaining: hoursRemaining(a.estimated_total_hours, a.hours_used),
        };
      }
      const accum = accumulatedDepreciation(
        a.cost,
        a.salvage_value,
        a.estimated_total_hours,
        a.hours_used
      );
      const book = bookValue(
        a.cost,
        a.salvage_value,
        a.estimated_total_hours,
        a.hours_used
      );
      return {
        ...a,
        accum,
        book,
        remaining: hoursRemaining(a.estimated_total_hours, a.hours_used),
      };
    });
  }, [revenueAssets]);

  const filtered = useMemo(() => {
    return enriched.filter((a) => {
      if (category !== "All" && a.category !== category) return false;
      if (statusFilter !== "All" && a.status !== statusFilter) return false;
      return true;
    });
    // already sorted by revenue desc from aggregateEquipmentRevenue
  }, [enriched, category, statusFilter]);

  const totals = useMemo(() => {
    const source = filtered;
    return {
      cost: source.reduce((s, a) => s + a.cost, 0),
      accum: source.reduce((s, a) => s + a.accum, 0),
      book: source.reduce((s, a) => s + a.book, 0),
      revenue: source.reduce((s, a) => s + a.revenue_produced, 0),
    };
  }, [filtered]);

  /** Active assets at or near end of useful life hours (≤10% remaining). */
  const replaceSoon = useMemo(() => {
    return enriched
      .filter((a) => {
        if (!categoryTracksUsefulLife(a.category)) return false;
        if (a.status !== "active") return false;
        if (a.estimated_total_hours <= 0) return false;
        const lifeLeft = a.remaining / a.estimated_total_hours;
        return lifeLeft <= 0.1;
      })
      .sort((a, b) => a.remaining - b.remaining);
  }, [enriched]);

  // Keep detail panel in sync when date filters change.
  const detailAssetLive = useMemo(() => {
    if (!detailAsset) return null;
    return filtered.find((a) => a.id === detailAsset.id) ?? detailAsset;
  }, [detailAsset, filtered]);

  function openCreate() {
    setEditing(null);
    setFormMode("create");
  }

  function openEdit(row: EquipmentRow) {
    setEditing(row);
    setFormMode("edit");
  }

  const costLabel =
    category === "All" ? "Total Acquisition Cost" : `${category} Acquisition Cost`;
  const accumLabel =
    category === "All"
      ? "Accumulated Depreciation"
      : `${category} Accumulated Depreciation`;
  const bookLabel =
    category === "All" ? "Net Book Value" : `${category} Net Book Value`;
  const revenueLabel =
    category === "All"
      ? "Allocated Job Revenue"
      : `${category} Allocated Job Revenue`;
  const showDepreciationStats =
    category === "All" || categoryIsDepreciable(category);

  return (
    <>
      <div className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] lg:items-stretch">
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="block text-sm">
              <span className="text-stone-600">Category</span>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as "All" | EquipmentCategory)
                }
                className="mt-1 block w-full min-w-[11rem] max-w-xs rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
              >
                <option value="All">All categories</option>
                {EQUIPMENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-stone-600">Revenue from</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="mt-1 block rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-stone-600">Revenue to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="mt-1 block rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            {dateFrom || dateTo ? (
              <button
                type="button"
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                }}
                className="self-end pb-2 text-sm font-medium text-stone-600 underline-offset-2 hover:underline"
              >
                Clear dates
              </button>
            ) : null}
          </div>
          <p className="text-xs text-stone-500">
            Job revenue = share of billed invoices. Split across equipment by
            hours on each job (evenly if hours are missing). Allocated{" "}
            {formatCurrency(allocatedRevenueTotal)}
            {dateFrom || dateTo
              ? ` in range (jobs ${formatCurrency(companyRevenueInView)})`
              : ` of ${formatCurrency(companyRevenue)} company revenue`}
            .
          </p>
          <div
            className={`grid grid-cols-1 gap-4 ${
              showDepreciationStats
                ? "sm:grid-cols-2 xl:grid-cols-4"
                : "sm:grid-cols-2"
            }`}
          >
            <StatCard label={costLabel} value={formatCurrency(totals.cost)} />
            {showDepreciationStats ? (
              <>
                <StatCard
                  label={accumLabel}
                  value={formatCurrency(totals.accum)}
                />
                <StatCard
                  label={bookLabel}
                  value={formatCurrency(totals.book)}
                />
              </>
            ) : null}
            <StatCard
              label={revenueLabel}
              value={formatCurrency(totals.revenue)}
            />
          </div>
        </div>
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            replaceSoon.length > 0
              ? "border-amber-300 bg-amber-50 text-amber-950"
              : "border-stone-200 bg-stone-50 text-stone-700"
          }`}
          role="status"
        >
          <p className="font-semibold tracking-tight">
            {replaceSoon.length > 0
              ? "Replacement alert"
              : "No replacements due"}
          </p>
          {replaceSoon.length > 0 ? (
            <>
              <p className="mt-1 text-amber-900/90">
                Plan to replace equipment at ≤10% of estimated life hours
                remaining:
              </p>
              <ul className="mt-2 space-y-1.5">
                {replaceSoon.map((a) => (
                  <li key={a.id} className="leading-snug">
                    <span className="font-medium">{a.name}</span>
                    <span className="text-amber-800/80">
                      {" "}
                      — {a.remaining.toFixed(1)} hrs left (
                      {((a.remaining / a.estimated_total_hours) * 100).toFixed(
                        0
                      )}
                      %)
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href={chatHrefForEquipmentReplacement(replaceSoon)}
                className="mt-3 inline-flex rounded-md border border-amber-700 bg-white px-3 py-1.5 text-xs font-medium text-amber-950 hover:bg-amber-100"
              >
                Message team in Chat
              </Link>
            </>
          ) : (
            <p className="mt-1 text-stone-600">
              No active assets are within 10% of their estimated life hours.
            </p>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block text-sm">
            <span className="text-stone-600">Category</span>
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as "All" | EquipmentCategory)
              }
              className="mt-1 block min-w-[11rem] rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
            >
              <option value="All">All categories</option>
              {EQUIPMENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-stone-600">Status</span>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as "All" | "active" | "retired"
                )
              }
              className="mt-1 block min-w-[9rem] rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
            >
              <option value="All">All</option>
              <option value="active">Active</option>
              <option value="retired">Retired</option>
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-green-800 px-3 py-2 text-sm font-medium text-white hover:bg-green-900"
        >
          Add equipment
        </button>
      </div>

      <AssetForm
        mode={formMode}
        initial={editing}
        onClose={() => {
          setFormMode("closed");
          setEditing(null);
        }}
      />

      {detailAssetLive ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="equipment-detail-title"
          onClick={() => setDetailAsset(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-stone-200 bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3
                  id="equipment-detail-title"
                  className="text-lg font-semibold text-green-950"
                >
                  {detailAssetLive.name}
                </h3>
                <p className="mt-0.5 text-sm text-stone-500">
                  Allocated job revenue
                  {dateFrom || dateTo ? " in the selected date range" : ""}:{" "}
                  {formatCurrency(detailAssetLive.revenue_produced)} across{" "}
                  {detailAssetLive.jobs_count} job
                  {detailAssetLive.jobs_count === 1 ? "" : "s"}
                  {detailAssetLive.jobs_count > 0
                    ? ` (avg ${formatCurrency(detailAssetLive.avg_revenue_per_job)}/job)`
                    : ""}
                  . Hours used (all time): {detailAssetLive.hours_used.toFixed(1)}
                  {detailAssetLive.estimated_total_hours > 0
                    ? ` of ${detailAssetLive.estimated_total_hours.toLocaleString()} estimated`
                    : ""}
                  .
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailAsset(null)}
                className="rounded-md px-2 py-1 text-sm text-stone-500 hover:bg-stone-100 hover:text-stone-800"
              >
                Close
              </button>
            </div>
            {detailAssetLive.contracts_worked.length === 0 ? (
              <div className="space-y-3">
                <EmptyState message="No contract usage logged for this equipment in the selected range." />
                {detailAssetLive.hours_used > 0 ? (
                  <p className="text-sm text-stone-600">
                    Total hours used (all time):{" "}
                    <span className="font-semibold tabular-nums text-stone-900">
                      {detailAssetLive.hours_used.toFixed(1)}
                    </span>
                  </p>
                ) : null}
              </div>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-stone-200 bg-stone-50 text-left text-stone-600">
                  <tr>
                    <th className="px-2 py-2 font-medium">Contract</th>
                    <th className="px-2 py-2 font-medium">Customer</th>
                    <th className="px-2 py-2 font-medium">Jobs</th>
                    <th className="px-2 py-2 font-medium">Hours</th>
                    <th className="px-2 py-2 font-medium">Allocated Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {detailAssetLive.contracts_worked.map((c) => (
                    <tr key={c.contract_id}>
                      <td className="px-2 py-2.5 font-medium text-stone-900">
                        {c.contract_title}
                      </td>
                      <td className="px-2 py-2.5 text-stone-600">
                        {c.customer_name}
                      </td>
                      <td className="px-2 py-2.5 tabular-nums">{c.jobs}</td>
                      <td className="px-2 py-2.5 tabular-nums">
                        {c.hours.toFixed(1)}
                      </td>
                      <td className="px-2 py-2.5 tabular-nums text-green-950">
                        {formatCurrency(c.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-stone-200">
                    <td
                      className="px-2 py-2.5 text-sm font-semibold text-stone-700"
                      colSpan={2}
                    >
                      Total
                    </td>
                    <td className="px-2 py-2.5 text-sm font-semibold tabular-nums text-stone-900">
                      {detailAssetLive.jobs_count}
                    </td>
                    <td className="px-2 py-2.5 text-sm font-semibold tabular-nums text-stone-900">
                      {detailAssetLive.contracts_worked
                        .reduce((sum, c) => sum + c.hours, 0)
                        .toFixed(1)}
                    </td>
                    <td className="px-2 py-2.5 text-sm font-semibold tabular-nums text-green-950">
                      {formatCurrency(detailAssetLive.revenue_produced)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      ) : null}

      <Card className="mb-8 overflow-x-auto">
        <h2 className="mb-1 text-lg font-semibold text-green-950">
          Equipment Register
        </h2>
        <p className="mb-4 text-sm text-stone-500">
          Sorted by allocated job revenue (highest first). Click a row for
          contract detail.
        </p>
        {filtered.length === 0 ? (
          <EmptyState message="No equipment matches these filters." />
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-left text-stone-600">
              <tr>
                <th className="px-2 py-2 font-medium">Name</th>
                <th className="px-2 py-2 font-medium">Cost</th>
                <th className="px-2 py-2 font-medium">Acc. Dep.</th>
                <th className="px-2 py-2 font-medium">Book Value</th>
                <th className="px-2 py-2 font-medium">Allocated Revenue</th>
                <th className="px-2 py-2 font-medium">Jobs</th>
                <th className="px-2 py-2 font-medium">Avg $/Job</th>
                <th className="px-2 py-2 font-medium">Rev / Cost</th>
                <th className="px-2 py-2 font-medium">Life Left</th>
                <th className="px-2 py-2 font-medium">Status</th>
                <th className="px-2 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  className="align-top cursor-pointer hover:bg-green-50/60"
                  onClick={() => setDetailAsset(row)}
                >
                  <td className="px-2 py-2.5 font-medium text-stone-900">
                    {row.name}
                    <span className="mt-0.5 block text-xs font-normal text-stone-400">
                      {row.category}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 tabular-nums">
                    {formatCurrency(row.cost)}
                  </td>
                  <td className="px-2 py-2.5 tabular-nums">
                    {categoryIsDepreciable(row.category)
                      ? formatCurrency(row.accum)
                      : ""}
                  </td>
                  <td className="px-2 py-2.5 font-medium tabular-nums text-green-950">
                    {formatCurrency(row.book)}
                  </td>
                  <td className="px-2 py-2.5 tabular-nums font-medium text-stone-800">
                    {formatCurrency(row.revenue_produced)}
                  </td>
                  <td className="px-2 py-2.5 tabular-nums text-stone-700">
                    {row.jobs_count}
                  </td>
                  <td className="px-2 py-2.5 tabular-nums text-stone-700">
                    {row.jobs_count > 0
                      ? formatCurrency(row.avg_revenue_per_job)
                      : "—"}
                  </td>
                  <td className="px-2 py-2.5 tabular-nums text-stone-700">
                    {row.cost > 0 ? `${row.revenue_per_cost.toFixed(2)}×` : "—"}
                  </td>
                  <td className="px-2 py-2.5">
                    {categoryTracksUsefulLife(row.category) ? (
                      <LifeRemainingRing
                        remainingHours={row.remaining}
                        estimatedHours={row.estimated_total_hours}
                      />
                    ) : null}
                  </td>
                  <td className="px-2 py-2.5">
                    <StatusBadge status={row.status} />
                  </td>
                  <td
                    className="px-2 py-2.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="text-left text-xs font-medium text-green-800 hover:underline"
                      >
                        Edit
                      </button>
                      {row.status === "active" ? (
                        <form action={retireEquipment}>
                          <input type="hidden" name="id" value={row.id} />
                          <button
                            type="submit"
                            className="text-left text-xs font-medium text-amber-800 hover:underline"
                          >
                            Retire
                          </button>
                        </form>
                      ) : (
                        <form action={reactivateEquipment}>
                          <input type="hidden" name="id" value={row.id} />
                          <button
                            type="submit"
                            className="text-left text-xs font-medium text-green-800 hover:underline"
                          >
                            Reactivate
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-green-950">
              Hours Used During Visits
            </h2>
            <p className="mt-0.5 text-sm text-stone-500">
              Logged equipment hours on completed visits drive unit-of-production
              depreciation.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block text-sm">
              <span className="text-stone-600">Company</span>
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="mt-1 block min-w-[14rem] rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
              >
                <option value="All">All companies</option>
                {companies.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-stone-600">Equipment</span>
              <select
                value={equipmentFilter}
                onChange={(e) => setEquipmentFilter(e.target.value)}
                className="mt-1 block min-w-[14rem] rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
              >
                <option value="All">All equipment</option>
                {usageEquipmentOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => setLogOpen((o) => !o)}
              className="rounded-lg border border-green-800 px-3 py-2 text-sm font-medium text-green-900 hover:bg-green-50"
            >
              {logOpen ? "Hide log form" : "Log hours"}
            </button>
          </div>
        </div>

        {logOpen ? (
          <form
            action={logEquipmentHours}
            className="mb-6 grid gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <label className="block text-sm sm:col-span-2">
              <span className="text-stone-600">Equipment</span>
              <select
                name="equipment_id"
                required
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2"
                defaultValue=""
              >
                <option value="" disabled>
                  Select equipment
                </option>
                {assets
                  .filter((a) => a.status === "active")
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-stone-600">Completed visit</span>
              <select
                name="visit_id"
                required
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2"
                defaultValue=""
              >
                <option value="" disabled>
                  Select visit
                </option>
                {visits.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-stone-600">Hours</span>
              <input
                type="number"
                name="hours"
                min={0.01}
                step="0.01"
                required
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2"
              />
            </label>
            <label className="block text-sm sm:col-span-2 lg:col-span-2">
              <span className="text-stone-600">Notes</span>
              <input
                name="notes"
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2"
              />
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                className="rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-900"
              >
                Save hours
              </button>
            </div>
          </form>
        ) : null}

        {usage.length === 0 ? (
          <EmptyState message="No equipment hours logged against visits yet." />
        ) : filteredUsage.length === 0 ? (
          <EmptyState message="No hours logged for these filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-left text-stone-600">
                <tr>
                  <th className="px-2 py-2 font-medium">Date</th>
                  <th className="px-2 py-2 font-medium">Visit / Contract</th>
                  <th className="px-2 py-2 font-medium">Equipment</th>
                  <th className="px-2 py-2 font-medium">Hours</th>
                  <th className="px-2 py-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredUsage.map((row) => (
                  <tr key={row.id}>
                    <td className="px-2 py-2.5 tabular-nums text-stone-700">
                      {formatDate(row.used_on)}
                    </td>
                    <td className="px-2 py-2.5">
                      <span className="font-medium text-stone-900">
                        {row.customer_name}
                      </span>
                      <span className="mt-0.5 block text-xs text-stone-500">
                        {row.contract_title}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-stone-800">
                      {row.equipment_name}
                    </td>
                    <td className="px-2 py-2.5 tabular-nums font-medium">
                      {row.hours.toFixed(1)}
                    </td>
                    <td className="px-2 py-2.5 text-stone-500">
                      {row.notes ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
