"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  addUnbilledWorkToInvoice,
  createDraftInvoice,
  recordPaymentPromise,
} from "@/app/actions/business";
import { StatusBadge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  buildUnbilledWork,
  collectionPriorityLabel,
  invoiceHubSummary,
  managerStatusLabel,
  type ManagerInvoiceRow,
  type UnbilledWorkItem,
} from "@/lib/invoice-controls";

type CardFilter = "all" | "ready" | "unbilled" | "outstanding" | "high_risk";
type SortKey = "readiness" | "margin" | "dso" | "amount" | "due";

interface ContractOption {
  id: string;
  title: string;
  customerName: string;
}

export function InvoiceManagementHub({
  rows,
  contracts,
}: {
  rows: ManagerInvoiceRow[];
  contracts: ContractOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [cardFilter, setCardFilter] = useState<CardFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("dso");
  const [promiseInvoiceId, setPromiseInvoiceId] = useState<string | null>(
    rows.find((r) => r.balance > 0)?.invoiceId ?? rows[0]?.invoiceId ?? null
  );
  const [createContractId, setCreateContractId] = useState(
    contracts[0]?.id ?? ""
  );
  const [promiseAmount, setPromiseAmount] = useState("");
  const [promiseDate, setPromiseDate] = useState("2026-08-15");
  const [promiseContact, setPromiseContact] = useState("");
  const [removedUnbilled, setRemovedUnbilled] = useState<string[]>([]);

  const unbilledAll = useMemo(() => buildUnbilledWork(), []);
  const unbilled = useMemo(
    () => unbilledAll.filter((u) => !removedUnbilled.includes(u.id)),
    [unbilledAll, removedUnbilled]
  );
  const summary = useMemo(
    () => invoiceHubSummary(rows, unbilled),
    [rows, unbilled]
  );

  const customers = useMemo(
    () =>
      [...new Set(rows.map((r) => r.customerName))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [rows]
  );

  const filtered = useMemo(() => {
    let list = [...rows];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.invoiceNumber.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          r.property.toLowerCase().includes(q) ||
          r.contractTitle.toLowerCase().includes(q)
      );
    }
    if (customerFilter !== "all") {
      list = list.filter((r) => r.customerName === customerFilter);
    }
    if (statusFilter !== "all") {
      list = list.filter((r) => r.managerStatus === statusFilter);
    }
    if (cardFilter === "ready") {
      list = list.filter(
        (r) =>
          r.readinessScore >= 90 &&
          !r.duplicateShield.blocked &&
          r.balance > 0 &&
          r.managerStatus !== "paid"
      );
    } else if (cardFilter === "outstanding") {
      list = list.filter((r) => r.balance > 0);
    } else if (cardFilter === "high_risk") {
      list = list.filter((r) => r.highRisk);
    }

    list.sort((a, b) => {
      if (sortKey === "readiness") return b.readinessScore - a.readinessScore;
      if (sortKey === "margin") return a.profit.marginPct - b.profit.marginPct;
      if (sortKey === "amount") return b.amount - a.amount;
      if (sortKey === "due") return a.dueDate.localeCompare(b.dueDate);
      return b.daysOutstanding - a.daysOutstanding;
    });
    return list;
  }, [rows, search, customerFilter, statusFilter, cardFilter, sortKey]);

  const promiseInvoice =
    rows.find((r) => r.invoiceId === promiseInvoiceId) ?? null;

  function runAction(
    label: string,
    fn: () => Promise<{ ok: boolean; message: string }>
  ) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.ok) setMessage(result.message || label);
      else setError(result.message || "Action failed.");
    });
  }

  function addUnbilled(item: UnbilledWorkItem, invoiceId?: string) {
    runAction("Added unbilled work", async () => {
      const result = await addUnbilledWorkToInvoice({
        invoiceId,
        contractId: item.contractId,
        description: item.service,
        amount: item.amount,
        unbilledId: item.id,
      });
      if (result.ok) {
        setRemovedUnbilled((ids) => [...ids, item.id]);
      }
      return result;
    });
  }

  const collectionRows = [...rows]
    .filter((r) => r.balance > 0)
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.collectionPriority] - order[b.collectionPriority];
    });

  const promiseRows = rows.filter((r) => r.paymentPromise);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-green-950">
            Invoice Management
          </h1>
          <p className="mt-2 max-w-2xl text-stone-600">
            Scan exceptions and open an invoice for line items, readiness, and
            approvals.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm text-stone-600">
            Contract
            <select
              value={createContractId}
              onChange={(e) => setCreateContractId(e.target.value)}
              className="mt-1 block rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
            >
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.customerName} — {c.title}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={pending || !createContractId}
            onClick={() =>
              runAction("Draft created", () =>
                createDraftInvoice(createContractId)
              )
            }
            className="rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
          >
            Create Invoice
          </button>
        </div>
      </div>

      {(message || error) && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-green-200 bg-green-50 text-green-900"
          }`}
        >
          {error ?? message}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search invoice, customer, property…"
          className="min-w-[220px] flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
        />
        <select
          value={customerFilter}
          onChange={(e) => setCustomerFilter(e.target.value)}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All customers</option>
          {customers.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="ready">Ready</option>
          <option value="needs_review">Needs Review</option>
          <option value="blocked">Blocked</option>
          <option value="sent">Sent</option>
          <option value="overdue">Past Due</option>
          <option value="disputed">Disputed</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      <div className="gs-kpi-grid">
        {(
          [
            {
              id: "ready" as const,
              label: "Ready to Send",
              value: String(summary.readyToSend),
              hint: "Score ≥ 90, no shield",
            },
            {
              id: "unbilled" as const,
              label: "Completed Work Not Billed",
              value: formatCurrency(summary.unbilledAmount),
              hint: `${summary.unbilledCount} items waiting`,
            },
            {
              id: "outstanding" as const,
              label: "Outstanding Balance",
              value: formatCurrency(summary.outstandingBalance),
              hint: "Open AR",
            },
            {
              id: "high_risk" as const,
              label: "High-Risk Invoices",
              value: String(summary.highRiskCount),
              hint: "Past due, disputed, or blocked",
            },
          ] as const
        ).map((card) => {
          const active = cardFilter === card.id;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() =>
                setCardFilter((prev) => (prev === card.id ? "all" : card.id))
              }
              className={`rounded-xl border p-5 text-left shadow-sm transition ${
                active
                  ? "border-green-700 bg-green-50"
                  : "border-stone-200 bg-white hover:border-green-300"
              }`}
            >
              <p className="text-sm font-medium text-stone-500">{card.label}</p>
              <p className="mt-2 gs-metric-value text-3xl text-green-900">
                {card.value}
              </p>
              <p className="mt-1 text-xs text-stone-400">{card.hint}</p>
            </button>
          );
        })}
      </div>

      {cardFilter === "unbilled" ? null : (
        <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 bg-stone-50 px-4 py-3">
            <h2 className="text-lg font-semibold text-green-950">
              Invoice Exception Center
            </h2>
            <label className="text-sm text-stone-600">
              Sort{" "}
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="ml-1 rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm"
              >
                <option value="dso">Days outstanding</option>
                <option value="readiness">Readiness</option>
                <option value="margin">Margin</option>
                <option value="amount">Amount</option>
                <option value="due">Due date</option>
              </select>
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-white text-left text-stone-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Invoice</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium">Margin</th>
                  <th className="px-4 py-3 font-medium">DSO</th>
                  <th className="px-4 py-3 font-medium">Exception</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.invoiceId}
                    onClick={() => router.push(`/invoices/${row.invoiceId}`)}
                    className="cursor-pointer border-t border-stone-100 hover:bg-green-50/70"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-green-800">
                        {row.invoiceNumber}
                      </span>
                      <div className="text-xs text-stone-500">
                        Due {formatDate(row.dueDate)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-stone-800">
                        {row.customerName}
                      </div>
                      <div className="text-xs text-stone-500">
                        {row.property}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {formatCurrency(row.amount)}
                      {row.balance > 0 && row.balance !== row.amount ? (
                        <div className="text-xs text-amber-700">
                          Bal {formatCurrency(row.balance)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          row.readinessScore < 70
                            ? "font-semibold text-red-700"
                            : row.readinessScore < 90
                              ? "font-semibold text-amber-700"
                              : "font-semibold text-green-800"
                        }
                      >
                        {row.readinessScore}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          row.profit.belowTarget
                            ? "text-red-700"
                            : "text-stone-800"
                        }
                      >
                        {row.profit.marginPct}%
                      </span>
                    </td>
                    <td className="px-4 py-3">{row.daysOutstanding}d</td>
                    <td className="max-w-[180px] px-4 py-3 text-stone-600">
                      {row.exception}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.dbStatus} />
                      <span className="mt-1 block text-xs text-stone-500">
                        {managerStatusLabel(row.managerStatus)}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-stone-500"
                    >
                      No invoices match these filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-green-950">
            Completed Work Not Billed
          </h2>
          <p className="text-sm font-medium text-amber-800">
            {formatCurrency(summary.unbilledAmount)} waiting to bill ·{" "}
            {unbilled.length} items
          </p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-stone-600">
              <tr>
                <th className="py-2 pr-3 font-medium">Customer</th>
                <th className="py-2 pr-3 font-medium">Service</th>
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">Amount</th>
                <th className="py-2 pr-3 font-medium">Waiting</th>
                <th className="py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {unbilled.map((item) => (
                <tr key={item.id} className="border-t border-stone-100">
                  <td className="py-3 pr-3">
                    <div className="font-medium">{item.customerName}</div>
                    <div className="text-xs text-stone-500">{item.property}</div>
                  </td>
                  <td className="py-3 pr-3">
                    <div>{item.service}</div>
                    <div className="text-xs text-stone-500">{item.reason}</div>
                  </td>
                  <td className="py-3 pr-3">{formatDate(item.serviceDate)}</td>
                  <td className="py-3 pr-3">{formatCurrency(item.amount)}</td>
                  <td className="py-3 pr-3">{item.daysWaiting}d</td>
                  <td className="py-3">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        const match = rows.find(
                          (r) =>
                            r.contractId === item.contractId &&
                            r.balance >= 0 &&
                            r.dbStatus !== "paid"
                        );
                        addUnbilled(item, match?.invoiceId);
                      }}
                      className="rounded-lg bg-green-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-60"
                    >
                      Add to Invoice
                    </button>
                  </td>
                </tr>
              ))}
              {unbilled.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-stone-500">
                    All completed work is billed.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-green-950">
            Collection Priority
          </h2>
          <ul className="mt-4 space-y-3">
            {collectionRows.map((row) => (
              <li
                key={row.invoiceId}
                className="flex items-center justify-between gap-3 border-b border-stone-100 pb-3 text-sm last:border-0"
              >
                <div>
                  <button
                    type="button"
                    onClick={() => router.push(`/invoices/${row.invoiceId}`)}
                    className="font-medium text-green-800 hover:underline"
                  >
                    {row.invoiceNumber}
                  </button>
                  <div className="text-xs text-stone-500">
                    {row.customerName} · {row.daysOutstanding}d past due window
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    {formatCurrency(row.balance)}
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      row.collectionPriority === "critical"
                        ? "text-red-700"
                        : row.collectionPriority === "high"
                          ? "text-amber-700"
                          : "text-stone-600"
                    }`}
                  >
                    {collectionPriorityLabel(row.collectionPriority)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-green-950">
            Payment Promise Tracker
          </h2>
          <ul className="mt-4 space-y-3">
            {promiseRows.map((row) => {
              const p = row.paymentPromise!;
              return (
                <li
                  key={row.invoiceId}
                  className="border-b border-stone-100 pb-3 text-sm last:border-0"
                >
                  <div className="flex justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => router.push(`/invoices/${row.invoiceId}`)}
                      className="font-medium text-green-900 hover:underline"
                    >
                      {row.invoiceNumber}
                    </button>
                    <span
                      className={
                        p.status === "broken"
                          ? "text-red-700"
                          : p.status === "kept"
                            ? "text-green-800"
                            : "text-amber-700"
                      }
                    >
                      {p.status}
                    </span>
                  </div>
                  <p className="mt-1 text-stone-600">
                    {formatCurrency(p.amount)} by {formatDate(p.promisedDate)} ·{" "}
                    {p.contact}
                  </p>
                  <p className="text-xs text-stone-500">{p.notes}</p>
                </li>
              );
            })}
          </ul>
          {promiseInvoice ? (
            <div className="mt-4 space-y-2 border-t border-stone-100 pt-4">
              <label className="block text-xs font-medium uppercase tracking-wide text-stone-500">
                Record promise
                <select
                  value={promiseInvoice.invoiceId}
                  onChange={(e) => setPromiseInvoiceId(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm font-normal normal-case tracking-normal text-stone-800"
                >
                  {rows
                    .filter((r) => r.balance > 0)
                    .map((r) => (
                      <option key={r.invoiceId} value={r.invoiceId}>
                        {r.invoiceNumber} — {r.customerName}
                      </option>
                    ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  type="number"
                  placeholder="Amount"
                  value={promiseAmount}
                  onChange={(e) => setPromiseAmount(e.target.value)}
                  className="w-28 rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                />
                <input
                  type="date"
                  value={promiseDate}
                  onChange={(e) => setPromiseDate(e.target.value)}
                  className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                />
                <input
                  type="text"
                  placeholder="Contact"
                  value={promiseContact}
                  onChange={(e) => setPromiseContact(e.target.value)}
                  className="min-w-[140px] flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  disabled={pending || !promiseAmount || !promiseContact}
                  onClick={() =>
                    runAction("Promise recorded", () =>
                      recordPaymentPromise({
                        invoiceId: promiseInvoice.invoiceId,
                        amount: Number(promiseAmount),
                        promisedDate: promiseDate,
                        contact: promiseContact,
                      })
                    )
                  }
                  className="rounded-lg bg-green-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
                >
                  Save promise
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
