"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";
import type { CostType } from "@/lib/types";
import type { DirectCostsBreakdown } from "@/app/reports/profitability/queries";

const COST_TYPES: {
  key: CostType;
  label: string;
  hint: string;
}[] = [
  {
    key: "labor",
    label: "Labor",
    hint: "Crew wages logged on service visits",
  },
  {
    key: "materials",
    label: "Materials",
    hint: "Fertilizer, parts, chemicals, and supplies",
  },
  {
    key: "equipment",
    label: "Equipment",
    hint: "Equipment usage and rental charged to visits",
  },
];

type Scope =
  | { kind: "all" }
  | { kind: "contract"; contractId: string; title: string };

export function AccountantDirectCostsStatButton({
  amount,
  breakdown,
}: {
  amount: number;
  breakdown: DirectCostsBreakdown;
}) {
  return (
    <AccountantDirectCostsButton
      amount={amount}
      breakdown={breakdown}
      scope={{ kind: "all" }}
      variant="stat"
    />
  );
}

export function AccountantDirectCostsCellButton({
  amount,
  breakdown,
  contractId,
  contractTitle,
}: {
  amount: number;
  breakdown: DirectCostsBreakdown;
  contractId: string;
  contractTitle: string;
}) {
  return (
    <AccountantDirectCostsButton
      amount={amount}
      breakdown={breakdown}
      scope={{ kind: "contract", contractId, title: contractTitle }}
      variant="cell"
    />
  );
}

function AccountantDirectCostsButton({
  amount,
  breakdown,
  scope,
  variant,
}: {
  amount: number;
  breakdown: DirectCostsBreakdown;
  scope: Scope;
  variant: "stat" | "cell";
}) {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<CostType | "all">("all");

  const scoped = useMemo(() => {
    if (scope.kind === "all") {
      return {
        labor: breakdown.labor,
        materials: breakdown.materials,
        equipment: breakdown.equipment,
        total: breakdown.total,
        contracts: breakdown.byContract.filter((c) => c.total > 0),
        heading: "Direct Costs",
        subheading:
          "Labor, materials, and equipment charged to active-contract visits.",
      };
    }

    const row = breakdown.byContract.find(
      (c) => c.contractId === scope.contractId
    );
    return {
      labor: row?.labor ?? 0,
      materials: row?.materials ?? 0,
      equipment: row?.equipment ?? 0,
      total: row?.total ?? amount,
      contracts: row ? [row] : [],
      heading: `Direct Costs — ${scope.title}`,
      subheading: "Cost types logged on this contract’s service visits.",
    };
  }, [amount, breakdown, scope]);

  const amountFor = (key: CostType) => scoped[key];

  const tableRows = useMemo(() => {
    return scoped.contracts
      .map((c) => {
        const typeAmount =
          selectedType === "all"
            ? c.total
            : selectedType === "labor"
              ? c.labor
              : selectedType === "materials"
                ? c.materials
                : c.equipment;
        return { ...c, typeAmount };
      })
      .filter((c) => c.typeAmount > 0)
      .sort((a, b) => b.typeAmount - a.typeAmount);
  }, [scoped.contracts, selectedType]);

  return (
    <>
      {variant === "stat" ? (
        <button
          type="button"
          onClick={() => {
            setSelectedType("all");
            setOpen(true);
          }}
          className="gs-kpi-tile gs-kpi-tile--interactive"
        >
          <p className="gs-kpi-label">Total Direct Costs</p>
          <p
            className="gs-metric-value gs-kpi-value text-green-900"
            title={formatCurrency(amount)}
          >
            {formatCurrency(amount)}
          </p>
          <p className="gs-kpi-hint gs-kpi-hint--action">
            Click to separate labor, materials, and equipment
          </p>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            setSelectedType("all");
            setOpen(true);
          }}
          className="rounded-md text-left font-medium text-green-900 underline decoration-green-700/40 underline-offset-2 hover:text-green-800 hover:decoration-green-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-700/30"
          title="View Direct Cost Breakdown"
        >
          {formatCurrency(amount)}
        </button>
      )}

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="direct-costs-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-stone-100 px-6 py-5">
              <div>
                <h2
                  id="direct-costs-title"
                  className="text-lg font-semibold text-green-950"
                >
                  {scoped.heading}
                </h2>
                <p className="mt-1 text-sm text-stone-500">{scoped.subheading}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-1 text-stone-400 hover:bg-stone-50 hover:text-stone-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5">
              <p className="mb-3 text-sm font-medium text-stone-700">
                Choose a cost type
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {COST_TYPES.map((type) => {
                  const selected = selectedType === type.key;
                  return (
                    <button
                      key={type.key}
                      type="button"
                      onClick={() =>
                        setSelectedType(selected ? "all" : type.key)
                      }
                      className={`rounded-xl border p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-green-700/30 ${
                        selected
                          ? "border-green-700 bg-green-50 ring-2 ring-green-700/15"
                          : "border-stone-200 bg-white hover:border-green-700/60"
                      }`}
                    >
                      <p className="text-sm font-medium text-stone-600">
                        {type.label}
                      </p>
                      <p className="mt-1 gs-metric-value text-2xl text-green-900">
                        {formatCurrency(amountFor(type.key))}
                      </p>
                      <p className="mt-1 text-xs text-stone-400">{type.hint}</p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-sm text-stone-500">
                  {selectedType === "all"
                    ? "Showing all direct costs by contract"
                    : `Showing ${COST_TYPES.find((t) => t.key === selectedType)?.label.toLowerCase()} by contract`}
                </p>
                <p className="text-sm font-semibold text-green-950">
                  Total{" "}
                  {formatCurrency(
                    selectedType === "all"
                      ? scoped.total
                      : amountFor(selectedType)
                  )}
                </p>
              </div>

              {tableRows.length === 0 ? (
                <p className="mt-6 rounded-lg border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
                  No {selectedType === "all" ? "direct" : selectedType} costs
                  logged for this scope.
                </p>
              ) : (
                <div className="mt-4 overflow-hidden rounded-xl border border-stone-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-stone-50 text-left text-stone-600">
                      <tr>
                        <th className="px-4 py-3 font-medium">Contract</th>
                        <th className="px-4 py-3 font-medium">Customer</th>
                        {selectedType === "all" ? (
                          <>
                            <th className="px-4 py-3 font-medium">Labor</th>
                            <th className="px-4 py-3 font-medium">Materials</th>
                            <th className="px-4 py-3 font-medium">Equipment</th>
                            <th className="px-4 py-3 font-medium">Total</th>
                          </>
                        ) : (
                          <th className="px-4 py-3 font-medium">Amount</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((row) => (
                        <tr
                          key={row.contractId}
                          className="border-t border-stone-100"
                        >
                          <td className="px-4 py-3 font-medium">{row.title}</td>
                          <td className="px-4 py-3">{row.customerName}</td>
                          {selectedType === "all" ? (
                            <>
                              <td className="px-4 py-3">
                                {formatCurrency(row.labor)}
                              </td>
                              <td className="px-4 py-3">
                                {formatCurrency(row.materials)}
                              </td>
                              <td className="px-4 py-3">
                                {formatCurrency(row.equipment)}
                              </td>
                              <td className="px-4 py-3 font-medium">
                                {formatCurrency(row.total)}
                              </td>
                            </>
                          ) : (
                            <td className="px-4 py-3 font-medium">
                              {formatCurrency(row.typeAmount)}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
