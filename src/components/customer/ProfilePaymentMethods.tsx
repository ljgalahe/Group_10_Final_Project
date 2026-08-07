"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  addCustomerPaymentMethod,
  removeCustomerPaymentMethod,
  setDefaultPaymentMethod,
} from "@/app/actions/profile";
import {
  NewPaymentMethodFields,
  isNewPaymentMethodValid,
} from "@/components/customer/NewPaymentMethodFields";
import type { PaymentMethodType } from "@/lib/customer-payment-methods";
import { formatMethodExpiry } from "@/lib/customer-payment-methods";
import type { CustomerPaymentMethod } from "@/lib/types";

export function ProfilePaymentMethods({
  methods,
}: {
  methods: CustomerPaymentMethod[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [methodType, setMethodType] = useState<PaymentMethodType>("card");
  const [nickname, setNickname] = useState("");
  const [accountDetails, setAccountDetails] = useState("");
  const [billingName, setBillingName] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  function openModal() {
    setMethodType("card");
    setNickname("");
    setAccountDetails("");
    setBillingName("");
    setExpMonth("");
    setExpYear("");
    setMakeDefault(methods.length === 0);
    setOpen(true);
  }

  const canSave = isNewPaymentMethodValid(
    accountDetails,
    methodType,
    expMonth,
    expYear
  );

  async function handleSave(formData: FormData) {
    if (!canSave) return;
    setSubmitting(true);
    try {
      formData.set("account_details", accountDetails);
      formData.set("nickname", nickname);
      formData.set("method_type", methodType);
      formData.set("billing_name", billingName);
      formData.set("expires_month", expMonth);
      formData.set("expires_year", expYear);
      if (makeDefault) formData.set("is_default", "1");
      await addCustomerPaymentMethod(formData);
      setOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <ul className="divide-y divide-stone-100 border-t border-stone-100">
        {methods.length === 0 ? (
          <li className="py-4 text-sm text-stone-500">
            No payment methods on file yet. Add a method to pay invoices
            faster.
          </li>
        ) : (
          methods.map((method) => {
            const exp = formatMethodExpiry(
              method.expires_month,
              method.expires_year
            );
            return (
              <li
                key={method.id}
                className="flex flex-wrap items-start justify-between gap-3 py-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-green-950">
                      {method.display_label}
                    </p>
                    {method.is_default ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-900">
                        Default
                      </span>
                    ) : null}
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium capitalize text-stone-600">
                      {method.method_type === "bank" ? "Bank" : "Card"}
                    </span>
                  </div>
                  {exp || method.billing_name ? (
                    <p className="mt-1 text-sm text-stone-500">
                      {[method.billing_name, exp ? `Expires ${exp}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {!method.is_default ? (
                    <form action={setDefaultPaymentMethod}>
                      <input type="hidden" name="method_id" value={method.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
                      >
                        Make default
                      </button>
                    </form>
                  ) : null}
                  <form action={removeCustomerPaymentMethod}>
                    <input type="hidden" name="method_id" value={method.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              </li>
            );
          })
        )}
      </ul>

      <button
        type="button"
        onClick={openModal}
        className="mt-4 rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
      >
        Add Payment Method
      </button>

      {open && mounted
        ? createPortal(
            <div
              className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-950/50 p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="profile-add-payment-title"
              onClick={(e) => {
                if (e.target === e.currentTarget && !submitting) setOpen(false);
              }}
            >
              <div className="relative z-[201] max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-stone-200 bg-white p-6 shadow-2xl">
                <h2
                  id="profile-add-payment-title"
                  className="text-xl font-semibold text-green-950"
                >
                  Add Payment Method
                </h2>
                <p className="mt-2 text-sm text-stone-600">
                  Save a card or bank account for invoice payments.
                </p>

                <NewPaymentMethodFields
                  idPrefix="profile"
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

                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={submitting}
                    className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <form action={handleSave}>
                    <button
                      type="submit"
                      disabled={submitting || !canSave}
                      className="rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
                    >
                      {submitting ? "Saving…" : "Save method"}
                    </button>
                  </form>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
