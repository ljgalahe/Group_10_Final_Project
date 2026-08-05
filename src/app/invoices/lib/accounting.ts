import { daysBetween, formatCurrency, formatDate } from "@/lib/format";

export type DisplayInvoiceStatus =
  | "draft"
  | "approved"
  | "sent"
  | "partially_paid"
  | "paid"
  | "past_due"
  | "voided"
  | "disputed";

/** Computes live accounting status (Past Due updates automatically by date). */
export function getDisplayInvoiceStatus(invoice: {
  status: string;
  total: number;
  amount_paid: number;
  due_date: string;
}): DisplayInvoiceStatus {
  const stored = invoice.status;
  if (stored === "voided" || stored === "draft" || stored === "approved") {
    return stored as DisplayInvoiceStatus;
  }

  const balance = getOutstandingBalance(Number(invoice.total), Number(invoice.amount_paid));
  if (balance <= 0) return "paid";

  if (stored === "disputed") return "disputed";

  const daysPastDue = daysBetween(invoice.due_date);
  if (daysPastDue > 0) return "past_due";

  if (Number(invoice.amount_paid) > 0) return "partially_paid";

  if (stored === "partially_paid" || stored === "past_due" || stored === "overdue") {
    return stored === "overdue" ? "past_due" : (stored as DisplayInvoiceStatus);
  }

  return (stored === "paid" ? "sent" : stored) as DisplayInvoiceStatus;
}

export function formatInvoiceStatus(status: DisplayInvoiceStatus | string) {
  const labels: Record<string, string> = {
    draft: "Draft",
    approved: "Approved",
    sent: "Sent",
    partially_paid: "Partially Paid",
    paid: "Paid",
    past_due: "Past Due",
    voided: "Voided",
    disputed: "Disputed",
    overdue: "Past Due",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}

export function getOutstandingBalance(total: number, amountPaid: number) {
  return Math.max(0, total - amountPaid);
}

export function getArAgingBucketLabel(dueDate: string, total: number, amountPaid: number) {
  const balance = getOutstandingBalance(total, amountPaid);
  if (balance <= 0) return "Paid — Not in A/R";

  const daysPastDue = daysBetween(dueDate);
  if (daysPastDue <= 0) return "Current";
  if (daysPastDue <= 30) return "1–30 Days Past Due";
  if (daysPastDue <= 60) return "31–60 Days Past Due";
  if (daysPastDue <= 90) return "61–90 Days Past Due";
  return "90+ Days Past Due";
}

export function getDaysOutstanding(dueDate: string, total: number, amountPaid: number) {
  const balance = getOutstandingBalance(total, amountPaid);
  if (balance <= 0) return 0;
  return Math.max(0, daysBetween(dueDate));
}

export function formatDuplicatePaymentMessage(
  invoiceNumber: string,
  amount: number,
  paymentDate: string
) {
  return `A payment matching Invoice ${invoiceNumber} for ${formatCurrency(amount)} was already recorded on ${formatDate(paymentDate)}.`;
}
