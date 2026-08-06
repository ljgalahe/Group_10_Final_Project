"use client";

import { Fragment, useMemo, useState } from "react";
import { deleteJournalEntry } from "@/app/actions/journal";
import { JournalEntryForm } from "@/components/JournalEntryForm";
import { Card, EmptyState, StatCard } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import type { JournalSource } from "@/lib/journal";
import type { ChartOfAccount } from "@/lib/chart-of-accounts";
import type { JournalEntry } from "@/lib/queries";

const FILTERS: Array<{ value: "all" | JournalSource; label: string }> = [
  { value: "all", label: "All Entries" },
  { value: "invoice", label: "Invoices" },
  { value: "payment", label: "Payments" },
  { value: "visit", label: "Visit Costs" },
  { value: "depreciation", label: "Depreciation" },
  { value: "manual", label: "Manual" },
];

const sourceBadge: Record<JournalSource, string> = {
  invoice: "bg-blue-100 text-blue-800",
  payment: "bg-green-100 text-green-800",
  visit: "bg-amber-100 text-amber-900",
  depreciation: "bg-purple-100 text-purple-800",
  manual: "bg-stone-200 text-stone-800",
};

export function AccountantJournalEntriesView({
  entries,
  chartAccounts,
  todayIso,
}: {
  entries: JournalEntry[];
  chartAccounts: ChartOfAccount[];
  todayIso: string;
}) {
  const [sourceFilter, setSourceFilter] = useState<"all" | JournalSource>("all");
  const [search, setSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const customerOptions = useMemo(() => {
    return Array.from(
      new Set(
        entries
          .map((entry) => entry.customerName.trim())
          .filter((name) => name.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (sourceFilter !== "all" && entry.source !== sourceFilter) return false;
      if (customerFilter !== "all" && entry.customerName !== customerFilter) {
        return false;
      }
      if (!query) return true;
      const haystack = [
        entry.entryNumber,
        entry.memo,
        entry.reference,
        entry.customerName,
        entry.contractTitle ?? "",
        entry.sourceLabel,
        ...entry.lines.flatMap((line) => [line.accountCode, line.accountName]),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [customerFilter, entries, search, sourceFilter]);

  const totals = filtered.reduce(
    (acc, entry) => {
      acc.debits += entry.totalDebit;
      acc.credits += entry.totalCredit;
      return acc;
    },
    { debits: 0, credits: 0 }
  );
  const balanced = Math.abs(totals.debits - totals.credits) < 0.005;
  const editing = entries.find((entry) => entry.id === editingId);

  return (
    <div className="space-y-6">
      <div className="gs-kpi-grid">
        <StatCard label="Journal Entries" value={filtered.length} />
        <StatCard label="Total Debits" value={formatCurrency(totals.debits)} />
        <StatCard label="Total Credits" value={formatCurrency(totals.credits)} />
        <StatCard
          label="Books Status"
          value={balanced ? "Balanced" : "Out of balance"}
          hint={balanced ? "Debits equal credits" : "Review unbalanced entries"}
        />
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-stone-600">
              Find a specific entry
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search entry #, memo, customer, contract, account..."
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-700/20"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-stone-600">
              Customer
            </span>
            <select
              value={customerFilter}
              onChange={(event) => setCustomerFilter(event.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-700/20"
            >
              <option value="all">All customers</option>
              {customerOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setSourceFilter(filter.value)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                  sourceFilter === filter.value
                    ? "bg-green-800 text-white"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Add Journal Entry
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          message={
            entries.length === 0
              ? "No journal entries yet. Add one manually or create one from a ready invoice, payment, or visit."
              : "No journal entries match these filters."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-50 text-left text-stone-600">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Entry</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Memo</th>
                <th className="px-4 py-3 font-medium">Customer / Contract</th>
                <th className="px-4 py-3 text-right font-medium">Debit</th>
                <th className="px-4 py-3 text-right font-medium">Credit</th>
                <th className="px-4 py-3 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => {
                const open = expandedId === entry.id;
                return (
                  <Fragment key={entry.id}>
                    <tr
                      className="cursor-pointer border-t border-stone-100 hover:bg-stone-50"
                      onClick={() => setExpandedId(open ? null : entry.id)}
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        {formatDate(entry.date)}
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-green-950">
                        {entry.entryNumber}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${sourceBadge[entry.source]}`}
                        >
                          {entry.sourceLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-700">{entry.memo}</td>
                      <td className="px-4 py-3 text-stone-600">
                        <div>{entry.customerName || "—"}</div>
                        {entry.contractTitle ? (
                          <div className="text-xs text-stone-400">
                            {entry.contractTitle}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(entry.totalDebit)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(entry.totalCredit)}
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="flex flex-wrap items-center gap-3"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => setEditingId(entry.id)}
                            className="text-xs font-medium text-green-800 hover:underline"
                          >
                            Edit
                          </button>
                          <form
                            action={async (formData) => {
                              await deleteJournalEntry(formData);
                            }}
                            onSubmit={(event) => {
                              if (
                                !window.confirm(
                                  `Delete ${entry.entryNumber}? This cannot be undone.`
                                )
                              ) {
                                event.preventDefault();
                              }
                            }}
                          >
                            <input type="hidden" name="entry_id" value={entry.id} />
                            <button
                              type="submit"
                              className="text-xs font-medium text-red-700 hover:underline"
                            >
                              Delete
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                    {open ? (
                      <tr className="border-t border-stone-100 bg-stone-50">
                        <td colSpan={8} className="px-6 py-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                            Double-entry lines · Ref {entry.reference || "—"}
                          </p>
                          <table className="min-w-full text-sm">
                            <thead className="text-left text-stone-500">
                              <tr>
                                <th className="py-1 font-medium">Account</th>
                                <th className="py-1 text-right font-medium">Debit</th>
                                <th className="py-1 text-right font-medium">Credit</th>
                              </tr>
                            </thead>
                            <tbody>
                              {entry.lines.map((line, index) => (
                                <tr key={`${entry.id}-${index}`}>
                                  <td className="py-1.5 font-mono text-stone-800">
                                    {line.accountCode} · {line.accountName}
                                  </td>
                                  <td className="py-1.5 text-right">
                                    {line.debit > 0 ? formatCurrency(line.debit) : ""}
                                  </td>
                                  <td className="py-1.5 text-right">
                                    {line.credit > 0 ? formatCurrency(line.credit) : ""}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t border-stone-200 font-medium text-green-950">
                                <td className="pt-2">Totals</td>
                                <td className="pt-2 text-right">
                                  {formatCurrency(entry.totalDebit)}
                                </td>
                                <td className="pt-2 text-right">
                                  {formatCurrency(entry.totalCredit)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Card>
        <h2 className="text-lg font-semibold text-green-950">How Journal Entries Work</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-stone-600">
          <li>
            When an invoice, payment, or completed visit is ready, use{" "}
            <strong>Create journal entry</strong> to generate it automatically.
          </li>
          <li>Every journal entry can be edited or deleted if something needs to change.</li>
          <li>Invoices, payments, and visits show Ready to post only when a journal entry can be created.</li>
          <li>
            Mower, truck, trailer, and irrigation hours automatically create depreciation entries.
          </li>
        </ul>
      </Card>

      {creating ? (
        <JournalEntryForm
          mode="create"
          todayIso={todayIso}
          chartAccounts={chartAccounts}
          onClose={() => setCreating(false)}
        />
      ) : null}
      {editing ? (
        <JournalEntryForm
          mode="edit"
          todayIso={todayIso}
          chartAccounts={chartAccounts}
          entry={editing}
          onClose={() => setEditingId(null)}
        />
      ) : null}
    </div>
  );
}
