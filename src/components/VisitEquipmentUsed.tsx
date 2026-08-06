"use client";

import {
  addVisitEquipmentUsage,
  removeVisitEquipmentUsage,
} from "@/app/equipment/actions";

export type VisitEquipmentOption = {
  id: string;
  name: string;
  category: string;
  status: "active" | "retired";
};

export type VisitEquipmentUsageRow = {
  id: string;
  visitId: string;
  equipmentId: string;
  equipmentName: string;
  category: string;
  hours: number;
  notes: string | null;
};

export function VisitEquipmentUsed({
  visitId,
  usage,
  equipment,
}: {
  visitId: string;
  usage: VisitEquipmentUsageRow[];
  equipment: VisitEquipmentOption[];
}) {
  const activeEquipment = equipment.filter((item) => item.status === "active");

  return (
    <section className="rounded-lg border border-stone-200 p-4">
      <h3 className="text-sm font-semibold text-green-950">Equipment Used</h3>
      <p className="mt-1 text-xs text-stone-500">
        Record which register assets were used on this visit.
      </p>

      {usage.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">No equipment logged yet.</p>
      ) : (
        <div className="mt-3 overflow-hidden rounded-md border border-stone-200 bg-white">
          <table className="min-w-full text-xs">
            <thead className="bg-stone-50 text-left text-stone-600">
              <tr>
                <th className="px-3 py-2 font-medium">Equipment</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">Hours</th>
                <th className="px-3 py-2 font-medium">Notes</th>
                <th className="px-3 py-2 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {usage.map((row) => (
                <tr key={row.id} className="border-t border-stone-100 text-stone-800">
                  <td className="px-3 py-2 font-medium">{row.equipmentName}</td>
                  <td className="px-3 py-2">{row.category}</td>
                  <td className="px-3 py-2">{row.hours.toFixed(1)}</td>
                  <td className="px-3 py-2 text-stone-500">{row.notes || "—"}</td>
                  <td className="px-3 py-2">
                    <form action={removeVisitEquipmentUsage}>
                      <input type="hidden" name="usage_id" value={row.id} />
                      <button
                        type="submit"
                        className="text-xs font-medium text-red-700 hover:underline"
                      >
                        Remove
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeEquipment.length === 0 ? (
        <p className="mt-3 text-xs text-stone-500">
          Add active equipment on the Equipment tab first.
        </p>
      ) : (
        <form
          action={addVisitEquipmentUsage}
          className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <input type="hidden" name="visit_id" value={visitId} />
          <label className="block text-xs sm:col-span-2">
            <span className="font-medium text-stone-600">Equipment</span>
            <select
              name="equipment_id"
              required
              defaultValue=""
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
            >
              <option value="" disabled>
                Select equipment
              </option>
              {activeEquipment.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.category}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs">
            <span className="font-medium text-stone-600">Hours</span>
            <input
              type="number"
              name="hours"
              min="0.25"
              step="0.25"
              defaultValue="1"
              required
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs">
            <span className="font-medium text-stone-600">Notes</span>
            <input
              name="notes"
              placeholder="Optional"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <div className="sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              className="rounded-lg bg-green-800 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Add equipment used
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
