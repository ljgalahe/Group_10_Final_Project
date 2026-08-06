"use client";

import {
  formatInvoiceStatus,
  getDisplayInvoiceStatus,
  type DisplayInvoiceStatus,
} from "@/app/invoices/lib/accounting";

const colors: Record<string, string> = {
  draft: "border-stone-300 bg-stone-100 text-stone-700",
  approved: "gs-complete-badge",
  sent: "border-sky-200 bg-sky-100 text-sky-900",
  partially_paid: "border-amber-200 bg-amber-100 text-amber-900",
  paid: "gs-complete-badge",
  past_due: "border-red-200 bg-red-100 text-red-800",
  overdue: "border-red-200 bg-red-100 text-red-800",
  voided: "border-stone-300 bg-stone-200 text-stone-500 line-through",
  disputed: "border-orange-200 bg-orange-100 text-orange-900",
};

export function InvoiceStatusBadge({
  invoice,
  asOfDate,
  displayStatus: displayStatusProp,
}: {
  invoice: {
    status: string;
    total: number;
    amount_paid: number;
    due_date: string;
  };
  /** YYYY-MM-DD from the server so SSR and client match. */
  asOfDate?: string;
  displayStatus?: DisplayInvoiceStatus | string;
}) {
  const asOf = asOfDate
    ? new Date(asOfDate + "T12:00:00")
    : new Date();
  const displayStatus =
    displayStatusProp ?? getDisplayInvoiceStatus(invoice, asOf);
  return (
    <span
      className={`inline-flex border rounded-md px-2.5 py-0.5 text-xs font-medium ${colors[displayStatus] ?? "border-stone-300 bg-stone-100 text-stone-800"}`}
    >
      {formatInvoiceStatus(displayStatus)}
    </span>
  );
}
