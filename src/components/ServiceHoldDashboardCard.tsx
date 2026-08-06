"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  syncServiceHoldAudit,
  type CustomerServiceHold,
} from "@/lib/service-hold";

export function ServiceHoldDashboardCard({
  holds,
  embedded = false,
}: {
  holds: CustomerServiceHold[];
  /** When true, skip outer chrome (parent already provides a section). */
  embedded?: boolean;
}) {
  const [expanded, setExpanded] = useState(embedded);

  useEffect(() => {
    syncServiceHoldAudit(holds);
  }, [holds]);

  const count = holds.length;

  const list =
    count === 0 ? (
      <p className="text-sm text-stone-500">
        No customers currently meet the automatic credit-hold rule.
      </p>
    ) : (
      <ul className="space-y-3">
        {holds.map((hold) => (
          <li
            key={hold.customerId}
            className="rounded-lg border border-stone-200 bg-stone-50/70 px-3 py-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-green-950">
                  {hold.customerName}
                </p>
                <p className="mt-0.5 text-xs text-stone-600">
                  Oldest overdue: {hold.oldestInvoiceNumber} · due{" "}
                  {formatDate(hold.oldestDueDate)} · {hold.daysOverdue} days
                  overdue
                </p>
                <p className="mt-0.5 text-xs text-stone-600">
                  Overdue balance {formatCurrency(hold.overdueBalance)} ·{" "}
                  {hold.futureVisitsOnHold === 1
                    ? "1 future visit On Hold"
                    : `${hold.futureVisitsOnHold} future visits On Hold`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/reports/ar-aging?customer=${hold.customerId}`}
                  className="rounded-md border border-green-800 px-3 py-1.5 text-xs font-medium text-green-900 hover:bg-green-50"
                >
                  Open AR Aging
                </Link>
                <Link
                  href="/payments"
                  className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100"
                >
                  Payments
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    );

  if (embedded) {
    return <div className="space-y-3">{list}</div>;
  }

  return (
    <section className="rounded-xl border border-red-200 bg-white p-4 shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-start gap-3 text-left"
        aria-expanded={expanded}
      >
        <span
          className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white"
          aria-hidden
        >
          !
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold text-green-950">
              Customers on Service Hold
            </h2>
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
              {count} on hold
            </span>
          </div>
          <p className="mt-1 text-sm text-stone-600">
            These customers have invoices that are 30 or more days overdue and
            are temporarily blocked from receiving new service.
          </p>
          <p className="mt-2 text-xs font-medium text-red-800">
            {expanded ? "Hide affected customers" : "View affected customers"}
          </p>
        </div>
      </button>

      {expanded ? (
        <div className="mt-4 border-t border-red-100 pt-4">{list}</div>
      ) : null}
    </section>
  );
}

/** Mount-only helper to sync audit when holds are evaluated on a page. */
export function ServiceHoldAuditSync({
  holds,
}: {
  holds: CustomerServiceHold[];
}) {
  useEffect(() => {
    syncServiceHoldAudit(holds);
  }, [holds]);
  return null;
}
