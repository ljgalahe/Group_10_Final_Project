"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { customerPayInvoice } from "@/app/actions/business";
import { formatCurrency, formatDate } from "@/lib/format";
import type { CustomerPaymentMethod } from "@/lib/types";

const NEW_METHOD = "__new__";

export function CustomerPayButton({
  invoiceId,
  invoiceNumber,
  amountDue,
  dueDate,
  paymentMethods,
  className,
}: {
  invoiceId: string;
  invoiceNumber: string;
  amountDue: number;
  dueDate: string;
  paymentMethods: CustomerPaymentMethod[];
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selection, setSelection] = useState<string>(
    paymentMethods[0]?.id ?? NEW_METHOD
  );
  const [nickname, setNickname] = useState("");
  const [accountDetails, setAccountDetails] = useState("");

  function openModal() {
    setSelection(paymentMethods[0]?.id ?? NEW_METHOD);
    setNickname("");
    setAccountDetails("");
    setOpen(true);
  }

  async function handleConfirm(formData: FormData) {
    setSubmitting(true);
    try {
      formData.set("is_new_method", selection === NEW_METHOD ? "1" : "0");
      if (selection === NEW_METHOD) {
        formData.set("new_method_nickname", nickname);
        formData.set("new_method_details", accountDetails);
      } else {
        formData.set("payment_method_id", selection);
      }
      await customerPayInvoice(formData);
      setOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const canConfirm =
    selection !== NEW_METHOD ||
    accountDetails.replace(/\D/g, "").length >= 4;

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={
          className ??
          "rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        }
      >
        Pay Now
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="customer-pay-title"
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-stone-200 bg-white p-6 shadow-lg">
            <h2
              id="customer-pay-title"
              className="text-xl font-semibold text-green-950"
            >
              Confirm Payment
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              Review the details below, choose a payment method, then confirm.
            </p>

            <dl className="mt-5 space-y-3 rounded-lg bg-stone-50 p-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-stone-500">Invoice</dt>
                <dd className="font-medium text-stone-900">{invoiceNumber}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-stone-500">Due Date</dt>
                <dd className="text-stone-900">{formatDate(dueDate)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-stone-200 pt-3 font-semibold text-green-900">
                <dt>Amount Due</dt>
                <dd>{formatCurrency(amountDue)}</dd>
              </div>
            </dl>

            <fieldset className="mt-5">
              <legend className="text-sm font-medium text-stone-800">
                Payment Method
              </legend>
              <div className="mt-3 space-y-2">
                {paymentMethods.map((method) => (
                  <label
                    key={method.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-stone-200 px-3 py-2.5 text-sm text-stone-800 hover:bg-stone-50 has-[:checked]:border-green-800 has-[:checked]:bg-green-50"
                  >
                    <input
                      type="radio"
                      name="payment_method_choice"
                      value={method.id}
                      checked={selection === method.id}
                      onChange={() => setSelection(method.id)}
                      className="text-green-800 focus:ring-green-800"
                    />
                    <span>{method.display_label}</span>
                  </label>
                ))}
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-stone-200 px-3 py-2.5 text-sm text-stone-800 hover:bg-stone-50 has-[:checked]:border-green-800 has-[:checked]:bg-green-50">
                  <input
                    type="radio"
                    name="payment_method_choice"
                    value={NEW_METHOD}
                    checked={selection === NEW_METHOD}
                    onChange={() => setSelection(NEW_METHOD)}
                    className="text-green-800 focus:ring-green-800"
                  />
                  <span>Add a new payment method</span>
                </label>
              </div>
            </fieldset>

            {selection === NEW_METHOD ? (
              <div className="mt-4 space-y-3 rounded-lg border border-stone-200 bg-stone-50 p-4">
                <div>
                  <label
                    htmlFor="new_method_details"
                    className="block text-xs font-medium text-stone-600"
                  >
                    Card number or account details
                  </label>
                  <input
                    id="new_method_details"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="Enter digits (demo only)"
                    value={accountDetails}
                    onChange={(e) => setAccountDetails(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new_method_nickname"
                    className="block text-xs font-medium text-stone-600"
                  >
                    Nickname this payment method
                  </label>
                  <input
                    id="new_method_nickname"
                    type="text"
                    autoComplete="off"
                    placeholder="e.g. Business Visa"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
              </div>
            ) : null}

            <p className="mt-4 text-xs text-stone-500">
              Demo payment only — no real funds will be transferred.
            </p>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <form action={handleConfirm}>
                <input type="hidden" name="invoice_id" value={invoiceId} />
                <button
                  type="submit"
                  disabled={submitting || !canConfirm}
                  className="rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {submitting ? "Processing…" : "Confirm Payment"}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
