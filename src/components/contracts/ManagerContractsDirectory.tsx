"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  approveContractChangeRequest,
  rejectContractChangeRequest,
} from "@/app/actions/business";
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
};

export type PendingContractApproval = {
  id: string;
  contract_id: string;
  customer_id: string | null;
  summary: string | null;
  created_at: string;
  requested_by_role: string;
  proposed_contract: {
    monthly_fee?: number | null;
    season_start?: string;
    season_end?: string;
    title?: string;
  };
  proposed_customer?: { name?: string } | null;
  /** Present for demo-only rows (not in DB). */
  demo?: boolean;
  companyName?: string;
  contractTitle?: string;
};

const DEMO_DECISIONS_KEY = "greenscape-manager-contract-approvals";

function loadDemoDecisions(): Record<string, "approved" | "rejected"> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(DEMO_DECISIONS_KEY);
    return raw
      ? (JSON.parse(raw) as Record<string, "approved" | "rejected">)
      : {};
  } catch {
    return {};
  }
}

function saveDemoDecision(id: string, status: "approved" | "rejected") {
  const next = { ...loadDemoDecisions(), [id]: status };
  window.localStorage.setItem(DEMO_DECISIONS_KEY, JSON.stringify(next));
  return next;
}

function buildDemoApprovals(
  contracts: DirectoryContract[]
): PendingContractApproval[] {
  if (!contracts?.length) return [];
  const byCompany = new Map(contracts.map((c) => [c.customerName, c]));
  const picks = [
    byCompany.get("Harbor View HOA"),
    byCompany.get("Summit Retail Center"),
  ].filter(Boolean) as DirectoryContract[];

  return picks.map((contract, index) => ({
    id: `demo-ops-contract-${contract.id}`,
    contract_id: contract.id,
    customer_id: null,
    summary:
      index === 0
        ? "New seasonal agreement formed by Operations — ready for manager sign-off."
        : "Operations submitted updated contract terms for manager approval.",
    // Stable timestamps so SSR and client sort the same (avoid hydration mismatch).
    created_at: `2026-06-${String(15 - index).padStart(2, "0")}T12:00:00.000Z`,
    requested_by_role: "operations",
    proposed_contract: {
      monthly_fee: contract.monthly_fee,
      season_start: contract.season_start,
      season_end: contract.season_end,
      title: contract.title,
    },
    proposed_customer: { name: contract.customerName },
    demo: true,
    companyName: contract.customerName,
    contractTitle: contract.title,
  }));
}

/**
 * Contract approvals queue, then contracts listed by expandable company.
 */
export function ManagerContractsDirectory({
  contracts = [],
  pendingApprovals = [],
  companyFilter,
}: {
  contracts?: DirectoryContract[];
  pendingApprovals?: PendingContractApproval[];
  companyFilter: string;
}) {
  const [demoDecisions, setDemoDecisions] = useState<
    Record<string, "approved" | "rejected">
  >({});
  const [message, setMessage] = useState<string | null>(null);
  const [openCompanies, setOpenCompanies] = useState<Set<string>>(new Set());
  const [companySearch, setCompanySearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "pending_approval" | "completed"
  >("all");
  const [approvalsReady, setApprovalsReady] = useState(false);

  useEffect(() => {
    setDemoDecisions(loadDemoDecisions());
    setApprovalsReady(true);
  }, []);

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

  const approvals = useMemo(() => {
    const contractList = contracts ?? [];
    const pending = pendingApprovals ?? [];
    const real = pending.map((a) => {
      const match = contractList.find((c) => c.id === a.contract_id);
      return {
        ...a,
        companyName:
          a.companyName ??
          a.proposed_customer?.name ??
          match?.customerName ??
          "Customer",
        contractTitle:
          a.contractTitle ??
          a.proposed_contract.title ??
          match?.title ??
          "Contract",
      };
    });

    const decided = { ...demoDecisions };
    const demo =
      approvalsReady && real.length === 0
        ? buildDemoApprovals(contractList).filter((d) => !decided[d.id])
        : [];

    const combined = [...real, ...demo].filter((a) => {
      if (a.demo && demoDecisions[a.id]) return false;
      if (companyFilter === "overall") return true;
      return (a.companyName ?? "") === companyFilter;
    });

    return combined.sort((a, b) => {
      const byDate = (b.created_at ?? "").localeCompare(a.created_at ?? "");
      if (byDate !== 0) return byDate;
      return (a.id ?? "").localeCompare(b.id ?? "");
    });
  }, [
    pendingApprovals,
    contracts,
    companyFilter,
    demoDecisions,
    approvalsReady,
  ]);

  const pendingApprovalIds = useMemo(
    () => new Set(approvals.map((a) => a.contract_id)),
    [approvals]
  );

  const byCompany = useMemo(() => {
    const needle = companySearch.trim().toLowerCase();
    const map = new Map<string, DirectoryContract[]>();

    for (const contract of filteredContracts) {
      const isPending =
        pendingApprovalIds.has(contract.id) || contract.status === "draft";
      if (statusFilter === "active" && contract.status !== "active") continue;
      if (statusFilter === "completed" && contract.status !== "completed")
        continue;
      if (statusFilter === "pending_approval" && !isPending) continue;

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
  }, [
    filteredContracts,
    companySearch,
    statusFilter,
    pendingApprovalIds,
  ]);

  function decideDemo(id: string, status: "approved" | "rejected") {
    setDemoDecisions(saveDemoDecision(id, status));
    setMessage(
      status === "approved"
        ? "Contract approved. Operations can proceed."
        : "Contract approval declined."
    );
  }

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
              Contract Approvals
            </h3>
            <p className="gs-help">
              New or updated contracts from Operations awaiting your approval.
            </p>
          </div>
          {approvals.length > 0 ? (
            <span className="border border-[var(--champagne)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-stone-800">
              {approvals.length} pending
            </span>
          ) : null}
        </div>

        {message ? (
          <p className="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
            {message}
          </p>
        ) : null}

        {approvals.length === 0 ? (
          <p className="mt-3 text-sm text-stone-600">
            No contract approvals waiting. When Operations forms or revises a
            contract, it appears here for you to Approve or Decline.
          </p>
        ) : (
          <ul className="mt-3 max-h-[20rem] space-y-3 overflow-y-auto pr-1">
            {approvals.map((request) => {
              const fee = request.proposed_contract.monthly_fee;
              return (
                <li
                  key={request.id}
                  className="gs-list-row border border-stone-200 bg-transparent p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-stone-900">
                        {request.contractTitle}
                      </p>
                      <p className="text-xs text-stone-500">
                        {request.companyName}
                        {" · "}
                        From{" "}
                        {request.requested_by_role === "accountant"
                          ? "Operations / Accountant"
                          : request.requested_by_role}
                        {" · "}
                        {formatDate(request.created_at.slice(0, 10))}
                      </p>
                    </div>
                    <StatusBadge status="pending" />
                  </div>
                  <p className="mt-2 text-sm text-stone-700">
                    {request.summary ??
                      "Contract submitted for manager approval."}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    Proposed fee:{" "}
                    {fee != null ? `${formatCurrency(Number(fee))}/mo` : "—"}
                    {request.proposed_contract.season_start &&
                    request.proposed_contract.season_end
                      ? ` · Season ${formatDate(request.proposed_contract.season_start)} – ${formatDate(request.proposed_contract.season_end)}`
                      : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {request.demo ? (
                      <>
                        <button
                          type="button"
                          onClick={() => decideDemo(request.id, "approved")}
                          className="gs-btn-approve rounded-md px-3 py-1.5 text-xs font-medium"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => decideDemo(request.id, "rejected")}
                          className="rounded-md border border-red-700 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-50"
                        >
                          Decline
                        </button>
                      </>
                    ) : (
                      <>
                        <form action={approveContractChangeRequest}>
                          <input
                            type="hidden"
                            name="request_id"
                            value={request.id}
                          />
                          <button
                            type="submit"
                            className="gs-btn-approve rounded-md px-3 py-1.5 text-xs font-medium"
                          >
                            Approve
                          </button>
                        </form>
                        <form action={rejectContractChangeRequest}>
                          <input
                            type="hidden"
                            name="request_id"
                            value={request.id}
                          />
                          <button
                            type="submit"
                            className="rounded-md border border-red-700 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-50"
                          >
                            Decline
                          </button>
                        </form>
                      </>
                    )}
                    <Link
                      href={`/contracts/${request.contract_id}`}
                      className="rounded-md border border-green-800 px-3 py-1.5 text-xs font-medium text-green-900 hover:bg-green-50"
                    >
                      View contract
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="gs-section">
        <div className="gs-section-head">
          <h3 className="font-display text-xl font-semibold text-green-950 sm:text-2xl">
            Contracts
          </h3>
          <p className="gs-help">
            Search by company, filter by status, then expand a company to open a
            contract.
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
                  e.target.value as
                    | "all"
                    | "active"
                    | "pending_approval"
                    | "completed"
                )
              }
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending_approval">Pending Approval</option>
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
                          {list.length === 1 ? "contract" : "contracts"}
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
                        {list.map((contract) => (
                          <li
                            key={contract.id}
                            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-8"
                          >
                            <div className="min-w-0">
                              <Link
                                href={`/contracts/${contract.id}`}
                                className="font-medium text-green-800 hover:underline"
                              >
                                {contract.title}
                              </Link>
                              <p className="mt-0.5 text-xs text-stone-500">
                                {formatDate(contract.season_start)} –{" "}
                                {formatDate(contract.season_end)}
                                {contract.monthly_fee != null
                                  ? ` · ${formatCurrency(Number(contract.monthly_fee))}/mo`
                                  : ""}
                                {contract.visits_per_week != null
                                  ? ` · ${contract.visits_per_week} visits/week`
                                  : ""}
                              </p>
                            </div>
                            <StatusBadge
                              status={
                                pendingApprovalIds.has(contract.id) ||
                                contract.status === "draft"
                                  ? "pending"
                                  : contract.status
                              }
                            />
                          </li>
                        ))}
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
