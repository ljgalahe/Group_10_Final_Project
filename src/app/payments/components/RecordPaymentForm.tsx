"use client";

import { useActionState, useState } from "react";
import {
  recordPaymentAction,
  type RecordPaymentResult,
} from "@/app/payments/actions";

function DuplicatePaymentError({ message }: { message: string }) {
  return (
    <div className="col-span-full rounded-lg border border-red-200 bg-red-50 p-4">
      <p className="font-semibold text-red-800">Potential Duplicate Payment</p>
      <p className="mt-1 text-sm text-red-700">{message}</p>
    </div>
  );
}

function ValidationError({ message }: { message: string }) {
  return (
    <div className="col-span-full rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm text-amber-800">{message}</p>
    </div>
  );
}

export function RecordPaymentForm({
  invoices,
  customers = [],
  defaultInvoiceId,
  invoiceOnly = false,
  redirectTo = "/payments",
}: {
  invoices: {
    id: string;
    invoice_number: string;
    total: number;
    amount_paid: number;
    customers: { name: string } | null;
  }[];
  customers?: { id: string; name: string }[];
  defaultInvoiceId?: string;
  /** When true, invoice is fixed via hidden field — no selector shown (invoice detail page). */
  invoiceOnly?: boolean;
  redirectTo?: string;
}) {
  const [applyMode, setApplyMode] = useState<"invoice" | "unapplied">("invoice");
  const [state, formAction, pending] = useActionState<
    RecordPaymentResult | null,
    FormData
  >(recordPaymentAction, null);

  const today = new Date().toISOString().slice(0, 10);
  const showUnappliedOption = !invoiceOnly && customers.length > 0;

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <input type="hidden" name="redirect_to" value={redirectTo} />
      <input type="hidden" name="apply_mode" value={invoiceOnly ? "invoice" : applyMode} />
      {invoiceOnly && defaultInvoiceId ? (
        <input type="hidden" name="invoice_id" value={defaultInvoiceId} />
      ) : null}

      {state?.ok === false && state.error === "duplicate" && (
        <DuplicatePaymentError message={state.message} />
      )}
      {state?.ok === false && state.error === "validation" && (
        <ValidationError message={state.message} />
      )}

      {showUnappliedOption && (
        <div className="sm:col-span-2 lg:col-span-3 flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="apply_mode_ui"
              checked={applyMode === "invoice"}
              onChange={() => setApplyMode("invoice")}
            />
            Apply to invoice
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="apply_mode_ui"
              checked={applyMode === "unapplied"}
              onChange={() => setApplyMode("unapplied")}
            />
            Unapplied cash (no invoice)
          </label>
        </div>
      )}

      {!invoiceOnly && applyMode === "invoice" && (
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium text-stone-700">Invoice</label>
          <select
            name="invoice_id"
            required
            defaultValue={defaultInvoiceId ?? ""}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          >
            <option value="">Select invoice…</option>
            {invoices.map((inv) => {
              const balance = Number(inv.total) - Number(inv.amount_paid);
              return (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_number} — {inv.customers?.name} (${balance.toFixed(2)} due)
                </option>
              );
            })}
          </select>
          <p className="mt-1 text-xs text-stone-500">
            Overpayments are automatically tracked as unapplied cash.
          </p>
        </div>
      )}

      {!invoiceOnly && applyMode === "unapplied" && (
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium text-stone-700">Customer</label>
          <select
            name="customer_id"
            required
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          >
            <option value="">Select customer…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-stone-500">
            Payment will be held as unapplied cash until matched to an invoice.
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-stone-700">Amount</label>
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          placeholder="0.00"
          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700">Payment Date</label>
        <input
          name="payment_date"
          type="date"
          defaultValue={today}
          required
          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700">Method</label>
        <select
          name="payment_method"
          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
        >
          <option value="check">Check</option>
          <option value="cash">Cash</option>
          <option value="ach">ACH</option>
          <option value="simulated_card">Card</option>
        </select>
      </div>

      <div className="sm:col-span-2 lg:col-span-3">
        <label className="block text-sm font-medium text-stone-700">Notes</label>
        <input
          name="notes"
          placeholder="Check #, reference, or memo (optional)"
          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="sm:col-span-2 lg:col-span-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
        >
          {pending ? "Recording…" : "Record Payment"}
        </button>
      </div>
    </form>
  );
}
