"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  markScopeCreepAction,
  type ScopeCreepAction,
} from "@/app/actions/business";
import { formatCurrency } from "@/lib/format";
import type {
  ScopeCreepAlert,
  ScopeCreepOccurrence,
} from "@/lib/contract-controls";

type FilterMode = "company" | "task";

const ACTIONS: {
  value: ScopeCreepAction;
  label: string;
}[] = [
  { value: "change_order", label: "Create change-order request" },
  { value: "renewal", label: "Add to renewal proposal" },
  { value: "goodwill", label: "Mark as goodwill service" },
];

interface ScopeRow {
  key: string;
  contractId: string;
  company: string;
  job: string;
  amount: number;
  windowLabel: string;
  reason: string;
  detail: string;
  occurrences: ScopeCreepOccurrence[];
}

function flattenAlerts(alerts: ScopeCreepAlert[]): ScopeRow[] {
  return alerts.flatMap((alert) =>
    alert.items.map((item) => ({
      key: `${alert.contractId}::${item.title}`,
      contractId: alert.contractId,
      company: alert.propertyName,
      job: item.title,
      amount: item.amount,
      windowLabel: alert.windowLabel,
      reason: item.reason,
      detail: alert.detail,
      occurrences: item.occurrences ?? [
        { label: "Visit 1", amount: item.amount },
      ],
    }))
  );
}

export function OutOfScopeWorkWatch({ alerts }: { alerts: ScopeCreepAlert[] }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<FilterMode>("company");
  const [selected, setSelected] = useState("all");
  const [openKey, setOpenKey] = useState<string | null>(null);

  const rows = useMemo(() => flattenAlerts(alerts), [alerts]);

  const companies = useMemo(() => {
    return [...new Set(rows.map((r) => r.company))].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [rows]);

  const tasks = useMemo(() => {
    return [...new Set(rows.map((r) => r.job))].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [rows]);

  const filtered = useMemo(() => {
    if (selected === "all") return rows;
    if (mode === "company") return rows.filter((r) => r.company === selected);
    return rows.filter((r) => r.job === selected);
  }, [rows, mode, selected]);

  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm text-stone-600">
          Filter by
          <select
            className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900"
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as FilterMode);
              setSelected("all");
              setOpenKey(null);
            }}
          >
            <option value="company">Companies</option>
            <option value="task">Tasks</option>
          </select>
        </label>

        <label className="block text-sm text-stone-600">
          {mode === "company" ? "Company name" : "Task name"}
          <select
            className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900"
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setOpenKey(null);
            }}
          >
            <option value="all">
              {mode === "company" ? "All companies" : "All tasks"}
            </option>
            {(mode === "company" ? companies : tasks).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-stone-500">
          No repeated uncontracted work detected in this demo set.
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-stone-500">No items match this filter.</p>
      ) : (
        <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl border border-amber-200 bg-amber-50/40 p-3 pr-2">
          {filtered.map((row) => {
            const open = openKey === row.key;
            const companyFixed = mode === "company" && selected !== "all";
            const taskFixed = mode === "task" && selected !== "all";
            const primary = companyFixed
              ? row.job
              : taskFixed
                ? row.company
                : row.company;
            const secondary = companyFixed
              ? null
              : taskFixed
                ? null
                : row.job;

            return (
              <div key={row.key} className="space-y-2">
                <button
                  type="button"
                  onClick={() =>
                    setOpenKey((current) =>
                      current === row.key ? null : row.key
                    )
                  }
                  className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                    open
                      ? "border-amber-700 bg-amber-100"
                      : "border-amber-200 bg-white hover:border-amber-500"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-amber-950">
                      {primary}
                    </p>
                    {secondary ? (
                      <p className="truncate text-sm text-stone-600">
                        {secondary}
                      </p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-amber-950">
                      {formatCurrency(row.amount)}
                    </p>
                    <p className="text-xs font-medium text-amber-800">
                      {open ? "Hide" : "Details"}
                    </p>
                  </div>
                </button>

                {open ? (
                  <div className="rounded-lg border border-amber-200 bg-white p-3 text-sm">
                    {companyFixed ? null : (
                      <p className="font-medium text-stone-800">{row.company}</p>
                    )}
                    {taskFixed ? null : (
                      <p
                        className={
                          companyFixed
                            ? "font-medium text-stone-800"
                            : "mt-0.5 text-stone-700"
                        }
                      >
                        {row.job}
                      </p>
                    )}
                    <p className={`${companyFixed || taskFixed ? "" : "mt-2 "}text-stone-600`}>
                      {row.reason}
                    </p>
                    {row.occurrences.length > 0 ? (
                      <ul className="mt-2 space-y-1 rounded-md bg-stone-50 px-3 py-2 text-sm text-stone-700">
                        {row.occurrences.map((occ) => (
                          <li
                            key={occ.label}
                            className="flex items-center justify-between gap-3"
                          >
                            <span>{occ.label}</span>
                            <span className="font-medium text-amber-950">
                              {formatCurrency(occ.amount)}
                            </span>
                          </li>
                        ))}
                        {row.occurrences.length > 1 ? (
                          <li className="flex items-center justify-between gap-3 border-t border-stone-200 pt-1 font-semibold text-amber-950">
                            <span>Total ({row.occurrences.length} times)</span>
                            <span>{formatCurrency(row.amount)}</span>
                          </li>
                        ) : null}
                      </ul>
                    ) : null}
                    <p className="mt-1 text-xs text-stone-500">
                      {row.windowLabel}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {ACTIONS.map((action) => (
                        <button
                          key={action.value}
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            startTransition(async () => {
                              const result = await markScopeCreepAction(
                                row.contractId,
                                action.value
                              );
                              setMessage(
                                result.message ?? `${action.label} recorded.`
                              );
                            });
                          }}
                          className="rounded-md border border-amber-700 bg-white px-3 py-1.5 text-xs font-medium text-amber-950 hover:bg-amber-50 disabled:opacity-60"
                        >
                          {action.label}
                        </button>
                      ))}
                      <Link
                        href={`/contracts/${row.contractId}`}
                        className="rounded-md bg-green-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                      >
                        Open contract
                      </Link>
                    </div>

                    {message ? (
                      <p className="mt-2 text-xs font-medium text-green-900">
                        {message}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
