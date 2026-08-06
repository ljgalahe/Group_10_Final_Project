"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  getContractDisplayStatus,
  getRenewalStatus,
  type RenewalStatus,
} from "@/lib/contract-status";
import { EmptyState, StatusBadge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Contract, ContractStatus } from "@/lib/types";

type ContractRow = Contract & {
  customers?: { name: string; property_type?: string; address?: string } | null;
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

function customerName(contract: ContractRow) {
  return contract.customers?.name ?? "";
}

export function ContractsTable({
  contracts,
  showFilters = false,
  unprofitableIds = [],
}: {
  contracts: ContractRow[];
  showFilters?: boolean;
  unprofitableIds?: string[];
}) {
  const [contractFilter, setContractFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [renewalFilter, setRenewalFilter] = useState<"all" | RenewalStatus>(
    "all"
  );
  const [profitFilter, setProfitFilter] = useState<"all" | "unprofitable">(
    "all"
  );

  const unprofitableSet = useMemo(
    () => new Set(unprofitableIds),
    [unprofitableIds]
  );

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
    if (!showFilters) return contracts;

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

      if (profitFilter === "unprofitable" && !unprofitableSet.has(contract.id)) {
        return false;
      }

      return true;
    });
  }, [
    contracts,
    showFilters,
    contractFilter,
    customerFilter,
    statusFilter,
    renewalFilter,
    profitFilter,
    unprofitableSet,
  ]);

  if (contracts.length === 0) {
    return (
      <EmptyState message="No contracts yet. Run the seed script in Supabase to load demo data." />
    );
  }

  return (
    <div className="space-y-4">
      {showFilters ? (
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
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
                Profitability
              </span>
              <select
                className={selectClassName}
                value={profitFilter}
                onChange={(event) =>
                  setProfitFilter(
                    event.target.value as "all" | "unprofitable"
                  )
                }
              >
                <option value="all">All contracts</option>
                <option value="unprofitable">Unprofitable only</option>
              </select>
            </label>
          </div>
        </div>
      ) : null}

      {filteredContracts.length === 0 ? (
        <EmptyState message="No contracts match the selected filters." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-50 text-left text-stone-600">
              <tr>
                <th className="px-4 py-3 font-medium">Contract</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Season</th>
                <th className="px-4 py-3 font-medium">Monthly Fee</th>
                <th className="px-4 py-3 font-medium">Visits/Week</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {showFilters ? (
                  <>
                    <th className="px-4 py-3 font-medium">Renewal</th>
                    <th className="px-4 py-3 font-medium">Flags</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {filteredContracts.map((contract) => {
                const renewal = getRenewalStatus(contract);
                const isUnprofitable = unprofitableSet.has(contract.id);
                const rowClass =
                  renewal === "expired"
                    ? "border-t border-red-100 bg-red-50/70"
                    : renewal === "expiring"
                      ? "border-t border-amber-100 bg-amber-50/40"
                      : "border-t border-stone-100";

                return (
                  <tr key={contract.id} className={rowClass}>
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
                      {formatDate(contract.season_start)} –{" "}
                      {formatDate(contract.season_end)}
                    </td>
                    <td className="px-4 py-3">
                      {contract.monthly_fee
                        ? formatCurrency(Number(contract.monthly_fee))
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {contract.visits_per_week ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={getContractDisplayStatus(contract)}
                      />
                    </td>
                    {showFilters ? (
                      <>
                        <td className="px-4 py-3">
                          <StatusBadge status={renewal} />
                        </td>
                        <td className="px-4 py-3">
                          {isUnprofitable ? (
                            <StatusBadge status="unprofitable" />
                          ) : (
                            <span className="text-stone-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/contracts/${contract.id}?edit=1`}
                            className="inline-flex rounded-lg border border-green-800 px-3 py-1.5 text-xs font-medium text-green-900 hover:bg-green-50"
                          >
                            Edit
                          </Link>
                        </td>
                      </>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
