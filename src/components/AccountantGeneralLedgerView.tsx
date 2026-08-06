"use client";

import { Fragment, useMemo, useState } from "react";
import { AddChartOfAccountModal } from "@/components/AddChartOfAccountModal";
import { ChartOfAccountsBrowse } from "@/components/ChartOfAccountsBrowse";
import { EmptyState } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ChartOfAccount } from "@/lib/chart-of-accounts";
import {
  buildAccountRegister,
  buildGeneralLedgerAccounts,
  summarizeGeneralLedger,
} from "@/lib/general-ledger";
import type { JournalEntry } from "@/lib/queries";

export function AccountantGeneralLedgerView({
  entries,
  chartAccounts,
}: {
  entries: JournalEntry[];
  chartAccounts: ChartOfAccount[];
}) {
  const [search, setSearch] = useState("");
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  const [addingAccount, setAddingAccount] = useState(false);

  const accounts = useMemo(
    () => buildGeneralLedgerAccounts(entries, chartAccounts),
    [chartAccounts, entries]
  );
  const summary = useMemo(() => summarizeGeneralLedger(accounts), [accounts]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const codeQuery = query.split("·")[0]?.trim() ?? query;
    return accounts.filter((account) => {
      if (!query) return true;
      return (
        account.accountCode.includes(codeQuery) ||
        account.accountName.toLowerCase().includes(query) ||
        `${account.accountCode} · ${account.accountName}`.toLowerCase().includes(query)
      );
    });
  }, [accounts, search]);

  const register =
    expandedAccount != null
      ? buildAccountRegister(entries, expandedAccount)
      : [];

  function handleSelectAccount(account: ChartOfAccount) {
    setExpandedAccount(account.code);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <ChartOfAccountsBrowse
            chartAccounts={chartAccounts}
            search={search}
            onSearchChange={setSearch}
            onSelectAccount={handleSelectAccount}
          />
          <button
            type="button"
            onClick={() => setAddingAccount(true)}
            className="shrink-0 rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Add account
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No accounts match these filters." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-50 text-left text-stone-600">
              <tr>
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 text-right font-medium">Debits</th>
                <th className="px-4 py-3 text-right font-medium">Credits</th>
                <th className="px-4 py-3 text-right font-medium">
                  Debit balance
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  Credit balance
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((account) => {
                const open = expandedAccount === account.accountCode;
                const inactive = account.lineCount === 0;
                return (
                  <Fragment key={account.accountCode}>
                    <tr
                      className={`cursor-pointer border-t border-stone-100 hover:bg-stone-50 ${
                        inactive ? "text-stone-400" : ""
                      } ${open ? "bg-green-50/40" : ""}`}
                      onClick={() =>
                        setExpandedAccount(open ? null : account.accountCode)
                      }
                    >
                      <td className="px-4 py-3">
                        <div className="font-mono font-medium text-green-950">
                          {account.accountCode}
                        </div>
                        <div className="text-stone-600">{account.accountName}</div>
                        {inactive ? (
                          <div className="text-xs text-stone-400">No activity</div>
                        ) : (
                          <div className="text-xs text-stone-400">
                            {account.lineCount} line
                            {account.lineCount === 1 ? "" : "s"} · click to view
                            register
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {account.totalDebits > 0
                          ? formatCurrency(account.totalDebits)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {account.totalCredits > 0
                          ? formatCurrency(account.totalCredits)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {account.trialDebit > 0
                          ? formatCurrency(account.trialDebit)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {account.trialCredit > 0
                          ? formatCurrency(account.trialCredit)
                          : "—"}
                      </td>
                    </tr>
                    {open ? (
                      <tr className="border-t border-stone-100 bg-stone-50">
                        <td colSpan={5} className="px-6 py-4">
                          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
                            Account register · {account.accountCode} ·{" "}
                            {account.accountName}
                          </p>
                          {register.length === 0 ? (
                            <p className="text-sm text-stone-500">
                              No journal activity for this account yet.
                            </p>
                          ) : (
                            <table className="min-w-full text-sm">
                              <thead className="text-left text-stone-500">
                                <tr>
                                  <th className="py-1 font-medium">Date</th>
                                  <th className="py-1 font-medium">Entry</th>
                                  <th className="py-1 font-medium">Memo</th>
                                  <th className="py-1 text-right font-medium">
                                    Debit
                                  </th>
                                  <th className="py-1 text-right font-medium">
                                    Credit
                                  </th>
                                  <th className="py-1 text-right font-medium">
                                    Balance
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {register.map((line, index) => (
                                  <tr key={`${line.entryId}-${index}`}>
                                    <td className="py-1.5 whitespace-nowrap">
                                      {formatDate(line.date)}
                                    </td>
                                    <td className="py-1.5 font-mono text-green-900">
                                      {line.entryNumber}
                                    </td>
                                    <td className="py-1.5 text-stone-700">
                                      {line.memo}
                                    </td>
                                    <td className="py-1.5 text-right">
                                      {line.debit > 0
                                        ? formatCurrency(line.debit)
                                        : ""}
                                    </td>
                                    <td className="py-1.5 text-right">
                                      {line.credit > 0
                                        ? formatCurrency(line.credit)
                                        : ""}
                                    </td>
                                    <td className="py-1.5 text-right font-medium">
                                      {formatCurrency(line.runningBalance)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
            <tfoot className="border-t border-stone-200 bg-stone-50 font-medium text-green-950">
              <tr>
                <td className="px-4 py-3">Trial balance totals</td>
                <td className="px-4 py-3 text-right"> </td>
                <td className="px-4 py-3 text-right"> </td>
                <td className="px-4 py-3 text-right">
                  {formatCurrency(summary.totalTrialDebit)}
                </td>
                <td className="px-4 py-3 text-right">
                  {formatCurrency(summary.totalTrialCredit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {addingAccount ? (
        <AddChartOfAccountModal
          chartAccounts={chartAccounts}
          onClose={() => setAddingAccount(false)}
        />
      ) : null}
    </div>
  );
}
