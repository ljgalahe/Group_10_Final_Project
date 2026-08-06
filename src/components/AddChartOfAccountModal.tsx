"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addChartOfAccountAction } from "@/app/actions/journal";
import {
  ACCOUNT_TYPE_LABELS,
  inferAccountType,
  type AccountType,
  type ChartOfAccount,
} from "@/lib/chart-of-accounts";

type State = { ok: boolean; error?: string } | null;

export function AddChartOfAccountModal({
  chartAccounts,
  onClose,
}: {
  chartAccounts: ChartOfAccount[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<State, FormData>(
    addChartOfAccountAction,
    null
  );

  useEffect(() => {
    if (!state?.ok) return;
    router.refresh();
    onClose();
  }, [state?.ok, onClose, router]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-green-950">
              Add Chart Account
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              New accounts appear in the general ledger browse list and journal
              entry forms.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form action={action} className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-stone-700">
              Account code
            </span>
            <input
              name="account_code"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              required
              placeholder="e.g. 5050"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 font-mono text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-700/20"
            />
            <span className="mt-1 block text-xs text-stone-500">
              4 digits — 1xxx assets, 2xxx liabilities, 4xxx revenue, 5xxx
              expenses
            </span>
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-stone-700">
              Account name
            </span>
            <input
              name="account_name"
              required
              placeholder="e.g. Subcontractor Expense"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-700/20"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-stone-700">
              Account type
            </span>
            <select
              name="account_type"
              defaultValue="expense"
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-700/20"
            >
              {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map(
                (type) => (
                  <option key={type} value={type}>
                    {ACCOUNT_TYPE_LABELS[type]}
                  </option>
                )
              )}
            </select>
          </label>

          {state?.error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {state.error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
            >
              {pending ? "Adding…" : "Add account"}
            </button>
          </div>
        </form>

        <p className="mt-4 text-xs text-stone-500">
          {chartAccounts.length} accounts in chart. Suggested next code by type
          uses the first digit of the code (
          {inferAccountType("5050")} for 5050).
        </p>
      </div>
    </div>
  );
}
