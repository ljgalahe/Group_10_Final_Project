"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { customerPayInvoice } from "@/app/actions/business";
import {
  NewPaymentMethodFields,
  isNewPaymentMethodValid,
} from "@/components/customer/NewPaymentMethodFields";
import type { PaymentMethodType } from "@/lib/customer-payment-methods";
import { formatCurrency, formatDate } from "@/lib/format";
import type { CustomerPaymentMethod } from "@/lib/types";

const NEW_METHOD = "__new__";

function parsePayAmount(value: string) {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

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
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<string>(
    paymentMethods[0]?.id ?? NEW_METHOD
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);
  const [methodType, setMethodType] = useState<PaymentMethodType>("card");
  const [nickname, setNickname] = useState("");
  const [accountDetails, setAccountDetails] = useState("");
  const [billingName, setBillingName] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);
  const [amountStr, setAmountStr] = useState(amountDue.toFixed(2));

  function resetNewMethodFields() {
    setMethodType("card");
    setNickname("");
    setAccountDetails("");
    setBillingName("");
    setExpMonth("");
    setExpYear("");
    setMakeDefault(paymentMethods.length === 0);
  }

  function openModal() {
    setSelection(paymentMethods[0]?.id ?? NEW_METHOD);
    resetNewMethodFields();
    setAmountStr(amountDue.toFixed(2));
    setError(null);
    setOpen(true);
  }

  const payAmount = parsePayAmount(amountStr);
  const amountValid =
    payAmount != null && payAmount > 0 && payAmount <= amountDue + 0.001;
  const remainingAfter =
    amountValid && payAmount != null
      ? Math.round((amountDue - payAmount) * 100) / 100
      : null;
  const isFullPayment =
    amountValid && remainingAfter != null && remainingAfter <= 0.001;

  const halfAmount = useMemo(
    () => Math.round((amountDue / 2) * 100) / 100,
    [amountDue]
  );

  async function handleConfirm() {
    if (!amountValid || payAmount == null) return;
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("invoice_id", invoiceId);
      formData.set("amount", payAmount.toFixed(2));
      formData.set("is_new_method", selection === NEW_METHOD ? "1" : "0");
      if (selection === NEW_METHOD) {
        formData.set("new_method_nickname", nickname);
        formData.set("new_method_details", accountDetails);
        formData.set("new_method_type", methodType);
        formData.set("new_method_billing_name", billingName);
        formData.set("new_method_exp_month", expMonth);
        formData.set("new_method_exp_year", expYear);
        formData.set("new_method_is_default", makeDefault ? "1" : "0");
      } else {
        formData.set("payment_method_id", selection);
      }
      const result = await customerPayInvoice(formData);
      if (!result.success) {
        setError(result.error || "Payment could not be completed.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Payment could not be completed."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const newMethodValid = isNewPaymentMethodValid(
    accountDetails,
    methodType,
    expMonth,
    expYear
  );

  const canConfirm =
    amountValid &&
    (selection !== NEW_METHOD || newMethodValid);

  const modal =
    open && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-950/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-pay-title"
            onClick={(e) => {
              if (e.target === e.currentTarget && !submitting) setOpen(false);
            }}
          >
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-stone-200 bg-white p-6 shadow-2xl">
              <h2
                id="customer-pay-title"
                className="text-xl font-semibold text-green-950"
              >
                Confirm Payment
              </h2>
              <p className="mt-2 text-sm text-stone-600">
                Pay the full balance or enter a partial amount, then choose how
                you&apos;d like to pay.
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
                  <dt>Balance due</dt>
                  <dd>{formatCurrency(amountDue)}</dd>
                </div>
              </dl>

              <div className="mt-5">
                <label
                  htmlFor="payment_amount"
                  className="block text-sm font-medium text-stone-800"
                >
                  Payment amount
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setAmountStr(amountDue.toFixed(2))}
                    className="rounded-md border border-stone-300 px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
                  >
                    Full balance
                  </button>
                  {halfAmount < amountDue ? (
                    <button
                      type="button"
                      onClick={() => setAmountStr(halfAmount.toFixed(2))}
                      className="rounded-md border border-stone-300 px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
                    >
                      Half ({formatCurrency(halfAmount)})
                    </button>
                  ) : null}
                </div>
                <div className="relative mt-2">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-500">
                    $
                  </span>
                  <input
                    id="payment_amount"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    max={amountDue}
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 py-2 pl-7 pr-3 text-sm"
                  />
                </div>
                {!amountValid && amountStr.trim() !== "" ? (
                  <p className="mt-1.5 text-xs text-red-700">
                    Enter an amount between $0.01 and {formatCurrency(amountDue)}.
                  </p>
                ) : remainingAfter != null && remainingAfter > 0.001 ? (
                  <p className="mt-1.5 text-xs text-stone-500">
                    After this payment, remaining balance will be{" "}
                    {formatCurrency(remainingAfter)}.
                  </p>
                ) : isFullPayment ? (
                  <p className="mt-1.5 text-xs text-stone-500">
                    This will pay the invoice in full.
                  </p>
                ) : null}
              </div>

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
                <NewPaymentMethodFields
                  idPrefix="pay"
                  methodType={methodType}
                  onMethodTypeChange={setMethodType}
                  accountDetails={accountDetails}
                  onAccountDetailsChange={setAccountDetails}
                  nickname={nickname}
                  onNicknameChange={setNickname}
                  billingName={billingName}
                  onBillingNameChange={setBillingName}
                  expMonth={expMonth}
                  onExpMonthChange={setExpMonth}
                  expYear={expYear}
                  onExpYearChange={setExpYear}
                  makeDefault={makeDefault}
                  onMakeDefaultChange={setMakeDefault}
                  showDefaultOption
                />
              ) : null}

              {error ? (
                <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {error}
                </p>
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
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={submitting || !canConfirm}
                  className="rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {submitting
                    ? "Processing…"
                    : amountValid && payAmount != null
                      ? `Pay ${formatCurrency(payAmount)}`
                      : "Confirm Payment"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

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
      {modal}
    </>
  );
}
