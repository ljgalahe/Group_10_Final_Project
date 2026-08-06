"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ServiceHoldBadge,
  ServiceHoldBanner,
} from "@/components/ServiceHoldBanner";
import { ServiceHoldAuditSync } from "@/components/ServiceHoldDashboardCard";
import { Card } from "@/components/ui";
import {
  buildCollectionRisk,
  type CollectionRiskLevel,
} from "@/lib/collection-risk";
import { formatCurrency, formatDate } from "@/lib/format";
import { APPROACHING_HOLD_MIN_DAYS } from "@/lib/manager-alerts";
import {
  buildCustomerServiceHolds,
  heldCustomerIdSet,
  SERVICE_HOLD_THRESHOLD_DAYS,
} from "@/lib/service-hold";
import type { Payment } from "@/lib/types";

export type AgingInvoice = {
  id: string;
  invoice_number: string;
  due_date: string;
  total: number;
  amount_paid: number;
  customer_id?: string;
  status?: string;
  customers: { name: string } | null;
};

export type AgingBuckets = Record<string, AgingInvoice[]>;

const BUCKET_ORDER = ["current", "1-30", "31-60", "61-90", "90+"] as const;
type AgingBucketKey = (typeof BUCKET_ORDER)[number];

const BUCKET_TITLES: Record<AgingBucketKey, string> = {
  current: "Current (not yet due)",
  "1-30": "1–30 Days Past Due",
  "31-60": "31–60 Days Past Due",
  "61-90": "61–90 Days Past Due",
  "90+": "90+ Days Past Due",
};

const COLLECTION_ACTIONS: Record<
  AgingBucketKey,
  {
    label: string;
    priority: number;
    badgeClass: string;
    icon: "check" | "mail" | "phone" | "alert" | "escalate";
  }
> = {
  current: {
    label: "No action needed.",
    priority: 1,
    badgeClass: "bg-green-100 text-green-800 border-green-200",
    icon: "check",
  },
  "1-30": {
    label: "Send friendly payment reminder.",
    priority: 2,
    badgeClass: "bg-sky-100 text-sky-900 border-sky-200",
    icon: "mail",
  },
  "31-60": {
    label: "Manager follow-up recommended.",
    priority: 3,
    badgeClass: "bg-yellow-100 text-yellow-900 border-yellow-200",
    icon: "phone",
  },
  "61-90": {
    label: "Contact customer and review account.",
    priority: 4,
    badgeClass: "bg-orange-100 text-orange-900 border-orange-200",
    icon: "alert",
  },
  "90+": {
    label: "Escalate collections and review contract status.",
    priority: 5,
    badgeClass: "bg-red-100 text-red-800 border-red-200",
    icon: "escalate",
  },
};

function invoiceBalance(invoice: AgingInvoice) {
  return Math.round((Number(invoice.total) - Number(invoice.amount_paid)) * 100) / 100;
}

function daysPastDue(dueDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

function agingBucketForDays(days: number): AgingBucketKey {
  if (days <= 0) return "current";
  if (days <= 30) return "1-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

function flattenBuckets(buckets: AgingBuckets): AgingInvoice[] {
  return BUCKET_ORDER.flatMap((key) => buckets[key] ?? []);
}

export function ArAgingManagerClient({
  buckets,
  payments,
  highlightCustomerId,
  alertFilter,
}: {
  buckets: AgingBuckets;
  payments: Payment[];
  highlightCustomerId?: string;
  alertFilter?: "hold" | "approaching";
}) {
  const [selectedBucket, setSelectedBucket] =
    useState<AgingBucketKey>(() =>
      alertFilter === "hold"
        ? "31-60"
        : alertFilter === "approaching"
          ? "1-30"
          : "current"
    );
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(
    () => new Set(highlightCustomerId ? [highlightCustomerId] : [])
  );

  const allInvoices = useMemo(() => flattenBuckets(buckets), [buckets]);

  const serviceHolds = useMemo(
    () =>
      buildCustomerServiceHolds(
        allInvoices
          .filter((invoice) => Boolean(invoice.customer_id))
          .map((invoice) => ({
            id: invoice.id,
            invoice_number: invoice.invoice_number,
            customer_id: String(invoice.customer_id),
            total: Number(invoice.total),
            amount_paid: Number(invoice.amount_paid),
            status: invoice.status ?? "sent",
            due_date: invoice.due_date,
            customers: invoice.customers,
          }))
      ),
    [allInvoices]
  );
  const heldIds = useMemo(
    () => heldCustomerIdSet(serviceHolds),
    [serviceHolds]
  );

  useEffect(() => {
    if (!highlightCustomerId) return;
    setExpandedCustomers((prev) => {
      const next = new Set(prev);
      next.add(highlightCustomerId);
      return next;
    });
  }, [highlightCustomerId]);

  const approachingCustomerIds = useMemo(() => {
    const ids = new Set<string>();
    for (const invoice of allInvoices) {
      if (!invoice.customer_id) continue;
      if (heldIds.has(invoice.customer_id)) continue;
      if (invoiceBalance(invoice) <= 0) continue;
      const days = daysPastDue(invoice.due_date);
      if (
        days >= APPROACHING_HOLD_MIN_DAYS &&
        days < SERVICE_HOLD_THRESHOLD_DAYS
      ) {
        ids.add(invoice.customer_id);
      }
    }
    return ids;
  }, [allInvoices, heldIds]);

  useEffect(() => {
    if (alertFilter === "hold" && heldIds.size > 0) {
      setExpandedCustomers(new Set(heldIds));
      return;
    }
    if (alertFilter === "approaching" && approachingCustomerIds.size > 0) {
      setExpandedCustomers(new Set(approachingCustomerIds));
    }
  }, [alertFilter, heldIds, approachingCustomerIds]);

  const collectionRisk = useMemo(
    () =>
      buildCollectionRisk(
        allInvoices
          .filter((invoice) => Boolean(invoice.customer_id))
          .map((invoice) => ({
            ...invoice,
            customer_id: String(invoice.customer_id),
            status: invoice.status ?? "sent",
          })),
        payments
      ),
    [allInvoices, payments]
  );

  const highRiskCustomerIds = useMemo(
    () =>
      new Set(
        collectionRisk
          .filter((row) => row.risk === "high")
          .map((row) => row.customerId)
      ),
    [collectionRisk]
  );

  const riskByCustomer = useMemo(() => {
    const map = new Map<string, CollectionRiskLevel>();
    for (const row of collectionRisk) {
      map.set(row.customerId, row.risk);
    }
    return map;
  }, [collectionRisk]);

  const customerCollectionRows = useMemo(() => {
    type Acc = {
      customerId: string;
      customerName: string;
      outstandingBalance: number;
      overdueInvoiceCount: number;
      pastDueDays: number[];
      oldestInvoice: AgingInvoice | null;
      invoices: AgingInvoice[];
    };

    const byCustomer = new Map<string, Acc>();

    for (const invoice of allInvoices) {
      const balance = invoiceBalance(invoice);
      if (balance <= 0) continue;

      const customerId = invoice.customer_id ?? "unknown";
      const customerName = invoice.customers?.name ?? "Unknown customer";
      let row = byCustomer.get(customerId);
      if (!row) {
        row = {
          customerId,
          customerName,
          outstandingBalance: 0,
          overdueInvoiceCount: 0,
          pastDueDays: [],
          oldestInvoice: null,
          invoices: [],
        };
        byCustomer.set(customerId, row);
      }

      row.outstandingBalance += balance;
      row.invoices.push(invoice);

      const days = daysPastDue(invoice.due_date);
      if (days > 0) {
        row.overdueInvoiceCount += 1;
        row.pastDueDays.push(days);
      }

      if (
        !row.oldestInvoice ||
        invoice.due_date < row.oldestInvoice.due_date
      ) {
        row.oldestInvoice = invoice;
      }
    }

    const riskRank = (level: CollectionRiskLevel) =>
      level === "high" ? 3 : level === "medium" ? 2 : 1;

    return Array.from(byCustomer.values())
      .map((row) => {
        const risk = riskByCustomer.get(row.customerId) ?? "low";
        return {
          customerId: row.customerId,
          customerName: row.customerName,
          outstandingBalance:
            Math.round(row.outstandingBalance * 100) / 100,
          overdueInvoiceCount: row.overdueInvoiceCount,
          oldestInvoice: row.oldestInvoice,
          averageDaysPastDue:
            row.pastDueDays.length > 0
              ? Math.round(
                  row.pastDueDays.reduce((sum, days) => sum + days, 0) /
                    row.pastDueDays.length
                )
              : null,
          risk,
          invoices: [...row.invoices].sort((a, b) =>
            a.due_date.localeCompare(b.due_date)
          ),
        };
      })
      .sort((a, b) => {
        const rankDiff = riskRank(b.risk) - riskRank(a.risk);
        if (rankDiff !== 0) return rankDiff;
        return b.outstandingBalance - a.outstandingBalance;
      });
  }, [allInvoices, riskByCustomer]);

  function toggleCustomer(customerId: string) {
    setExpandedCustomers((current) => {
      const next = new Set(current);
      if (next.has(customerId)) next.delete(customerId);
      else next.add(customerId);
      return next;
    });
  }

  const summary = useMemo(() => {
    let totalOutstanding = 0;
    let totalOverdue = 0;
    const pastDueDays: number[] = [];
    let largest: AgingInvoice | null = null;
    let largestBalance = 0;

    for (const invoice of allInvoices) {
      const balance = invoiceBalance(invoice);
      if (balance <= 0) continue;
      totalOutstanding += balance;

      const days = daysPastDue(invoice.due_date);
      if (days > 0) {
        totalOverdue += balance;
        pastDueDays.push(days);
      }

      if (balance > largestBalance) {
        largestBalance = balance;
        largest = invoice;
      }
    }

    return {
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      totalOverdue: Math.round(totalOverdue * 100) / 100,
      highRiskCustomerCount: highRiskCustomerIds.size,
      averageDaysPastDue:
        pastDueDays.length > 0
          ? Math.round(
              pastDueDays.reduce((sum, days) => sum + days, 0) /
                pastDueDays.length
            )
          : null,
      largestInvoice: largest,
      largestBalance,
    };
  }, [allInvoices, highRiskCustomerIds]);

  return (
    <div className="space-y-6">
      <ServiceHoldAuditSync holds={serviceHolds} />
      {serviceHolds.length > 0 ? (
        <ServiceHoldBanner
          reason={`${serviceHolds.length} customer${serviceHolds.length === 1 ? "" : "s"} currently on automatic Service Hold for invoices 30+ days overdue. Future visits are On Hold and new crew assignments are blocked until payment clears the past-due balance.`}
        />
      ) : null}

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-green-950">
            AR Management Dashboard
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <DashboardStatCard
            label="Total Outstanding AR"
            value={formatCurrency(summary.totalOutstanding)}
            hint="All open invoice balances"
          />
          <DashboardStatCard
            label="Total Overdue Balance"
            value={formatCurrency(summary.totalOverdue)}
            hint="Past-due receivables only"
          />
          <DashboardStatCard
            label="High-Risk Customers"
            value={summary.highRiskCustomerCount}
            hint="Based on collection risk signals"
          />
          <DashboardStatCard
            label="Average Days Past Due"
            value={
              summary.averageDaysPastDue === null
                ? "—"
                : `${summary.averageDaysPastDue} days`
            }
            hint="Across overdue invoices"
          />
          <DashboardStatCard
            label="Largest Outstanding Invoice"
            value={
              summary.largestInvoice
                ? formatCurrency(summary.largestBalance)
                : "—"
            }
            hint={
              summary.largestInvoice
                ? `${summary.largestInvoice.invoice_number} · ${summary.largestInvoice.customers?.name ?? "Customer"}`
                : "No open balances"
            }
          />
        </div>
      </section>

      <CustomerCollectionCenter
        rows={customerCollectionRows}
        expandedCustomers={expandedCustomers}
        onToggle={toggleCustomer}
        heldCustomerIds={heldIds}
        highlightCustomerId={highlightCustomerId}
        alertFilter={alertFilter}
        approachingCustomerIds={approachingCustomerIds}
      />

      <CollectionActionCenter
        rows={
          alertFilter === "hold"
            ? customerCollectionRows.filter((row) =>
                heldIds.has(row.customerId)
              )
            : alertFilter === "approaching"
              ? customerCollectionRows.filter((row) =>
                  approachingCustomerIds.has(row.customerId)
                )
              : customerCollectionRows
        }
      />

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-green-950">
              AR Aging Report
            </h2>
            <p className="text-sm text-stone-500">
              Outstanding receivables grouped by how long they&apos;ve been past
              due. Choose a bucket to review its invoices.
            </p>
          </div>
          <label className="block text-xs font-medium text-stone-500">
            Aging bucket
            <select
              value={selectedBucket}
              onChange={(e) =>
                setSelectedBucket(e.target.value as AgingBucketKey)
              }
              className="mt-1 block min-w-[14rem] rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800"
            >
              {BUCKET_ORDER.map((key) => (
                <option key={key} value={key}>
                  {BUCKET_TITLES[key]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <AgingSection
          title={BUCKET_TITLES[selectedBucket]}
          invoices={buckets[selectedBucket] ?? []}
        />
      </section>
    </div>
  );
}

type CustomerCollectionRow = {
  customerId: string;
  customerName: string;
  outstandingBalance: number;
  overdueInvoiceCount: number;
  oldestInvoice: AgingInvoice | null;
  averageDaysPastDue: number | null;
  risk: CollectionRiskLevel;
  invoices: AgingInvoice[];
};

function worstAgingBucket(invoices: AgingInvoice[]): AgingBucketKey {
  let worst: AgingBucketKey = "current";
  let worstPriority = COLLECTION_ACTIONS.current.priority;

  for (const invoice of invoices) {
    if (invoiceBalance(invoice) <= 0) continue;
    const bucket = agingBucketForDays(daysPastDue(invoice.due_date));
    const priority = COLLECTION_ACTIONS[bucket].priority;
    if (priority > worstPriority) {
      worst = bucket;
      worstPriority = priority;
    }
  }

  return worst;
}

function CollectionActionCenter({ rows }: { rows: CustomerCollectionRow[] }) {
  const actionRows = useMemo(() => {
    return [...rows]
      .map((row) => {
        const bucket = worstAgingBucket(row.invoices);
        const action = COLLECTION_ACTIONS[bucket];
        return {
          ...row,
          bucket,
          action,
        };
      })
      .sort((a, b) => {
        const priorityDiff = b.action.priority - a.action.priority;
        if (priorityDiff !== 0) return priorityDiff;
        return b.outstandingBalance - a.outstandingBalance;
      });
  }, [rows]);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-green-950">
          Collection Action Center
        </h2>
      </div>

      {actionRows.length === 0 ? (
        <Card>
          <p className="text-sm text-stone-500">
            No collection actions needed right now.
          </p>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[1.3fr_0.8fr_0.9fr_1.1fr_2fr] gap-3 border-b border-stone-200 bg-stone-50 px-4 py-3 text-xs font-medium text-stone-500 lg:grid">
            <span>Customer</span>
            <span>Outstanding</span>
            <span>Priority Bucket</span>
            <span>Overdue Invoices</span>
            <span>Recommended Action</span>
          </div>
          <ul className="divide-y divide-stone-100">
            {actionRows.map((row) => (
              <li
                key={row.customerId}
                className="grid grid-cols-1 gap-3 px-4 py-4 lg:grid-cols-[1.3fr_0.8fr_0.9fr_1.1fr_2fr] lg:items-center lg:gap-3"
              >
                <div>
                  <p className="font-medium text-stone-800">{row.customerName}</p>
                  <p className="mt-0.5 text-xs text-stone-400">
                    {row.invoices.length} outstanding{" "}
                    {row.invoices.length === 1 ? "invoice" : "invoices"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 lg:hidden">Outstanding</p>
                  <p className="font-semibold text-green-900">
                    {formatCurrency(row.outstandingBalance)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 lg:hidden">
                    Priority Bucket
                  </p>
                  <p className="text-sm text-stone-700">
                    {BUCKET_TITLES[row.bucket]}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 lg:hidden">
                    Overdue Invoices
                  </p>
                  <p className="text-sm text-stone-700">
                    {row.overdueInvoiceCount}
                  </p>
                </div>
                <div>
                  <ActionBadge
                    label={row.action.label}
                    badgeClass={row.action.badgeClass}
                    icon={row.action.icon}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function ActionBadge({
  label,
  badgeClass,
  icon,
}: {
  label: string;
  badgeClass: string;
  icon: "check" | "mail" | "phone" | "alert" | "escalate";
}) {
  return (
    <span
      className={`inline-flex max-w-full items-start gap-2 rounded-full border px-3 py-1.5 text-xs font-medium leading-snug ${badgeClass}`}
    >
      <ActionIcon type={icon} />
      <span>{label}</span>
    </span>
  );
}

function ActionIcon({
  type,
}: {
  type: "check" | "mail" | "phone" | "alert" | "escalate";
}) {
  const common = "mt-0.5 h-3.5 w-3.5 shrink-0";

  if (type === "check") {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" className={common} aria-hidden>
        <path
          fillRule="evenodd"
          d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.25 7.3a1 1 0 0 1-1.432.012l-3.25-3.2a1 1 0 1 1 1.4-1.426l2.53 2.49 6.546-6.59a1 1 0 0 1 1.45 0Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  if (type === "mail") {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" className={common} aria-hidden>
        <path d="M3 4a2 2 0 0 0-2 2v.4l9 5.4 9-5.4V6a2 2 0 0 0-2-2H3Z" />
        <path d="M19 8.2 10.64 13.2a1.2 1.2 0 0 1-1.28 0L1 8.2V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.2Z" />
      </svg>
    );
  }

  if (type === "phone") {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" className={common} aria-hidden>
        <path d="M2.003 5.884a1.5 1.5 0 0 1 .46-1.49l1.8-1.5a1.5 1.5 0 0 1 1.98.1l1.55 1.6a1.5 1.5 0 0 1-.14 2.2l-.78.7a11.05 11.05 0 0 0 4.86 4.86l.7-.78a1.5 1.5 0 0 1 2.2-.14l1.6 1.55a1.5 1.5 0 0 1 .1 1.98l-1.5 1.8a1.5 1.5 0 0 1-1.49.46c-6.3-.9-11.24-5.84-12.14-12.14Z" />
      </svg>
    );
  }

  if (type === "alert") {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" className={common} aria-hidden>
        <path
          fillRule="evenodd"
          d="M8.257 3.1a2 2 0 0 1 3.486 0l6.518 11.2A2 2 0 0 1 16.518 17H3.482a2 2 0 0 1-1.743-2.7L8.257 3.1ZM10 7a1 1 0 0 0-1 1v3.5a1 1 0 1 0 2 0V8a1 1 0 0 0-1-1Zm0 8a1.25 1.25 0 1 0 0-2.5A1.25 1.25 0 0 0 10 15Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={common} aria-hidden>
      <path d="M10 2a1 1 0 0 1 1 1v1.06a6.002 6.002 0 0 1 4.94 4.94H17a1 1 0 1 1 0 2h-1.06a6.002 6.002 0 0 1-4.94 4.94V17a1 1 0 1 1-2 0v-1.06A6.002 6.002 0 0 1 4.06 11H3a1 1 0 1 1 0-2h1.06A6.002 6.002 0 0 1 9 4.06V3a1 1 0 0 1 1-1Zm0 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
    </svg>
  );
}

function CustomerCollectionCenter({
  rows,
  expandedCustomers,
  onToggle,
  heldCustomerIds,
  highlightCustomerId,
  alertFilter,
  approachingCustomerIds,
}: {
  rows: CustomerCollectionRow[];
  expandedCustomers: Set<string>;
  onToggle: (customerId: string) => void;
  heldCustomerIds: Set<string>;
  highlightCustomerId?: string;
  alertFilter?: "hold" | "approaching";
  approachingCustomerIds?: Set<string>;
}) {
  const filteredRows =
    alertFilter === "hold"
      ? rows.filter((row) => heldCustomerIds.has(row.customerId))
      : alertFilter === "approaching"
        ? rows.filter((row) =>
            approachingCustomerIds?.has(row.customerId)
          )
        : rows;

  const orderedRows = highlightCustomerId
    ? [
        ...filteredRows.filter(
          (row) => row.customerId === highlightCustomerId
        ),
        ...filteredRows.filter(
          (row) => row.customerId !== highlightCustomerId
        ),
      ]
    : filteredRows;

  const filterNote =
    alertFilter === "hold"
      ? `Showing ${orderedRows.length} customer${orderedRows.length === 1 ? "" : "s"} currently on Service Hold.`
      : alertFilter === "approaching"
        ? `Showing ${orderedRows.length} customer${orderedRows.length === 1 ? "" : "s"} approaching Service Hold (${APPROACHING_HOLD_MIN_DAYS}–${SERVICE_HOLD_THRESHOLD_DAYS - 1} days overdue).`
        : null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-green-950">
          Customer Collection Center
        </h2>
        {filterNote ? (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {filterNote}{" "}
            <a
              href="/reports/ar-aging"
              className="font-medium text-green-800 underline hover:text-green-950"
            >
              Clear filter
            </a>
          </p>
        ) : null}
      </div>

      {orderedRows.length === 0 ? (
        <Card>
          <p className="text-sm text-stone-500">
            No customers with outstanding balances.
          </p>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[1.4fr_0.9fr_0.8fr_1.3fr_0.9fr_0.9fr_auto] gap-3 border-b border-stone-200 bg-stone-50 px-4 py-3 text-xs font-medium text-stone-500 lg:grid">
            <span>Customer</span>
            <span>Outstanding</span>
            <span>Overdue Invoices</span>
            <span>Oldest Outstanding</span>
            <span>Avg Days Past Due</span>
            <span>Risk</span>
            <span className="text-right">Details</span>
          </div>

          <ul className="divide-y divide-stone-100">
            {orderedRows.map((row) => {
              const expanded = expandedCustomers.has(row.customerId);
              const onHold = heldCustomerIds.has(row.customerId);
              return (
                <li
                  key={row.customerId}
                  id={`ar-customer-${row.customerId}`}
                  className={
                    highlightCustomerId === row.customerId
                      ? "bg-red-50/40"
                      : undefined
                  }
                >
                  <button
                    type="button"
                    onClick={() => onToggle(row.customerId)}
                    aria-expanded={expanded}
                    className="grid w-full grid-cols-1 gap-2 px-4 py-4 text-left transition hover:bg-green-50/50 lg:grid-cols-[1.4fr_0.9fr_0.8fr_1.3fr_0.9fr_0.9fr_auto] lg:items-center lg:gap-3"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-stone-800">
                          {row.customerName}
                        </p>
                        <ServiceHoldBadge onHold={onHold} />
                      </div>
                      <p className="mt-0.5 text-xs text-stone-400 lg:hidden">
                        {row.invoices.length} outstanding{" "}
                        {row.invoices.length === 1 ? "invoice" : "invoices"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-stone-400 lg:hidden">
                        Outstanding
                      </p>
                      <p className="font-semibold text-green-900">
                        {formatCurrency(row.outstandingBalance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-stone-400 lg:hidden">
                        Overdue Invoices
                      </p>
                      <p className="text-sm text-stone-700">
                        {row.overdueInvoiceCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-stone-400 lg:hidden">
                        Oldest Outstanding
                      </p>
                      <p className="text-sm text-stone-700">
                        {row.oldestInvoice
                          ? `${row.oldestInvoice.invoice_number} · due ${formatDate(row.oldestInvoice.due_date)}`
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-stone-400 lg:hidden">
                        Avg Days Past Due
                      </p>
                      <p className="text-sm text-stone-700">
                        {row.averageDaysPastDue === null
                          ? "—"
                          : `${row.averageDaysPastDue} days`}
                      </p>
                    </div>
                    <div>
                      <RiskBadge level={row.risk} />
                    </div>
                    <div className="text-sm font-medium text-green-800 lg:text-right">
                      {expanded ? "Hide invoices" : "View invoices"}
                    </div>
                  </button>

                  {expanded ? (
                    <div className="border-t border-stone-100 bg-stone-50/80 px-4 py-3">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">
                        Outstanding invoices
                      </p>
                      <ul className="space-y-2">
                        {row.invoices.map((invoice) => {
                          const days = daysPastDue(invoice.due_date);
                          return (
                            <li
                              key={invoice.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
                            >
                              <span className="font-medium text-stone-800">
                                {invoice.invoice_number}
                              </span>
                              <span className="text-stone-600">
                                Due {formatDate(invoice.due_date)}
                                {days > 0 ? (
                                  <span className="text-red-700">
                                    {" "}
                                    · {days}d past due
                                  </span>
                                ) : (
                                  <span className="text-stone-400">
                                    {" "}
                                    · current
                                  </span>
                                )}
                              </span>
                              <span className="font-semibold text-green-900">
                                {formatCurrency(invoiceBalance(invoice))}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

function RiskBadge({ level }: { level: CollectionRiskLevel }) {
  const styles: Record<CollectionRiskLevel, string> = {
    low: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-900",
    high: "bg-red-100 text-red-800",
  };
  const labels: Record<CollectionRiskLevel, string> = {
    low: "Low Risk",
    medium: "Medium Risk",
    high: "High Risk",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[level]}`}
    >
      {labels[level]}
    </span>
  );
}

function AgingSection({
  title,
  invoices,
}: {
  title: string;
  invoices: AgingInvoice[];
}) {
  const total = invoices.reduce((sum, inv) => sum + invoiceBalance(inv), 0);

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-green-950">{title}</h2>
        <span className="font-bold text-green-900">{formatCurrency(total)}</span>
      </div>
      {invoices.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">No balances in this bucket.</p>
      ) : (
        <ul className="mt-4 space-y-2 text-sm">
          {invoices.map((invoice) => {
            const days = daysPastDue(invoice.due_date);
            return (
              <li
                key={invoice.id}
                className="flex justify-between gap-3 rounded-lg bg-stone-50 px-3 py-2"
              >
                <span>
                  {invoice.invoice_number} · {invoice.customers?.name}
                </span>
                <span className="text-right">
                  {formatCurrency(invoiceBalance(invoice))}{" "}
                  <span className="text-stone-400">
                    due {formatDate(invoice.due_date)}
                    {days > 0 ? ` · ${days}d past due` : ""}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function DashboardStatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-stone-500">{label}</p>
      <p className="mt-2 gs-metric-value text-3xl text-green-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-stone-400">{hint}</p> : null}
    </div>
  );
}
