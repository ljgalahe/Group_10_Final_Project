"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ACCOUNT_TYPE_LABELS,
  type AccountType,
  type ChartOfAccount,
} from "@/lib/chart-of-accounts";

const TYPE_ORDER: AccountType[] = [
  "asset",
  "liability",
  "equity",
  "revenue",
  "expense",
];

export function ChartOfAccountsBrowse({
  chartAccounts,
  search,
  onSearchChange,
  onSelectAccount,
}: {
  chartAccounts: ChartOfAccount[];
  search: string;
  onSearchChange: (value: string) => void;
  onSelectAccount: (account: ChartOfAccount) => void;
}) {
  const [browseOpen, setBrowseOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return chartAccounts;
    return chartAccounts.filter(
      (account) =>
        account.code.includes(query) ||
        account.name.toLowerCase().includes(query) ||
        ACCOUNT_TYPE_LABELS[account.accountType].toLowerCase().includes(query)
    );
  }, [chartAccounts, search]);

  const grouped = useMemo(() => {
    const groups = new Map<AccountType, ChartOfAccount[]>();
    for (const type of TYPE_ORDER) {
      groups.set(type, []);
    }
    for (const account of filtered) {
      const bucket = groups.get(account.accountType) ?? [];
      bucket.push(account);
      groups.set(account.accountType, bucket);
    }
    return TYPE_ORDER.map((type) => ({
      type,
      label: ACCOUNT_TYPE_LABELS[type],
      accounts: groups.get(type) ?? [],
    })).filter((group) => group.accounts.length > 0);
  }, [filtered]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setBrowseOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1">
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-stone-600">
          Find an account
        </span>
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          onFocus={() => setBrowseOpen(true)}
          placeholder="Search or browse chart of accounts…"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-700/20"
        />
      </label>

      {browseOpen ? (
        <div className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-xl border border-stone-200 bg-white shadow-lg">
          <div className="sticky top-0 border-b border-stone-100 bg-stone-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Chart of accounts
            </p>
          </div>

          {grouped.length === 0 ? (
            <p className="px-3 py-4 text-sm text-stone-500">
              No accounts match your search.
            </p>
          ) : (
            grouped.map((group) => (
              <div
                key={group.type}
                className="border-b border-stone-100 last:border-b-0"
              >
                <p className="bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-500">
                  {group.label}
                </p>
                <ul>
                  {group.accounts.map((account) => (
                    <li key={account.code}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectAccount(account);
                          onSearchChange(`${account.code} · ${account.name}`);
                          setBrowseOpen(false);
                        }}
                        className="flex w-full items-start gap-3 px-3 py-2 text-left text-sm hover:bg-green-50"
                      >
                        <span className="shrink-0 font-mono font-medium text-green-900">
                          {account.code}
                        </span>
                        <span className="text-stone-700">{account.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
