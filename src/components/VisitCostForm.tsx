"use client";

import { addVisitCost } from "@/app/actions/business";

export function VisitCostForm({ visitId }: { visitId: string }) {
  return (
    <form action={addVisitCost} className="grid gap-3 sm:grid-cols-5">
      <input type="hidden" name="visit_id" value={visitId} />
      <select
        name="cost_type"
        required
        className="rounded-md border border-stone-300 px-3 py-2 text-sm"
      >
        <option value="labor">Labor</option>
        <option value="materials">Materials</option>
        <option value="equipment">Equipment</option>
      </select>
      <input
        name="description"
        placeholder="Description"
        required
        className="rounded-md border border-stone-300 px-3 py-2 text-sm sm:col-span-2"
      />
      <input
        name="amount"
        type="number"
        step="0.01"
        min="0"
        placeholder="Amount"
        required
        className="rounded-md border border-stone-300 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        className="rounded-md bg-green-800 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
      >
        Add Cost
      </button>
    </form>
  );
}
