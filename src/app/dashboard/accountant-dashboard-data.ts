import { createDataClient } from "@/lib/auth-access";
import {
  getDisplayInvoiceStatus,
  getOutstandingBalance,
  type DisplayInvoiceStatus,
} from "@/app/invoices/lib/accounting";
import { loadAccountantArAgingData } from "@/app/reports/ar-aging/load-ar-aging";
import type { AgingBucketKey } from "@/app/reports/ar-aging/ar-types";
import { fetchFinancialStatementInputs } from "@/app/reports/profitability/queries";
import {
  fetchJournalSourceStates,
  fetchPaymentsSummary,
} from "@/lib/queries";
import {
  invoiceJournalReadyReason,
  paymentJournalReadyReason,
} from "@/lib/journal";

export type AccountantInvoiceQueueItem = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  statusLabel: string;
  displayStatus: DisplayInvoiceStatus;
  balance: number;
  dueDate: string;
  href: string;
  urgent: boolean;
};

export type AccountantDashboardData = {
  asOf: string;
  agingBuckets: Record<AgingBucketKey, number>;
  pastDueTotal: number;
  collectedThisMonth: number;
  collectionRate: number | null;
  averageDaysToPay: number | null;
  readyToPostCount: number;
  invoiceQueue: AccountantInvoiceQueueItem[];
  financialStatementInputs: Awaited<
    ReturnType<typeof fetchFinancialStatementInputs>
  >;
};

function bucketTotal(
  buckets: Record<
    AgingBucketKey,
    { amount_billed: number; amount_paid: number }[]
  >,
  key: AgingBucketKey
) {
  return buckets[key].reduce(
    (sum, inv) => sum + Math.max(0, inv.amount_billed - inv.amount_paid),
    0
  );
}

function statusLabel(status: DisplayInvoiceStatus) {
  const labels: Record<DisplayInvoiceStatus, string> = {
    draft: "Draft",
    approved: "Approved — not sent",
    sent: "Sent",
    partially_paid: "Partially paid",
    past_due: "Past due",
    disputed: "Disputed",
    paid: "Paid",
    voided: "Voided",
  };
  return labels[status] ?? status;
}

function queuePriority(status: DisplayInvoiceStatus) {
  switch (status) {
    case "past_due":
      return 0;
    case "disputed":
      return 1;
    case "partially_paid":
      return 2;
    case "approved":
      return 3;
    case "draft":
      return 4;
    case "sent":
      return 5;
    default:
      return 6;
  }
}

export async function fetchAccountantDashboardData(): Promise<AccountantDashboardData> {
  const supabase = await createDataClient();
  const [aging, summary, journalStates, financialStatementInputs] =
    await Promise.all([
      loadAccountantArAgingData(),
      fetchPaymentsSummary(),
      fetchJournalSourceStates(),
      fetchFinancialStatementInputs(),
    ]);

  const { data: invoiceRows } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, status, total, amount_paid, due_date, customers(name)"
    )
    .neq("status", "voided")
    .order("due_date", { ascending: true });

  let readyToPostCount = 0;

  for (const row of invoiceRows ?? []) {
    const reason = invoiceJournalReadyReason(row.status);
    if (!reason && !journalStates.invoice.has(row.id)) readyToPostCount += 1;
  }

  const { data: paymentRows } = await supabase
    .from("payments")
    .select("id, amount, invoice_id");

  for (const row of paymentRows ?? []) {
    const reason = paymentJournalReadyReason({
      amount: Number(row.amount),
      invoiceId: row.invoice_id,
    });
    if (!reason && !journalStates.payment.has(row.id)) readyToPostCount += 1;
  }

  const invoiceQueue: AccountantInvoiceQueueItem[] = [];

  for (const row of invoiceRows ?? []) {
    const total = Number(row.total);
    const amountPaid = Number(row.amount_paid);
    const balance = getOutstandingBalance(total, amountPaid);
    const displayStatus = getDisplayInvoiceStatus({
      status: row.status,
      total,
      amount_paid: amountPaid,
      due_date: row.due_date,
    });

    const needsAttention =
      displayStatus === "past_due" ||
      displayStatus === "disputed" ||
      displayStatus === "partially_paid" ||
      displayStatus === "draft" ||
      displayStatus === "approved" ||
      (displayStatus === "sent" && balance > 0.001);

    if (!needsAttention) continue;

    const customerRaw = row.customers as
      | { name: string }
      | { name: string }[]
      | null;
    const customerName = Array.isArray(customerRaw)
      ? (customerRaw[0]?.name ?? "—")
      : (customerRaw?.name ?? "—");

    invoiceQueue.push({
      id: row.id,
      invoiceNumber: row.invoice_number,
      customerName,
      statusLabel: statusLabel(displayStatus),
      displayStatus,
      balance,
      dueDate: row.due_date,
      href: `/invoices/${row.id}`,
      urgent: displayStatus === "past_due" || displayStatus === "disputed",
    });
  }

  invoiceQueue.sort((a, b) => {
    const priorityDiff =
      queuePriority(a.displayStatus) - queuePriority(b.displayStatus);
    if (priorityDiff !== 0) return priorityDiff;
    return b.balance - a.balance;
  });

  const agingBuckets = {
    current: bucketTotal(aging.buckets, "current"),
    "1-30": bucketTotal(aging.buckets, "1-30"),
    "31-60": bucketTotal(aging.buckets, "31-60"),
    "61-90": bucketTotal(aging.buckets, "61-90"),
    "90+": bucketTotal(aging.buckets, "90+"),
  };

  const pastDueTotal =
    agingBuckets["1-30"] +
    agingBuckets["31-60"] +
    agingBuckets["61-90"] +
    agingBuckets["90+"];

  return {
    asOf: aging.asOf,
    agingBuckets,
    pastDueTotal,
    collectedThisMonth: summary.collectedThisMonth,
    collectionRate: summary.collectionRate,
    averageDaysToPay: summary.averageDaysToPay,
    readyToPostCount,
    invoiceQueue: invoiceQueue.slice(0, 6),
    financialStatementInputs,
  };
}
