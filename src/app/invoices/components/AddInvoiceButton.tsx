"use client";

import { useState } from "react";
import { createInvoice } from "@/app/invoices/actions";

export function AddInvoiceButton({
  contracts,
}: {
  contracts: {
    id: string;
    title: string;
    customers: { name: string } | null;
  }[];
}) {
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const defaultDue = new Date();
  defaultDue.setDate(defaultDue.getDate() + 30);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
      >
        Add Invoice
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-green-950">Add Invoice</h2>
            <p className="mt-1 text-sm text-stone-500">
              Create a new invoice in Draft status for manual billing.
            </p>
            <form action={createInvoice} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700">Contract</label>
                <select
                  name="contract_id"
                  required
                  className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                >
                  <option value="">Select contract…</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} — {c.customers?.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700">Description</label>
                <input
                  name="description"
                  required
                  placeholder="Line item description"
                  className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700">Amount</label>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-stone-700">Issue Date</label>
                  <input
                    name="issue_date"
                    type="date"
                    defaultValue={today}
                    required
                    className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700">Due Date</label>
                  <input
                    name="due_date"
                    type="date"
                    defaultValue={defaultDue.toISOString().slice(0, 10)}
                    required
                    className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  Create Draft Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
