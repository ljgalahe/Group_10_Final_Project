"use client";

import { useActionState, useMemo, useState } from "react";
import {
  createManualJournalEntry,
  updateJournalEntry,
} from "@/app/actions/journal";
import {
  JOURNAL_ACCOUNTS,
  roundMoney,
  type JournalLineInput,
} from "@/lib/journal";
import { formatCurrency } from "@/lib/format";

type LineState = {
  accountCode: string;
  debit: string;
  credit: string;
};

type State = { ok: boolean; error?: string } | null;

const emptyLine = (): LineState => ({
  accountCode: "1200",
  debit: "",
  credit: "",
});

export function JournalEntryForm({
  mode,
  todayIso,
  entry,
  onClose,
}: {
  mode: "create" | "edit";
  todayIso: string;
  entry?: {
    id: string;
    date: string;
    memo: string;
    reference: string;
    customerName: string;
    contractTitle: string | null;
    lines: JournalLineInput[];
  };
  onClose: () => void;
}) {
  const [lines, setLines] = useState<LineState[]>(
    entry?.lines.length
      ? entry.lines.map((line) => ({
          accountCode: line.accountCode,
          debit: line.debit ? String(line.debit) : "",
          credit: line.credit ? String(line.credit) : "",
        }))
      : [emptyLine(), { accountCode: "4000", debit: "", credit: "" }]
  );

  const totals = useMemo(() => {
    return lines.reduce(
      (acc, line) => {
        acc.debit = roundMoney(acc.debit + Number(line.debit || 0));
        acc.credit = roundMoney(acc.credit + Number(line.credit || 0));
        return acc;
      },
      { debit: 0, credit: 0 }
    );
  }, [lines]);

  const [state, action, pending] = useActionState(
    async (_prev: State, formData: FormData): Promise<State> => {
      const result =
        mode === "create"
          ? await createManualJournalEntry(formData)
          : await updateJournalEntry(formData);
      if (!result.ok) return { ok: false, error: result.error };
      onClose();
      return { ok: true };
    },
    null
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-green-950">
          {mode === "create" ? "Add journal entry" : "Edit journal entry"}
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          Debits must equal credits before the entry can be saved.
        </p>

        <form action={action} className="mt-4 space-y-4">
          {mode === "edit" ? (
            <input type="hidden" name="entry_id" value={entry?.id} />
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-stone-700">
              Date
              <input
                name="entry_date"
                type="date"
                required
                defaultValue={entry?.date || todayIso}
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm font-medium text-stone-700">
              Reference
              <input
                name="reference"
                defaultValue={entry?.reference}
                placeholder="INV-0001 / adj"
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="block text-sm font-medium text-stone-700">
            Memo
            <input
              name="memo"
              required
              defaultValue={entry?.memo}
              placeholder="Describe the posting"
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-stone-700">
              Customer
              <input
                name="customer_name"
                defaultValue={entry?.customerName}
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm font-medium text-stone-700">
              Contract
              <input
                name="contract_title"
                defaultValue={entry?.contractTitle ?? ""}
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-stone-700">Lines</p>
              <button
                type="button"
                onClick={() => setLines((current) => [...current, emptyLine()])}
                className="text-sm font-medium text-green-800 hover:underline"
              >
                Add line
              </button>
            </div>
            <div className="overflow-hidden rounded-lg border border-stone-200">
              <table className="min-w-full text-sm">
                <thead className="bg-stone-50 text-left text-stone-600">
                  <tr>
                    <th className="px-3 py-2 font-medium">Account</th>
                    <th className="px-3 py-2 font-medium">Debit</th>
                    <th className="px-3 py-2 font-medium">Credit</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={index} className="border-t border-stone-100">
                      <td className="px-3 py-2">
                        <select
                          name="account_code"
                          value={line.accountCode}
                          onChange={(event) => {
                            const value = event.target.value;
                            setLines((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, accountCode: value }
                                  : item
                              )
                            );
                          }}
                          className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
                        >
                          {JOURNAL_ACCOUNTS.map((account) => (
                            <option key={account.code} value={account.code}>
                              {account.code} · {account.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          name="debit"
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.debit}
                          onChange={(event) => {
                            const value = event.target.value;
                            setLines((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, debit: value, credit: value ? "" : item.credit }
                                  : item
                              )
                            );
                          }}
                          className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          name="credit"
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.credit}
                          onChange={(event) => {
                            const value = event.target.value;
                            setLines((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, credit: value, debit: value ? "" : item.debit }
                                  : item
                              )
                            );
                          }}
                          className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        {lines.length > 2 ? (
                          <button
                            type="button"
                            onClick={() =>
                              setLines((current) =>
                                current.filter((_, itemIndex) => itemIndex !== index)
                              )
                            }
                            className="text-xs text-stone-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-stone-200 bg-stone-50 font-medium">
                    <td className="px-3 py-2">Totals</td>
                    <td className="px-3 py-2">{formatCurrency(totals.debit)}</td>
                    <td className="px-3 py-2">{formatCurrency(totals.credit)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
            {Math.abs(totals.debit - totals.credit) > 0.005 ? (
              <p className="mt-2 text-xs text-amber-800">Out of balance</p>
            ) : (
              <p className="mt-2 text-xs text-green-800">Balanced</p>
            )}
          </div>

          {state?.error ? (
            <p className="text-sm text-red-700">{state.error}</p>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {pending ? "Saving…" : mode === "create" ? "Save entry" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
