"use client";

import { useState } from "react";
import { createContract } from "@/app/actions/business";
import type { Customer } from "@/lib/types";

const inputClassName =
  "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 shadow-sm focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700";

export function NewContractForm({ customers }: { customers: Customer[] }) {
  const [customerMode, setCustomerMode] = useState<"existing" | "new">(
    customers.length > 0 ? "existing" : "new"
  );

  return (
    <form
      action={createContract}
      className="space-y-4 rounded-xl border border-stone-200 bg-white p-6 shadow-sm"
    >
      <input type="hidden" name="customer_mode" value={customerMode} />

      <div>
        <h2 className="text-lg font-semibold text-green-950">New Contract</h2>
        <p className="mt-1 text-sm text-stone-500">
          Create a seasonal agreement for an existing or new customer.
        </p>
      </div>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-stone-600">
          Contract Title
        </span>
        <input
          name="title"
          required
          placeholder="2026 Grounds Maintenance"
          className={inputClassName}
        />
      </label>

      <div className="flex flex-wrap gap-3 text-sm">
        <button
          type="button"
          onClick={() => setCustomerMode("existing")}
          disabled={customers.length === 0}
          className={`rounded-lg px-3 py-1.5 font-medium ${
            customerMode === "existing"
              ? "bg-green-800 text-white"
              : "border border-stone-300 text-stone-700 hover:bg-stone-50"
          }`}
        >
          Existing customer
        </button>
        <button
          type="button"
          onClick={() => setCustomerMode("new")}
          className={`rounded-lg px-3 py-1.5 font-medium ${
            customerMode === "new"
              ? "bg-green-800 text-white"
              : "border border-stone-300 text-stone-700 hover:bg-stone-50"
          }`}
        >
          New customer
        </button>
      </div>

      {customerMode === "existing" ? (
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-stone-600">
            Customer
          </span>
          <select name="customer_id" required className={inputClassName}>
            <option value="">Select a customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-stone-600">
            Customer Name
          </span>
          <input
            name="new_customer_name"
            required
            placeholder="Customer or property name"
            className={inputClassName}
          />
        </label>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1.5 block font-medium text-stone-600">
            Property Address
          </span>
          <input name="property_address" className={inputClassName} />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-stone-600">
            Contract Value
          </span>
          <input
            name="contract_value"
            type="number"
            step="0.01"
            min="0"
            className={inputClassName}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-stone-600">
            Visits / Week
          </span>
          <input
            name="visits_per_week"
            type="number"
            min="0"
            className={inputClassName}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-stone-600">
            Start Date
          </span>
          <input
            name="start_date"
            type="date"
            required
            className={inputClassName}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-stone-600">
            End Date
          </span>
          <input
            name="end_date"
            type="date"
            required
            className={inputClassName}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-stone-600">
            Assigned Crew
          </span>
          <input name="assigned_crew" className={inputClassName} />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-stone-600">
            Account Manager
          </span>
          <input name="account_manager" className={inputClassName} />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-stone-600">
            Renewal Date
          </span>
          <input name="renewal_date" type="date" className={inputClassName} />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-stone-600">
            Billing Frequency
          </span>
          <select
            name="billing_frequency"
            defaultValue="monthly"
            className={inputClassName}
          >
            <option value="monthly">Monthly</option>
            <option value="per_visit">Per visit</option>
            <option value="seasonal">Seasonal</option>
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-stone-600">Status</span>
          <select name="status" defaultValue="active" className={inputClassName}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <a
          href="/contracts"
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Cancel
        </a>
        <button
          type="submit"
          className="rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Create Contract
        </button>
      </div>
    </form>
  );
}
