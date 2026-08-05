"use client";

import { useMemo, useState } from "react";
import { Card, EmptyState, StatCard, StatusBadge } from "@/components/ui";
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
} from "./equipment-math";
import {
  EQUIPMENT_CATEGORIES,
  type CompletedVisitOption,
  type EquipmentCategory,
  type EquipmentRow,
  type EquipmentUsageRow,
} from "./equipment-types";

type Props = {
  assets: EquipmentRow[];
  usage: EquipmentUsageRow[];
  visits: CompletedVisitOption[];
};

type FormMode = "closed" | "create" | "edit";

function AssetForm({
  mode,
  initial,
  onClose,
}: {
  mode: FormMode;
  initial?: EquipmentRow | null;
  onClose: () => void;
}) {
  if (mode === "closed") return null;
  const action = mode === "edit" ? updateEquipment : createEquipment;

  return (
    <Card className="mb-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-green-950">
            {mode === "edit" ? "Edit equipment" : "Add equipment"}
          </h3>
          <p className="mt-0.5 text-sm text-stone-500">
            Unit-of-production uses estimated life hours with cost and salvage.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-stone-500 hover:text-stone-800"
        >
          Cancel
        </button>
      </div>
      <form action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
            defaultValue={initial?.category ?? "Mowers"}
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
          <span className="text-stone-600">Useful life (years)</span>
          <input
            type="number"
            name="useful_life_years"
            min={0}
            required
            defaultValue={initial?.useful_life_years ?? 5}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-stone-600">Useful life (months)</span>
          <input
            type="number"
            name="useful_life_months"
            min={0}
            max={11}
            required
            defaultValue={initial?.useful_life_months ?? 0}
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
        <label className="block text-sm sm:col-span-2 lg:col-span-3">
          <span className="text-stone-600">Notes</span>
          <input
            name="notes"
            defaultValue={initial?.notes ?? ""}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        <div className="sm:col-span-2 lg:col-span-3">
          <button
            type="submit"
            className="rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-900"
          >
            {mode === "edit" ? "Save changes" : "Add equipment"}
          </button>
        </div>
      </form>
    </Card>
  );
}

export function EquipmentReport({ assets, usage, visits }: Props) {
  const [category, setCategory] = useState<"All" | EquipmentCategory>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | "active" | "retired">(
    "All"
  );
  const [formMode, setFormMode] = useState<FormMode>("closed");
  const [editing, setEditing] = useState<EquipmentRow | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [companyFilter, setCompanyFilter] = useState<string>("All");

  const companies = useMemo(() => {
    const names = new Set<string>();
    for (const row of usage) {
      if (row.customer_name) names.add(row.customer_name);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [usage]);

  const filteredUsage = useMemo(() => {
    if (companyFilter === "All") return usage;
    return usage.filter((row) => row.customer_name === companyFilter);
  }, [usage, companyFilter]);

  const enriched = useMemo(() => {
    return assets.map((a) => {
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
  }, [assets]);

  const filtered = useMemo(() => {
    return enriched.filter((a) => {
      if (category !== "All" && a.category !== category) return false;
      if (statusFilter !== "All" && a.status !== statusFilter) return false;
      return true;
    });
  }, [enriched, category, statusFilter]);

  const totals = useMemo(() => {
    const source = filtered;
    return {
      cost: source.reduce((s, a) => s + a.cost, 0),
      accum: source.reduce((s, a) => s + a.accum, 0),
      book: source.reduce((s, a) => s + a.book, 0),
    };
  }, [filtered]);

  /** Active assets at or near end of useful life hours (≤10% remaining). */
  const replaceSoon = useMemo(() => {
    return enriched
      .filter((a) => {
        if (a.status !== "active") return false;
        if (a.estimated_total_hours <= 0) return false;
        const lifeLeft = a.remaining / a.estimated_total_hours;
        return lifeLeft <= 0.1;
      })
      .sort((a, b) => a.remaining - b.remaining);
  }, [enriched]);

  function openCreate() {
    setEditing(null);
    setFormMode("create");
  }

  function openEdit(row: EquipmentRow) {
    setEditing(row);
    setFormMode("edit");
  }

  return (
    <>
      <div className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] lg:items-stretch">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Total acquisition cost"
            value={formatCurrency(totals.cost)}
          />
          <StatCard
            label="Accumulated depreciation"
            value={formatCurrency(totals.accum)}
          />
          <StatCard
            label="Net book value"
            value={formatCurrency(totals.book)}
          />
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

      <Card className="mb-8 overflow-x-auto">
        <h2 className="mb-1 text-lg font-semibold text-green-950">
          Equipment register
        </h2>
        <p className="mb-4 text-sm text-stone-500">
          Unit-of-production book values for the current filters.
        </p>
        {filtered.length === 0 ? (
          <EmptyState message="No equipment matches these filters." />
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-2 py-2 font-medium">Name</th>
                <th className="px-2 py-2 font-medium">Cost</th>
                <th className="px-2 py-2 font-medium">Acc. Dep.</th>
                <th className="px-2 py-2 font-medium">Book value</th>
                <th className="px-2 py-2 font-medium">Status</th>
                <th className="px-2 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((row) => (
                <tr key={row.id} className="align-top">
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
                    {formatCurrency(row.accum)}
                  </td>
                  <td className="px-2 py-2.5 font-medium tabular-nums text-green-950">
                    {formatCurrency(row.book)}
                  </td>
                  <td className="px-2 py-2.5">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-2 py-2.5">
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
              Hours used during visits
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
          <EmptyState message="No hours logged for this company." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-2 py-2 font-medium">Date</th>
                  <th className="px-2 py-2 font-medium">Visit / contract</th>
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
