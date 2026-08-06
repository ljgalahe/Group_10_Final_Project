"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  QuoteApprovalsInbox,
  type QuoteApprovalItem,
} from "@/components/quotes/QuoteApprovalsInbox";
import { StatusBadge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";

export type DirectoryContract = {
  id: string;
  title: string;
  status: string;
  season_start: string;
  season_end: string;
  monthly_fee: number | null;
  visits_per_week: number | null;
  customerName: string;
  /** Quote-sourced draft row (approved quote not yet an active contract). */
  kind?: "contract" | "quote_draft";
  href?: string;
};

/** @deprecated Prefer QuoteApprovalItem — kept for dashboard import compatibility. */
export type PendingQuoteApproval = QuoteApprovalItem;

/**
 * Quote approvals queue, then contracts listed by expandable company.
 */
export function ManagerContractsDirectory({
  contracts = [],
  pendingQuotes = [],
  companyFilter,
}: {
  contracts?: DirectoryContract[];
  pendingQuotes?: QuoteApprovalItem[];
  companyFilter: string;
}) {
  const [openCompanies, setOpenCompanies] = useState<Set<string>>(new Set());
  const [companySearch, setCompanySearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "draft" | "completed"
  >("all");

  useEffect(() => {
    if (companyFilter !== "overall") {
      setOpenCompanies(new Set([companyFilter]));
    }
  }, [companyFilter]);

  const filteredContracts = useMemo(() => {
    const list = contracts ?? [];
    if (companyFilter === "overall") return list;
    return list.filter((c) => c.customerName === companyFilter);
  }, [contracts, companyFilter]);

  const pendingCount = pendingQuotes?.length ?? 0;

  const byCompany = useMemo(() => {
    const needle = companySearch.trim().toLowerCase();
    const map = new Map<string, DirectoryContract[]>();

    for (const contract of filteredContracts) {
      const isDraft =
        contract.status === "draft" || contract.kind === "quote_draft";
      if (statusFilter === "active" && contract.status !== "active") continue;
      if (statusFilter === "completed" && contract.status !== "completed")
        continue;
      if (statusFilter === "draft" && !isDraft) continue;

      if (
        needle &&
        !contract.customerName.toLowerCase().includes(needle) &&
        !contract.title.toLowerCase().includes(needle)
      ) {
        continue;
      }

      const list = map.get(contract.customerName) ?? [];
      list.push(contract);
      map.set(contract.customerName, list);
    }

    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filteredContracts, companySearch, statusFilter]);

  function toggleCompany(name: string) {
    setOpenCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div className="gs-section border-l-[3px] border-l-[var(--champagne)]">
        <div className="gs-section-head flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="gs-mark mb-1">Approvals</p>
            <h3 className="font-display text-xl font-semibold text-green-950 sm:text-2xl">
              Quote Approvals
            </h3>
            <p className="gs-help">
              New or updated quotes from Operations awaiting your approval.
            </p>
          </div>
          {pendingCount > 0 ? (
            <span className="border border-[var(--champagne)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-stone-800">
              {pendingCount} pending
            </span>
          ) : null}
        </div>

        <div className="mt-3">
          <QuoteApprovalsInbox
            pendingQuotes={pendingQuotes}
            companyFilter={companyFilter}
          />
        </div>
      </div>

      <div className="gs-section">
        <div className="gs-section-head">
          <h3 className="font-display text-xl font-semibold text-green-950 sm:text-2xl">
            Contracts
          </h3>
          <p className="gs-help">
            Search by company, filter by status, then expand a company to open a
            contract. Drafts are quotes out for contracting and are not counted
            in the completion chart.
          </p>
        </div>

        <div className="gs-index-bar mt-0">
          <label className="gs-index-field min-w-0 flex-1">
            <span>Search by company</span>
            <input
              type="search"
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
              placeholder="e.g. Harbor View, Summit…"
            />
          </label>
          <label className="gs-index-field sm:w-56">
            <span>Status</span>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as "all" | "active" | "draft" | "completed"
                )
              }
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="draft">Drafts</option>
              <option value="completed">Completed</option>
            </select>
          </label>
        </div>

        {byCompany.length === 0 ? (
          <p className="mt-4 gs-help">
            No contracts match this search or filter.
          </p>
        ) : (
          <div className="mt-4 max-h-[28rem] overflow-y-auto overflow-x-hidden border-t border-stone-200">
            <div className="divide-y divide-stone-200">
              {byCompany.map(([companyName, list]) => {
                const open =
                  Boolean(companySearch.trim()) ||
                  openCompanies.has(companyName);
                return (
                  <div key={companyName} className="gs-list-row">
                    <button
                      type="button"
                      onClick={() => toggleCompany(companyName)}
                      aria-expanded={open}
                      className="sticky top-0 z-[1] flex w-full items-center justify-between gap-3 bg-[var(--cream)] px-2 py-3 text-left hover:bg-white/60"
                    >
                      <div>
                        <p className="text-sm font-semibold text-stone-900">
                          {companyName}
                        </p>
                        <p className="text-xs text-stone-500">
                          {list.length}{" "}
                          {list.length === 1 ? "item" : "items"}
                        </p>
                      </div>
                      <span
                        className={`text-stone-500 transition-transform ${open ? "rotate-180" : ""}`}
                        aria-hidden
                      >
                        ▾
                      </span>
                    </button>
                    {open ? (
                      <ul className="divide-y divide-stone-100 bg-white">
                        {list.map((contract) => {
                          const isDraft =
                            contract.status === "draft" ||
                            contract.kind === "quote_draft";
                          const href =
                            contract.href ??
                            (contract.kind === "quote_draft"
                              ? `/quotes/${contract.id}`
                              : `/contracts/${contract.id}`);
                          return (
                            <li
                              key={`${contract.kind ?? "contract"}-${contract.id}`}
                              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-8"
                            >
                              <div className="min-w-0">
                                <Link
                                  href={href}
                                  className="font-medium text-green-800 hover:underline"
                                >
                                  {contract.title}
                                </Link>
                                <p className="mt-0.5 text-xs text-stone-500">
                                  {contract.kind === "quote_draft"
                                    ? "Approved quote — awaiting contract draft"
                                    : null}
                                  {contract.kind !== "quote_draft" &&
                                  contract.season_start &&
                                  contract.season_end
                                    ? `${formatDate(contract.season_start)} – ${formatDate(contract.season_end)}`
                                    : null}
                                  {contract.monthly_fee != null
                                    ? `${contract.kind === "quote_draft" || !contract.season_start ? "" : " · "}${formatCurrency(Number(contract.monthly_fee))}/mo`
                                    : ""}
                                  {contract.visits_per_week != null
                                    ? ` · ${contract.visits_per_week} visits/week`
                                    : ""}
                                </p>
                              </div>
                              <StatusBadge
                                status={isDraft ? "draft" : contract.status}
                              />
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
