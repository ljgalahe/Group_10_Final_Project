"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import {
  approveContractChangeRequest,
  approveExtraWork,
  rejectContractChangeRequest,
} from "@/app/actions/business";
import {
  getContractDisplayStatus,
  getContractEndDate,
  getRenewalStatus,
  type RenewalStatus,
} from "@/lib/contract-status";
import { EmptyState, StatCard, StatusBadge } from "@/components/ui";
import {
  AccountingReviewButton,
  buildAccountingReview,
  hasControlsBreach,
} from "@/components/AccountingReviewButton";
import {
  BillableStatusBadge,
  BillableStatusCard,
} from "@/components/BillingCards";
import {
  contractBillableStatus,
  type BillableStatus,
  type ContractVisitSummary,
  type VisitCostSummary,
} from "@/lib/billing-status";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Contract, ContractStatus } from "@/lib/types";

type ServiceRow = {
  id: string;
  service_name: string;
  included: boolean;
};

type ChangeOrderRow = {
  id: string;
  title: string;
  description: string | null;
  quoted_amount: number;
  status: string;
};

type PendingRequestRow = {
  id: string;
  contract_id: string;
  summary: string | null;
  created_at: string;
};

type AuditLogRow = {
  id: string;
  contract_id: string;
  action: string;
  actor_role: string;
  created_at: string;
};

export type AccountantContractRow = Contract & {
  customers?: {
    name: string;
    property_type?: string | null;
    address?: string | null;
    contact_name?: string | null;
  } | null;
  contract_services?: ServiceRow[] | null;
  extra_work_orders?: ChangeOrderRow[] | null;
};

const STATUS_OPTIONS: ContractStatus[] = [
  "draft",
  "active",
  "completed",
  "cancelled",
];

const RENEWAL_OPTIONS: Array<{ value: "all" | RenewalStatus; label: string }> =
  [
    { value: "all", label: "All renewal statuses" },
    { value: "current", label: "Current" },
    { value: "expiring", label: "Expiring (≤ 30 days)" },
    { value: "expired", label: "Expired" },
  ];

const selectClassName =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 shadow-sm focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700";

const inputClassName =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 shadow-sm focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700";

function customerName(contract: AccountantContractRow) {
  return contract.customers?.name ?? "";
}

function RenewalTracker({
  contract,
  renewal,
}: {
  contract: AccountantContractRow;
  renewal: RenewalStatus;
}) {
  const endDate = getContractEndDate(contract);
  const start = new Date(`${contract.season_start}T00:00:00`).getTime();
  const end = new Date(`${endDate}T00:00:00`).getTime();
  const today = Date.now();
  const total = Math.max(end - start, 1);
  const elapsed = Math.min(Math.max(today - start, 0), total);
  const progress = Math.round((elapsed / total) * 100);

  const barColor =
    renewal === "expired"
      ? "bg-red-600"
      : renewal === "expiring"
        ? "bg-amber-500"
        : "bg-green-700";

  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-green-950">Renewal tracker</p>
        <StatusBadge status={renewal} />
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-stone-200">
        <div className={`h-full ${barColor}`} style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-2 text-xs text-stone-500">
        {formatDate(contract.season_start)} → {formatDate(endDate)}
        {contract.renewal_date
          ? ` · Renewal ${formatDate(contract.renewal_date)}`
          : ""}
      </p>
    </div>
  );
}

export function AccountantContractsView({
  contracts,
  unprofitableIds = [],
  pendingRequests = [],
  auditLogs = [],
  visits = [],
  costs = [],
}: {
  contracts: AccountantContractRow[];
  unprofitableIds?: string[];
  pendingRequests?: PendingRequestRow[];
  auditLogs?: AuditLogRow[];
  visits?: ContractVisitSummary[];
  costs?: VisitCostSummary[];
}) {
  const [search, setSearch] = useState("");
  const [contractFilter, setContractFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [renewalFilter, setRenewalFilter] = useState<"all" | RenewalStatus>(
    "all"
  );
  const [controlsFilter, setControlsFilter] = useState<"all" | "breached">(
    "all"
  );
  const [billableFilter, setBillableFilter] = useState<"all" | BillableStatus>(
    "all"
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const unprofitableSet = useMemo(
    () => new Set(unprofitableIds),
    [unprofitableIds]
  );

  const reviewByContractId = useMemo(() => {
    const map = new Map<string, ReturnType<typeof buildAccountingReview>>();
    for (const contract of contracts) {
      const pending = pendingRequests.some(
        (request) => request.contract_id === contract.id
      );
      const quotedOrders = (contract.extra_work_orders ?? []).some(
        (order) => order.status === "quoted"
      );
      map.set(
        contract.id,
        buildAccountingReview({
          status: contract.status,
          monthlyFee: contract.monthly_fee,
          billingMethod: contract.billing_method,
          seasonStart: contract.season_start,
          seasonEnd: contract.season_end,
          hasPendingEdits: pending,
          hasQuotedChangeOrders: quotedOrders,
          unprofitable: unprofitableSet.has(contract.id),
        })
      );
    }
    return map;
  }, [contracts, pendingRequests, unprofitableSet]);

  const billableByContractId = useMemo(() => {
    const map = new Map<string, BillableStatus>();
    for (const contract of contracts) {
      const contractVisits = visits.filter(
        (visit) => visit.contract_id === contract.id
      );
      const visitIds = new Set(contractVisits.map((visit) => visit.id));
      map.set(
        contract.id,
        contractBillableStatus({
          visits: contractVisits,
          costs: costs.filter((cost) => visitIds.has(cost.visit_id)),
          hasPendingApproval:
            pendingRequests.some((request) => request.contract_id === contract.id) ||
            (contract.extra_work_orders ?? []).some(
              (order) => order.status === "quoted"
            ),
        })
      );
    }
    return map;
  }, [contracts, visits, costs, pendingRequests]);

  const kpis = useMemo(() => {
    const active = contracts.filter((c) => c.status === "active");
    const monthlyValue = active.reduce(
      (sum, c) => sum + Number(c.monthly_fee ?? 0),
      0
    );
    const expiring = contracts.filter(
      (c) => getRenewalStatus(c) === "expiring"
    ).length;
    const expired = contracts.filter(
      (c) => getRenewalStatus(c) === "expired"
    ).length;
    const controlsBreached = contracts.filter((c) => {
      const review = reviewByContractId.get(c.id);
      return review ? hasControlsBreach(review) : false;
    }).length;
    const openChangeOrders = contracts.reduce((sum, c) => {
      const orders = c.extra_work_orders ?? [];
      return (
        sum +
        orders.filter((o) => o.status === "quoted" || o.status === "approved")
          .length
      );
    }, 0);

    return {
      activeCount: active.length,
      monthlyValue,
      expiring,
      expired,
      controlsBreached,
      openChangeOrders,
      pendingApprovals: pendingRequests.length,
    };
  }, [contracts, pendingRequests, reviewByContractId]);

  const contractOptions = useMemo(
    () =>
      [...new Set(contracts.map((contract) => contract.title))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [contracts]
  );

  const customerOptions = useMemo(
    () =>
      [
        ...new Set(
          contracts
            .map((contract) => customerName(contract))
            .filter((name) => name.length > 0)
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [contracts]
  );

  const filteredContracts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return contracts.filter((contract) => {
      if (contractFilter !== "all" && contract.title !== contractFilter) {
        return false;
      }
      if (
        customerFilter !== "all" &&
        customerName(contract) !== customerFilter
      ) {
        return false;
      }
      if (statusFilter !== "all" && contract.status !== statusFilter) {
        return false;
      }

      const renewal = getRenewalStatus(contract);
      if (renewalFilter !== "all" && renewal !== renewalFilter) {
        return false;
      }

      if (controlsFilter === "breached") {
        const review = reviewByContractId.get(contract.id);
        if (!review || !hasControlsBreach(review)) return false;
      }

      if (billableFilter !== "all") {
        if (billableByContractId.get(contract.id) !== billableFilter) {
          return false;
        }
      }

      if (query) {
        const haystack = [
          contract.title,
          customerName(contract),
          contract.customers?.address ?? "",
          contract.account_manager ?? "",
          contract.assigned_crew ?? "",
          contract.status,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }, [
    contracts,
    search,
    contractFilter,
    customerFilter,
    statusFilter,
    renewalFilter,
    controlsFilter,
    billableFilter,
    reviewByContractId,
    billableByContractId,
  ]);

  const focusedContract =
    filteredContracts.find((contract) => contract.id === expandedId) ??
    filteredContracts[0];

  if (contracts.length === 0) {
    return (
      <EmptyState message="No contracts yet. Add a contract to get started." />
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
        <StatCard label="Active Contracts" value={kpis.activeCount} />
        <StatCard
          label="Monthly Value"
          value={formatCurrency(kpis.monthlyValue)}
        />
        <StatCard
          label="Expiring Soon"
          value={kpis.expiring}
          hint="Within 30 days"
        />
        <StatCard label="Expired" value={kpis.expired} />
        <StatCard
          label="Controls Breached"
          value={kpis.controlsBreached}
          hint="Internal control failures"
        />
        <StatCard
          label="Open Change Orders"
          value={kpis.openChangeOrders}
          hint="Quoted or approved"
        />
        <StatCard
          label="Pending Approvals"
          value={kpis.pendingApprovals}
          hint="Manager approval queue"
        />
      </div>

      <BillableStatusCard
        current={
          focusedContract
            ? billableByContractId.get(focusedContract.id)
            : undefined
        }
      />

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-semibold">Internal controls (accountant contracts)</p>
        <p className="mt-1 text-amber-900">
          Edits require manager approval, change orders follow quoted → approved,
          actions are audited, and invoicing stays blocked until visits are
          complete. Crew cannot edit contracts here.
        </p>
      </div>

      {/* 2. Search & filter bar */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="mb-4">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-stone-600">
              Search
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search contracts, customers, crew, address..."
              className={inputClassName}
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-stone-600">
              Contract
            </span>
            <select
              className={selectClassName}
              value={contractFilter}
              onChange={(event) => setContractFilter(event.target.value)}
            >
              <option value="all">All contracts</option>
              {contractOptions.map((title) => (
                <option key={title} value={title}>
                  {title}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-stone-600">
              Customer
            </span>
            <select
              className={selectClassName}
              value={customerFilter}
              onChange={(event) => setCustomerFilter(event.target.value)}
            >
              <option value="all">All customers</option>
              {customerOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-stone-600">
              Contract Status
            </span>
            <select
              className={selectClassName}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status.replace("_", " ")}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-stone-600">
              Renewal Status
            </span>
            <select
              className={selectClassName}
              value={renewalFilter}
              onChange={(event) =>
                setRenewalFilter(event.target.value as "all" | RenewalStatus)
              }
            >
              {RENEWAL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-stone-600">
              Internal Controls
            </span>
            <select
              className={selectClassName}
              value={controlsFilter}
              onChange={(event) =>
                setControlsFilter(event.target.value as "all" | "breached")
              }
            >
              <option value="all">All contracts</option>
              <option value="breached">Controls breached only</option>
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-stone-600">
              Billable Status
            </span>
            <select
              className={selectClassName}
              value={billableFilter}
              onChange={(event) =>
                setBillableFilter(event.target.value as "all" | BillableStatus)
              }
            >
              <option value="all">All billable statuses</option>
              <option value="billable">Billable</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="missing_labor">Missing Labor Entry</option>
            </select>
          </label>
        </div>
      </div>

      {filteredContracts.length === 0 ? (
        <EmptyState message="No contracts match the selected filters." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-50 text-left text-stone-600">
              <tr>
                <th className="w-10 px-3 py-3" />
                <th className="px-4 py-3 font-medium">Contract</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Monthly Fee</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Renewal</th>
                <th className="px-4 py-3 font-medium">Billable Status</th>
                <th className="px-4 py-3 font-medium">Flags</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredContracts.map((contract) => {
                const renewal = getRenewalStatus(contract);
                const isUnprofitable = unprofitableSet.has(contract.id);
                const isExpanded = expandedId === contract.id;
                const services = contract.contract_services ?? [];
                const changeOrders = contract.extra_work_orders ?? [];
                const contractPending = pendingRequests.filter(
                  (request) => request.contract_id === contract.id
                );
                const contractLogs = auditLogs
                  .filter((log) => log.contract_id === contract.id)
                  .slice(0, 5);
                const accountingReview =
                  reviewByContractId.get(contract.id) ??
                  buildAccountingReview({
                    status: contract.status,
                    monthlyFee: contract.monthly_fee,
                    billingMethod: contract.billing_method,
                    seasonStart: contract.season_start,
                    seasonEnd: contract.season_end,
                    hasPendingEdits: contractPending.length > 0,
                    hasQuotedChangeOrders: changeOrders.some(
                      (order) => order.status === "quoted"
                    ),
                    unprofitable: isUnprofitable,
                  });
                const controlsBreached = hasControlsBreach(accountingReview);
                const rowClass =
                  renewal === "expired"
                    ? "bg-red-50/70"
                    : renewal === "expiring"
                      ? "bg-amber-50/40"
                      : "";

                return (
                  <Fragment key={contract.id}>
                    <tr className={`border-t border-stone-100 ${rowClass}`}>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          aria-label={
                            isExpanded ? "Collapse details" : "Expand details"
                          }
                          onClick={() =>
                            setExpandedId(isExpanded ? null : contract.id)
                          }
                          className="rounded-full border border-stone-300 p-1 text-stone-600 hover:bg-stone-100"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/contracts/${contract.id}`}
                          className="font-medium text-green-800 hover:underline"
                        >
                          {contract.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {customerName(contract) || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {contract.monthly_fee
                          ? formatCurrency(Number(contract.monthly_fee))
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          status={getContractDisplayStatus(contract)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={renewal} />
                      </td>
                      <td className="px-4 py-3">
                        <BillableStatusBadge
                          status={
                            billableByContractId.get(contract.id) ??
                            "pending_approval"
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        {controlsBreached ? (
                          <StatusBadge status="controls_breached" />
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <AccountingReviewButton review={accountingReview} />
                          <Link
                            href={`/contracts/${contract.id}?edit=1`}
                            className="inline-flex rounded-lg border border-green-800 px-3 py-1.5 text-xs font-medium text-green-900 hover:bg-green-50"
                          >
                            Edit
                          </Link>
                        </div>
                      </td>
                    </tr>

                    {isExpanded ? (
                      <tr className="border-t border-stone-100 bg-stone-50/80">
                        <td colSpan={9} className="px-4 py-4">
                          <div className="grid gap-4 lg:grid-cols-3">
                            <div className="rounded-lg border border-stone-200 bg-white p-4">
                              <h3 className="text-sm font-semibold text-green-950">
                                Contract details
                              </h3>
                              <dl className="mt-3 space-y-2 text-sm">
                                <div className="flex justify-between gap-3">
                                  <dt className="text-stone-500">Customer</dt>
                                  <dd>{customerName(contract) || "—"}</dd>
                                </div>
                                <div className="flex justify-between gap-3">
                                  <dt className="text-stone-500">Address</dt>
                                  <dd className="text-right">
                                    {contract.customers?.address ?? "—"}
                                  </dd>
                                </div>
                                <div className="flex justify-between gap-3">
                                  <dt className="text-stone-500">
                                    Contract value
                                  </dt>
                                  <dd>
                                    {contract.monthly_fee
                                      ? formatCurrency(
                                          Number(contract.monthly_fee)
                                        )
                                      : "—"}
                                  </dd>
                                </div>
                                <div className="flex justify-between gap-3">
                                  <dt className="text-stone-500">Season</dt>
                                  <dd>
                                    {formatDate(contract.season_start)} –{" "}
                                    {formatDate(contract.season_end)}
                                  </dd>
                                </div>
                                <div className="flex justify-between gap-3">
                                  <dt className="text-stone-500">Crew</dt>
                                  <dd>{contract.assigned_crew ?? "—"}</dd>
                                </div>
                                <div className="flex justify-between gap-3">
                                  <dt className="text-stone-500">
                                    Account manager
                                  </dt>
                                  <dd>{contract.account_manager ?? "—"}</dd>
                                </div>
                                <div className="flex justify-between gap-3">
                                  <dt className="text-stone-500">Billing</dt>
                                  <dd className="capitalize">
                                    {contract.billing_method.replace("_", " ")}
                                  </dd>
                                </div>
                              </dl>
                              <div className="mt-4">
                                <RenewalTracker
                                  contract={contract}
                                  renewal={renewal}
                                />
                              </div>
                            </div>

                            <div className="rounded-lg border border-stone-200 bg-white p-4">
                              <h3 className="text-sm font-semibold text-green-950">
                                Services included
                              </h3>
                              {services.length === 0 ? (
                                <p className="mt-3 text-sm text-stone-500">
                                  No services listed on this contract.
                                </p>
                              ) : (
                                <ul className="mt-3 space-y-2">
                                  {services.map((service) => (
                                    <li
                                      key={service.id}
                                      className="flex items-center justify-between rounded-md bg-stone-50 px-3 py-2 text-sm"
                                    >
                                      <span>{service.service_name}</span>
                                      <span className="text-green-700">
                                        {service.included
                                          ? "Included"
                                          : "Add-on"}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>

                            <div className="rounded-lg border border-stone-200 bg-white p-4">
                              <h3 className="text-sm font-semibold text-green-950">
                                Change orders & controls
                              </h3>
                              <p className="mt-1 text-xs text-stone-500">
                                Approval workflow + recent audit activity.
                              </p>

                              {contractPending.length > 0 ? (
                                <div className="mt-3 space-y-2">
                                  <p className="text-xs font-medium text-amber-800">
                                    Pending manager approvals
                                  </p>
                                  {contractPending.map((request) => (
                                    <div
                                      key={request.id}
                                      className="rounded-md border border-amber-200 bg-amber-50 p-2"
                                    >
                                      <p className="text-xs text-amber-950">
                                        {request.summary ?? "Contract edit"}
                                      </p>
                                      <div className="mt-2 flex gap-2">
                                        <form action={approveContractChangeRequest}>
                                          <input
                                            type="hidden"
                                            name="request_id"
                                            value={request.id}
                                          />
                                          <button
                                            type="submit"
                                            className="rounded-md bg-green-800 px-2 py-1 text-[11px] font-medium text-white hover:bg-green-700"
                                          >
                                            Approve as Manager
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
                                            className="rounded-md border border-stone-300 px-2 py-1 text-[11px] font-medium text-stone-700 hover:bg-white"
                                          >
                                            Reject
                                          </button>
                                        </form>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : null}

                              {changeOrders.length === 0 ? (
                                <p className="mt-3 text-sm text-stone-500">
                                  No change orders yet.
                                </p>
                              ) : (
                                <ul className="mt-3 space-y-2">
                                  {changeOrders.map((order) => (
                                    <li
                                      key={order.id}
                                      className="rounded-md border border-stone-200 px-3 py-2"
                                    >
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-sm font-medium text-stone-800">
                                          {order.title}
                                        </p>
                                        <StatusBadge status={order.status} />
                                      </div>
                                      <p className="mt-1 text-sm font-semibold text-green-900">
                                        {formatCurrency(
                                          Number(order.quoted_amount)
                                        )}
                                      </p>
                                      {order.status === "quoted" ? (
                                        <form
                                          action={approveExtraWork}
                                          className="mt-2"
                                        >
                                          <input
                                            type="hidden"
                                            name="extra_work_id"
                                            value={order.id}
                                          />
                                          <button
                                            type="submit"
                                            className="rounded-md bg-green-800 px-2 py-1 text-[11px] font-medium text-white hover:bg-green-700"
                                          >
                                            Approve change order
                                          </button>
                                        </form>
                                      ) : null}
                                    </li>
                                  ))}
                                </ul>
                              )}

                              {contractLogs.length > 0 ? (
                                <div className="mt-3 border-t border-stone-100 pt-3">
                                  <p className="text-xs font-medium text-stone-600">
                                    Recent audit log
                                  </p>
                                  <ul className="mt-2 space-y-1">
                                    {contractLogs.map((log) => (
                                      <li
                                        key={log.id}
                                        className="text-xs text-stone-500"
                                      >
                                        <span className="capitalize">
                                          {log.action.replaceAll("_", " ")}
                                        </span>{" "}
                                        · {log.actor_role}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}

                              <Link
                                href={`/contracts/${contract.id}`}
                                className="mt-3 inline-block text-xs font-medium text-green-800 hover:underline"
                              >
                                Open full contract controls →
                              </Link>
                            </div>
                          </div>
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
    </div>
  );
}
