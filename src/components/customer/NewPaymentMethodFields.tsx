"use client";

import type { PaymentMethodType } from "@/lib/customer-payment-methods";

/** Rich demo form for adding a card or bank method (shared by Pay Now + Profile). */
export function NewPaymentMethodFields({
  idPrefix,
  methodType,
  onMethodTypeChange,
  accountDetails,
  onAccountDetailsChange,
  nickname,
  onNicknameChange,
  billingName,
  onBillingNameChange,
  expMonth,
  onExpMonthChange,
  expYear,
  onExpYearChange,
  makeDefault,
  onMakeDefaultChange,
  showDefaultOption = true,
}: {
  idPrefix: string;
  methodType: PaymentMethodType;
  onMethodTypeChange: (value: PaymentMethodType) => void;
  accountDetails: string;
  onAccountDetailsChange: (value: string) => void;
  nickname: string;
  onNicknameChange: (value: string) => void;
  billingName: string;
  onBillingNameChange: (value: string) => void;
  expMonth: string;
  onExpMonthChange: (value: string) => void;
  expYear: string;
  onExpYearChange: (value: string) => void;
  makeDefault?: boolean;
  onMakeDefaultChange?: (value: boolean) => void;
  showDefaultOption?: boolean;
}) {
  return (
    <div className="mt-4 space-y-4 rounded-xl border border-stone-200 bg-stone-50 p-5">
      <div className="flex flex-wrap gap-3">
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm has-[:checked]:border-green-800 has-[:checked]:bg-green-50">
          <input
            type="radio"
            name={`${idPrefix}_method_type`}
            value="card"
            checked={methodType === "card"}
            onChange={() => onMethodTypeChange("card")}
            className="text-green-800 focus:ring-green-800"
          />
          Credit / debit card
        </label>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm has-[:checked]:border-green-800 has-[:checked]:bg-green-50">
          <input
            type="radio"
            name={`${idPrefix}_method_type`}
            value="bank"
            checked={methodType === "bank"}
            onChange={() => onMethodTypeChange("bank")}
            className="text-green-800 focus:ring-green-800"
          />
          Bank account (ACH)
        </label>
      </div>

      <div>
        <label
          htmlFor={`${idPrefix}_billing_name`}
          className="block text-sm font-medium text-stone-700"
        >
          {methodType === "bank" ? "Account holder name" : "Name on card"}
        </label>
        <input
          id={`${idPrefix}_billing_name`}
          type="text"
          autoComplete="cc-name"
          placeholder="Maria Chen"
          value={billingName}
          onChange={(e) => onBillingNameChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label
          htmlFor={`${idPrefix}_account_details`}
          className="block text-sm font-medium text-stone-700"
        >
          {methodType === "bank"
            ? "Account number (demo — stored as last 4 only)"
            : "Card number (demo — stored as last 4 only)"}
        </label>
        <input
          id={`${idPrefix}_account_details`}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={
            methodType === "bank" ? "••••••••8821" : "•••• •••• •••• 4242"
          }
          value={accountDetails}
          onChange={(e) => onAccountDetailsChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm tracking-wide"
        />
      </div>

      {methodType === "card" ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label
              htmlFor={`${idPrefix}_exp_month`}
              className="block text-sm font-medium text-stone-700"
            >
              Exp. month
            </label>
            <input
              id={`${idPrefix}_exp_month`}
              type="number"
              min={1}
              max={12}
              placeholder="MM"
              value={expMonth}
              onChange={(e) => onExpMonthChange(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label
              htmlFor={`${idPrefix}_exp_year`}
              className="block text-sm font-medium text-stone-700"
            >
              Exp. year
            </label>
            <input
              id={`${idPrefix}_exp_year`}
              type="number"
              min={2024}
              max={2040}
              placeholder="YYYY"
              value={expYear}
              onChange={(e) => onExpYearChange(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label
              htmlFor={`${idPrefix}_cvc`}
              className="block text-sm font-medium text-stone-700"
            >
              CVC
            </label>
            <input
              id={`${idPrefix}_cvc`}
              type="password"
              inputMode="numeric"
              maxLength={4}
              autoComplete="off"
              placeholder="•••"
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-stone-400">Not stored — demo only</p>
          </div>
        </div>
      ) : (
        <div>
          <label
            htmlFor={`${idPrefix}_routing`}
            className="block text-sm font-medium text-stone-700"
          >
            Routing number
          </label>
          <input
            id={`${idPrefix}_routing`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="•••••••••"
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-stone-400">Not stored — demo only</p>
        </div>
      )}

      <div>
        <label
          htmlFor={`${idPrefix}_nickname`}
          className="block text-sm font-medium text-stone-700"
        >
          Nickname (optional)
        </label>
        <input
          id={`${idPrefix}_nickname`}
          type="text"
          autoComplete="off"
          placeholder={
            methodType === "bank"
              ? "e.g. Operating account"
              : "e.g. Business Visa"
          }
          value={nickname}
          onChange={(e) => onNicknameChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
        />
      </div>

      {showDefaultOption && onMakeDefaultChange ? (
        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={makeDefault ?? false}
            onChange={(e) => onMakeDefaultChange(e.target.checked)}
            className="rounded border-stone-300 text-green-800 focus:ring-green-800"
          />
          Set as default payment method
        </label>
      ) : null}

      <p className="text-xs text-stone-500">
        Demo vault only — no real card processor. Full numbers are never saved;
        we keep the last four digits and display label.
      </p>
    </div>
  );
}

export function isNewPaymentMethodValid(
  accountDetails: string,
  methodType: PaymentMethodType,
  expMonth: string,
  expYear: string
): boolean {
  if (accountDetails.replace(/\D/g, "").length < 4) return false;
  if (methodType === "bank") return true;
  const month = parseInt(expMonth, 10);
  const year = parseInt(expYear, 10);
  return (
    Number.isFinite(month) &&
    month >= 1 &&
    month <= 12 &&
    Number.isFinite(year) &&
    year >= 2024
  );
}
