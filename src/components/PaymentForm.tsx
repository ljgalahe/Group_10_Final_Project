"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { recordPayment } from "@/app/actions/business";
import { PAYMENT_METHODS } from "@/lib/types";

export function PaymentForm({
  invoiceId,
  maxAmount,
}: {
  invoiceId: string;
  maxAmount: number;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(maxAmount.toFixed(2));
  const [method, setMethod] = useState("check");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.set("invoice_id", invoiceId);
    formData.set("amount", amount);
    formData.set("payment_method", method);
    formData.set("payment_date", new Date().toISOString().slice(0, 10));
    formData.set("reference_number", referenceNumber);
    formData.set("notes", notes);

    setSubmitting(true);
    try {
      const result = await recordPayment(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSuccess(result.message);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <input
        name="amount"
        type="number"
        step="0.01"
        min="0.01"
        max={maxAmount}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
        className="rounded-md border border-stone-300 px-3 py-2 text-sm"
      />
      <select
        name="payment_method"
        value={method}
        onChange={(e) => setMethod(e.target.value)}
        className="rounded-md border border-stone-300 px-3 py-2 text-sm"
      >
        {PAYMENT_METHODS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <input
        name="reference_number"
        value={referenceNumber}
        onChange={(e) => setReferenceNumber(e.target.value)}
        placeholder={method === "check" ? "Check # (required)" : "Reference #"}
        className="rounded-md border border-stone-300 px-3 py-2 text-sm"
      />
      <input
        name="notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        className="rounded-md border border-stone-300 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-green-800 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
      >
        {submitting ? "Saving…" : "Record Payment"}
      </button>
      {error ? (
        <p className="sm:col-span-2 lg:col-span-5 text-sm text-red-700">{error}</p>
      ) : null}
      {success ? (
        <p className="sm:col-span-2 lg:col-span-5 text-sm text-green-800">
          {success}
        </p>
      ) : null}
    </form>
  );
}
