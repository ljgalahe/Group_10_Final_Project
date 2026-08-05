"use client";

import { useActionState, useState } from "react";
import {
  applyUnappliedCashAction,
  type ApplyUnappliedCashResult,
} from "@/app/payments/actions";
import { formatCurrency, formatDate } from "@/lib/format";

export function ApplyUnappliedCashButton({
  invoiceId,
  invoiceNumber,
  balanceDue,
  unappliedPayments,
  redirectTo,
}: {
  invoiceId: string;
  invoiceNumber: string;
  balanceDue: number;
  unappliedPayments: {
    id: string;
    payment_number: string;
    unapplied_amount: number;
    payment_date: string;
    payment_method: string;
  }[];
  redirectTo: string;
}) {
  const [open, setOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState(
    unappliedPayments[0]?.id ?? ""
  );
  const [state, formAction, pending] = useActionState<
    ApplyUnappliedCashResult | null,
    FormData
  >(applyUnappliedCashAction, null);

  const selected = unappliedPayments.find((p) => p.id === selectedPaymentId);
  const applyAmount = selected
    ? Math.min(selected.unapplied_amount, balanceDue)
    : 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-green-700 px-4 py-2 text-sm font-medium text-green-800 hover:bg-green-50"
      >
        Apply Unapplied Cash
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-green-950">
                  Apply Unapplied Cash
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  Match existing customer credits to {invoiceNumber} (
                  {formatCurrency(balanceDue)} outstanding).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-stone-400 hover:text-stone-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form action={formAction} className="mt-4 space-y-4">
              <input type="hidden" name="invoice_id" value={invoiceId} />
              <input type="hidden" name="redirect_to" value={redirectTo} />

              {state?.ok === false && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  {state.message}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-stone-700">
                  Unapplied cash receipt
                </label>
                <select
                  name="payment_id"
                  required
                  value={selectedPaymentId}
                  onChange={(e) => setSelectedPaymentId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                >
                  {unappliedPayments.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.payment_number} — {formatCurrency(p.unapplied_amount)} available (
                      {formatDate(p.payment_date)}, {p.payment_method.replace(/_/g, " ")})
                    </option>
                  ))}
                </select>
              </div>

              {selected && (
                <p className="rounded-md bg-stone-50 px-3 py-2 text-sm text-stone-700">
                  <span className="font-medium">{formatCurrency(applyAmount)}</span> will be
                  applied to this invoice
                  {selected.unapplied_amount > balanceDue
                    ? ` (${formatCurrency(selected.unapplied_amount - balanceDue)} will remain unapplied)`
                    : null}
                  .
                </p>
              )}

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
                  disabled={pending || !selectedPaymentId}
                  className="rounded-md bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {pending ? "Applying…" : "Apply to Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
