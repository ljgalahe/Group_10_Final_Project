import {
  getDisplayInvoiceStatus,
  getOutstandingBalance,
} from "@/app/invoices/lib/accounting";
import type { InvoiceListItem } from "@/lib/invoice-list";

/** Build list-item flags using a fixed calendar day (avoids SSR/client Date drift). */
export function buildInvoiceListItem(
  invoice: {
    id: string;
    invoice_number: string;
    issue_date: string;
    due_date: string;
    total: number | string;
    amount_paid: number | string;
    status: string;
    customers?: { name?: string } | null;
    contracts?: { title?: string } | null;
  },
  asOfDate: string
): InvoiceListItem {
  const total = Number(invoice.total);
  const amount_paid = Number(invoice.amount_paid);
  const balance = getOutstandingBalance(total, amount_paid);
  const asOf = new Date(asOfDate + "T12:00:00");
  const displayStatus = getDisplayInvoiceStatus(
    {
      status: invoice.status,
      total,
      amount_paid,
      due_date: invoice.due_date,
    },
    asOf
  );
  const notSent =
    invoice.status === "draft" || invoice.status === "approved";
  const paid = balance <= 0.001;
  const notPaid = balance > 0.001;
  const overdue = displayStatus === "past_due";
  const sent =
    !notSent &&
    (invoice.status === "sent" ||
      displayStatus === "sent" ||
      displayStatus === "partially_paid" ||
      displayStatus === "past_due" ||
      displayStatus === "paid");

  return {
    id: invoice.id,
    invoice_number: invoice.invoice_number,
    customerName:
      (invoice.customers as { name?: string } | null)?.name ?? "Customer",
    contractTitle:
      (invoice.contracts as { title?: string } | null)?.title ?? "Contract",
    issue_date: invoice.issue_date,
    due_date: invoice.due_date,
    total,
    amount_paid,
    status: invoice.status,
    displayStatus,
    balance,
    paid,
    notPaid,
    overdue,
    sent,
    notSent,
  };
}
