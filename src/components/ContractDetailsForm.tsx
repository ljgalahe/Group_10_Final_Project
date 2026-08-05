"use client";

import { useState, useTransition } from "react";
import { updateContractDetails } from "@/app/actions/business";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Contract, Customer } from "@/lib/types";

const inputClassName =
  "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 shadow-sm focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700";

const labelClassName = "text-sm text-stone-500";

export function ContractDetailsForm({
  contract,
  customer,
  allowedToEdit,
  startEditing = false,
}: {
  contract: Contract;
  customer: Customer;
  allowedToEdit: boolean;
  startEditing?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(allowedToEdit && startEditing);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [formKey, setFormKey] = useState(0);

  function handleSubmit(formData: FormData) {
    setSaved(false);
    startTransition(async () => {
      await updateContractDetails(formData);
      setSaved(true);
      setIsEditing(false);
    });
  }

  function cancelEditing() {
    setIsEditing(false);
    setSaved(false);
    setFormKey((key) => key + 1);
  }

  return (
    <form key={formKey} action={handleSubmit} className="space-y-4">
      <input type="hidden" name="contract_id" value={contract.id} />
      <input type="hidden" name="customer_id" value={customer.id} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-green-950">
          Contract Details
        </h2>
        <div className="flex items-center gap-2">
          {allowedToEdit && !isEditing ? (
            <button
              type="button"
              onClick={() => {
                setSaved(false);
                setIsEditing(true);
              }}
              className="rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Edit Contract
            </button>
          ) : null}
          {allowedToEdit ? (
            <button
              type="button"
              aria-label="Copy contract details"
              className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
              onClick={() => {
                const text = [
                  contract.title,
                  `Customer: ${customer.name}`,
                  `Property Address: ${customer.address ?? ""}`,
                  `Contract Value: ${contract.monthly_fee ?? ""}`,
                  `Start Date: ${contract.season_start}`,
                  `End Date: ${contract.season_end}`,
                  `Assigned Crew: ${contract.assigned_crew ?? ""}`,
                  `Account Manager: ${contract.account_manager ?? ""}`,
                  `Renewal Date: ${contract.renewal_date ?? ""}`,
                  `Billing Frequency: ${contract.billing_method}`,
                ].join("\n");
                void navigator.clipboard.writeText(text);
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
              >
                <rect x="9" y="9" width="11" height="11" rx="2" />
                <path d="M5 15V5a2 2 0 0 1 2-2h10" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <label className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:items-center">
            <span className={labelClassName}>Customer</span>
            <input
              name="customer_name"
              defaultValue={customer.name}
              required
              className={inputClassName}
            />
          </label>

          <label className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:items-center">
            <span className={labelClassName}>Property Address</span>
            <input
              name="property_address"
              defaultValue={customer.address ?? ""}
              className={inputClassName}
            />
          </label>

          <label className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:items-center">
            <span className={labelClassName}>Contract Value</span>
            <input
              name="contract_value"
              type="number"
              step="0.01"
              min="0"
              defaultValue={contract.monthly_fee ?? ""}
              className={inputClassName}
            />
          </label>

          <label className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:items-center">
            <span className={labelClassName}>Start Date</span>
            <input
              name="start_date"
              type="date"
              defaultValue={contract.season_start}
              required
              className={inputClassName}
            />
          </label>

          <label className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:items-center">
            <span className={labelClassName}>End Date</span>
            <input
              name="end_date"
              type="date"
              defaultValue={contract.season_end}
              required
              className={inputClassName}
            />
          </label>

          <label className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:items-center">
            <span className={labelClassName}>Assigned Crew</span>
            <input
              name="assigned_crew"
              defaultValue={contract.assigned_crew ?? ""}
              className={inputClassName}
            />
          </label>

          <label className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:items-center">
            <span className={labelClassName}>Account Manager</span>
            <input
              name="account_manager"
              defaultValue={contract.account_manager ?? ""}
              className={inputClassName}
            />
          </label>

          <label className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:items-center">
            <span className={labelClassName}>Renewal Date</span>
            <input
              name="renewal_date"
              type="date"
              defaultValue={contract.renewal_date ?? ""}
              className={inputClassName}
            />
          </label>

          <label className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:items-center">
            <span className={labelClassName}>Billing Frequency</span>
            <select
              name="billing_frequency"
              defaultValue={contract.billing_method}
              className={inputClassName}
            >
              <option value="monthly">Monthly</option>
              <option value="per_visit">Per visit</option>
              <option value="seasonal">Seasonal</option>
            </select>
          </label>
        </div>
      ) : (
        <dl className="space-y-3 text-sm">
          <div className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:items-center">
            <dt className={labelClassName}>Customer</dt>
            <dd>{customer.name}</dd>
          </div>
          <div className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:items-center">
            <dt className={labelClassName}>Property Address</dt>
            <dd>{customer.address ?? "—"}</dd>
          </div>
          <div className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:items-center">
            <dt className={labelClassName}>Contract Value</dt>
            <dd>
              {contract.monthly_fee
                ? formatCurrency(Number(contract.monthly_fee))
                : "—"}
            </dd>
          </div>
          <div className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:items-center">
            <dt className={labelClassName}>Start Date</dt>
            <dd>{formatDate(contract.season_start)}</dd>
          </div>
          <div className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:items-center">
            <dt className={labelClassName}>End Date</dt>
            <dd>{formatDate(contract.season_end)}</dd>
          </div>
          <div className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:items-center">
            <dt className={labelClassName}>Assigned Crew</dt>
            <dd>{contract.assigned_crew ?? "—"}</dd>
          </div>
          <div className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:items-center">
            <dt className={labelClassName}>Account Manager</dt>
            <dd>{contract.account_manager ?? "—"}</dd>
          </div>
          <div className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:items-center">
            <dt className={labelClassName}>Renewal Date</dt>
            <dd>
              {contract.renewal_date ? formatDate(contract.renewal_date) : "—"}
            </dd>
          </div>
          <div className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:items-center">
            <dt className={labelClassName}>Billing Frequency</dt>
            <dd className="capitalize">
              {contract.billing_method.replace("_", " ")}
            </dd>
          </div>
        </dl>
      )}

      {allowedToEdit && isEditing ? (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-xs text-stone-500">
            Make your changes, then submit for manager approval.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={cancelEditing}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
            >
              {isPending ? "Submitting..." : "Submit for Manager Approval"}
            </button>
          </div>
        </div>
      ) : null}

      {saved && !isEditing ? (
        <p className="text-xs text-green-700">
          Edit submitted for manager approval. Changes apply after approval.
        </p>
      ) : null}
    </form>
  );
}
