"use client";

import { recordPayment } from "@/app/actions/business";

export function PaymentForm({
  invoiceId,
  maxAmount,
}: {
  invoiceId: string;
  maxAmount: number;
}) {
  return (
    <form action={recordPayment} className="grid gap-3 sm:grid-cols-4">
      <input type="hidden" name="invoice_id" value={invoiceId} />
      <input
        name="amount"
        type="number"
        step="0.01"
        min="0.01"
        max={maxAmount}
        defaultValue={maxAmount.toFixed(2)}
        required
        className="rounded-md border border-stone-300 px-3 py-2 text-sm"
      />
      <select
        name="payment_method"
        className="rounded-md border border-stone-300 px-3 py-2 text-sm"
      >
        <option value="simulated_check">Simulated Check</option>
        <option value="simulated_ach">Simulated ACH</option>
        <option value="simulated_card">Simulated Card</option>
      </select>
      <input
        name="notes"
        placeholder="Notes (optional)"
        className="rounded-md border border-stone-300 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        className="rounded-md bg-green-800 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
      >
        Record Payment
      </button>
    </form>
  );
}
