"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, EmptyState, StatCard, StatusBadge } from "@/components/ui";
import { chatHrefForInventoryReorder } from "@/lib/chat-demo";
import { formatCurrency } from "@/lib/format";
import {
  filterLowStock,
  isLowStock,
  LOW_STOCK_THRESHOLD,
  stockFillPercent,
} from "@/lib/inventory";
import {
  adjustInventoryQuantity,
  createInventoryItem,
  updateInventoryItem,
} from "./actions";
import {
  INVENTORY_CATEGORIES,
  type InventoryCategory,
  type InventoryRow,
} from "./inventory-types";

type Props = {
  items: InventoryRow[];
};

type FormMode = "closed" | "create" | "edit";

function StockLevelRing({
  quantityOnHand,
  parLevel,
}: {
  quantityOnHand: number;
  parLevel: number;
}) {
  const fillPct = stockFillPercent({ quantity_on_hand: quantityOnHand, par_level: parLevel });
  const color =
    fillPct > 25 ? "#15803d" : fillPct > 10 ? "#ca8a04" : "#dc2626";

  const size = 28;
  const stroke = 3.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - fillPct / 100);
  const label = `${fillPct.toFixed(0)}% of par level`;

  return (
    <span className="relative inline-flex" title={label} aria-label={label}>
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

function ItemForm({
  mode,
  initial,
  onClose,
}: {
  mode: FormMode;
  initial?: InventoryRow | null;
  onClose: () => void;
}) {
  if (mode === "closed") return null;

  const action = mode === "create" ? createInventoryItem : updateInventoryItem;

  return (
    <Card className="mt-6">
      <h2 className="text-lg font-semibold text-green-950">
        {mode === "create" ? "Add material" : "Edit material"}
      </h2>
      <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2">
        {mode === "edit" && initial ? (
          <input type="hidden" name="id" value={initial.id} />
        ) : null}
        <label className="block text-sm">
          <span className="font-medium text-stone-700">Name</span>
          <input
            name="name"
            required
            defaultValue={initial?.name ?? ""}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-stone-700">SKU</span>
          <input
            name="sku"
            defaultValue={initial?.sku ?? ""}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-stone-700">Category</span>
          <select
            name="category"
            defaultValue={initial?.category ?? "General supplies"}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
          >
            {INVENTORY_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-stone-700">Unit</span>
          <input
            name="unit"
            required
            defaultValue={initial?.unit ?? "each"}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-stone-700">On hand</span>
          <input
            name="quantity_on_hand"
            type="number"
            min={0}
            step="0.01"
            required
            defaultValue={initial?.quantity_on_hand ?? 0}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-stone-700">Par level (full capacity)</span>
          <input
            name="par_level"
            type="number"
            min={0.01}
            step="0.01"
            required
            defaultValue={initial?.par_level ?? 100}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-stone-700">Unit cost</span>
          <input
            name="unit_cost"
            type="number"
            min={0}
            step="0.01"
            defaultValue={initial?.unit_cost ?? ""}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-stone-700">Notes</span>
          <textarea
            name="notes"
            rows={2}
            defaultValue={initial?.notes ?? ""}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
          />
        </label>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button
            type="submit"
            className="rounded-md bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            {mode === "create" ? "Add item" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}

export function InventoryReport({ items }: Props) {
  const [formMode, setFormMode] = useState<FormMode>("closed");
  const [editItem, setEditItem] = useState<InventoryRow | null>(null);

  const lowStockItems = useMemo(() => filterLowStock(items), [items]);
  const totalValue = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + item.quantity_on_hand * (item.unit_cost ?? 0),
        0
      ),
    [items]
  );

  const reorderHref = useMemo(
    () =>
      lowStockItems.length > 0
        ? chatHrefForInventoryReorder(
            lowStockItems.map((item) => ({
              name: item.name,
              quantity_on_hand: item.quantity_on_hand,
              par_level: item.par_level,
              unit: item.unit,
            }))
          )
        : null,
    [lowStockItems]
  );

  function openCreate() {
    setEditItem(null);
    setFormMode("create");
  }

  function openEdit(item: InventoryRow) {
    setEditItem(item);
    setFormMode("edit");
  }

  function closeForm() {
    setFormMode("closed");
    setEditItem(null);
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="max-w-sm">
        <StatCard
          label="Inventory value"
          value={formatCurrency(totalValue)}
          hint="On-hand × unit cost"
        />
      </div>

      {lowStockItems.length > 0 ? (
        <Card className="border-amber-200 bg-amber-50/50">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-amber-950">
                Low stock — reorder recommended
              </h2>
              <p className="mt-1 text-sm text-amber-900/80">
                {lowStockItems.length} item
                {lowStockItems.length === 1 ? "" : "s"} at or below{" "}
                {(LOW_STOCK_THRESHOLD * 100).toFixed(0)}% of par level. Send a
                message to the manager to place orders.
              </p>
              <ul className="mt-3 space-y-1 text-sm text-amber-950">
                {lowStockItems.map((item) => (
                  <li key={item.id}>
                    <span className="font-medium">{item.name}</span>
                    {" — "}
                    {item.quantity_on_hand} / {item.par_level} {item.unit} (
                    {stockFillPercent(item).toFixed(0)}%)
                  </li>
                ))}
              </ul>
            </div>
            {reorderHref ? (
              <Link
                href={reorderHref}
                className="shrink-0 rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
              >
                Notify manager to order
              </Link>
            ) : null}
          </div>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Add material
        </button>
      </div>

      <ItemForm mode={formMode} initial={editItem} onClose={closeForm} />

      {items.length === 0 ? (
        <EmptyState message="No inventory items yet. Add materials to track stock levels and low-stock alerts." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3">Material</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">On hand</th>
                <th className="px-4 py-3">Par level</th>
                <th className="px-4 py-3">Fill</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Unit cost</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.map((item) => {
                const low = isLowStock(item);
                return (
                  <tr
                    key={item.id}
                    className={low ? "bg-amber-50/40" : undefined}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-green-950">{item.name}</p>
                      {item.sku ? (
                        <p className="text-xs text-stone-500">{item.sku}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-stone-600">{item.category}</td>
                    <td className="px-4 py-3 font-medium text-green-950">
                      {item.quantity_on_hand} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {item.par_level} {item.unit}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        <StockLevelRing
                          quantityOnHand={item.quantity_on_hand}
                          parLevel={item.par_level}
                        />
                        <span className="text-stone-600">
                          {stockFillPercent(item).toFixed(0)}%
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {low ? (
                        <StatusBadge status="low stock" />
                      ) : (
                        <StatusBadge status="ok" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {item.unit_cost != null
                        ? formatCurrency(item.unit_cost)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="text-sm font-medium text-green-800 hover:underline"
                        >
                          Edit
                        </button>
                        <form action={adjustInventoryQuantity} className="inline-flex">
                          <input type="hidden" name="id" value={item.id} />
                          <input type="hidden" name="delta" value={-1} />
                          <button
                            type="submit"
                            className="rounded border border-stone-300 px-2 py-0.5 text-xs hover:bg-stone-50"
                            title="Decrease quantity by 1"
                          >
                            −1
                          </button>
                        </form>
                        <form action={adjustInventoryQuantity} className="inline-flex">
                          <input type="hidden" name="id" value={item.id} />
                          <input type="hidden" name="delta" value={1} />
                          <button
                            type="submit"
                            className="rounded border border-stone-300 px-2 py-0.5 text-xs hover:bg-stone-50"
                            title="Increase quantity by 1"
                          >
                            +1
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
