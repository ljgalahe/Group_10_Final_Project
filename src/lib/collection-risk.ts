import { daysBetween, isOpenInvoiceStatus } from "@/lib/payment-utils";
import type { Payment } from "@/lib/types";

export type CollectionRiskLevel = "high" | "medium" | "low";

export type PaymentBehavior =
  | "excellent"
  | "on_time"
  | "slow"
  | "high_risk";

export type CustomerCollectionRisk = {
  customerId: string;
  customerName: string;
  risk: CollectionRiskLevel;
  outstandingBalance: number;
  overdueInvoiceCount: number;
  /** Average of (payment date − invoice date) for fully paid invoices; null = no payment history. */
  averageDaysToPay: number | null;
  /** True when the customer has at least one fully paid invoice with payment history. */
  hasPaymentHistory: boolean;
  paymentBehavior: PaymentBehavior | null;
  riskScore: number;
};

type RiskInvoice = {
  id: string;
  customer_id: string;
  total: number;
  amount_paid: number;
  status: string;
  due_date: string;
  issue_date?: string | null;
  customers?: { name: string } | null;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function isOverdueInvoice(invoice: RiskInvoice, today: string): boolean {
  if (invoice.status === "canceled" || invoice.status === "voided") {
    return false;
  }
  const balance =
    Math.round((Number(invoice.total) - Number(invoice.amount_paid)) * 100) /
    100;
  if (balance <= 0 && invoice.status === "paid") return false;

  if (invoice.status === "overdue" || invoice.status === "past_due") {
    return true;
  }

  return Boolean(invoice.due_date) && invoice.due_date < today && balance > 0;
}

function riskFromScore(score: number): CollectionRiskLevel {
  if (score >= 6) return "high";
  if (score >= 3) return "medium";
  return "low";
}

function riskRank(level: CollectionRiskLevel): number {
  if (level === "high") return 3;
  if (level === "medium") return 2;
  return 1;
}

function invoiceIsPaid(invoice: RiskInvoice): boolean {
  if (invoice.status === "paid") return true;
  const total = Number(invoice.total);
  const paid = Number(invoice.amount_paid);
  return total > 0 && paid + 0.001 >= total;
}

function paymentCustomerId(payment: Payment): string | undefined {
  return (
    payment.invoices?.customers?.id ??
    payment.invoices?.customer_id ??
    payment.customer_id ??
    undefined
  );
}

function isAppliedPayment(payment: Payment): boolean {
  const status = payment.status ?? "applied";
  if (status === "void") return false;
  if (status === "unapplied") return false;
  const applied = Number(payment.applied_amount ?? payment.amount);
  return applied > 0;
}

/** Net-30 style issue-date fallback when issue_date is missing. */
function resolveIssueDate(invoice: RiskInvoice): string | null {
  if (invoice.issue_date) return invoice.issue_date;
  if (invoice.due_date) {
    const due = new Date(invoice.due_date + "T00:00:00");
    due.setDate(due.getDate() - 30);
    return due.toISOString().slice(0, 10);
  }
  return null;
}

export function paymentBehaviorFromDays(
  averageDaysToPay: number | null
): PaymentBehavior | null {
  if (averageDaysToPay == null) return null;
  if (averageDaysToPay <= 15) return "excellent";
  if (averageDaysToPay <= 30) return "on_time";
  if (averageDaysToPay <= 45) return "slow";
  return "high_risk";
}

/**
 * Average Days to Pay for one customer from that customer's paid invoices only:
 * average of (final payment date − invoice issue date).
 */
export function averageDaysToPayForCustomer(
  invoices: RiskInvoice[],
  payments: Payment[],
  customerId: string
): number | null {
  const customerInvoices = invoices.filter(
    (invoice) =>
      invoice.customer_id === customerId &&
      invoice.status !== "canceled" &&
      invoice.status !== "voided"
  );
  if (customerInvoices.length === 0) return null;

  const lastPaymentByInvoice = new Map<string, string>();
  for (const payment of payments) {
    if (!isAppliedPayment(payment)) continue;
    const invoiceId = payment.invoice_id;
    if (!invoiceId) continue;

    const payCustomerId = paymentCustomerId(payment);
    if (payCustomerId && payCustomerId !== customerId) continue;

    const existing = lastPaymentByInvoice.get(invoiceId);
    if (!existing || payment.payment_date > existing) {
      lastPaymentByInvoice.set(invoiceId, payment.payment_date);
    }
  }

  const days: number[] = [];
  for (const invoice of customerInvoices) {
    if (!invoiceIsPaid(invoice)) continue;
    const issueDate = resolveIssueDate(invoice);
    const paidDate = lastPaymentByInvoice.get(invoice.id);
    if (!issueDate || !paidDate) continue;
    const lag = daysBetween(issueDate, paidDate);
    if (lag >= 0) days.push(lag);
  }

  if (days.length === 0) return null;
  return Math.round(days.reduce((sum, value) => sum + value, 0) / days.length);
}

/** Display helper for Average Days to Pay. */
export function formatAverageDaysToPay(
  averageDaysToPay: number | null
): string {
  if (averageDaysToPay == null) return "No Payment History";
  return `Average Days to Pay: ${averageDaysToPay} Days`;
}

/**
 * Manager-facing collection risk from existing invoice + payment data.
 * Average Days to Pay is computed per customer from that customer's paid invoices.
 * Never uses a company-wide average or a hard-coded constant.
 */
export function buildCollectionRisk(
  invoices: RiskInvoice[],
  payments: Payment[]
): CustomerCollectionRisk[] {
  const today = todayIso();

  type Acc = {
    customerId: string;
    customerName: string;
    outstandingBalance: number;
    overdueInvoiceCount: number;
    hasInvoice: boolean;
    paidInvoiceDays: number[];
  };

  const byCustomer = new Map<string, Acc>();
  const invoiceById = new Map<string, RiskInvoice>();

  function ensure(customerId: string, customerName: string): Acc {
    const existing = byCustomer.get(customerId);
    if (existing) {
      if (customerName && existing.customerName === "Unknown customer") {
        existing.customerName = customerName;
      }
      return existing;
    }
    const created: Acc = {
      customerId,
      customerName: customerName || "Unknown customer",
      outstandingBalance: 0,
      overdueInvoiceCount: 0,
      hasInvoice: false,
      paidInvoiceDays: [],
    };
    byCustomer.set(customerId, created);
    return created;
  }

  for (const invoice of invoices) {
    if (invoice.status === "canceled" || invoice.status === "voided") {
      continue;
    }

    invoiceById.set(invoice.id, invoice);
    const customerName = invoice.customers?.name ?? "Unknown customer";
    const row = ensure(invoice.customer_id, customerName);
    row.hasInvoice = true;

    const total = Number(invoice.total);
    const paid = Number(invoice.amount_paid);
    const balance = Math.round((total - paid) * 100) / 100;

    if (balance > 0 && isOpenInvoiceStatus(invoice.status)) {
      row.outstandingBalance += balance;
    }

    if (isOverdueInvoice(invoice, today)) {
      row.overdueInvoiceCount += 1;
    }
  }

  const paymentsByInvoice = new Map<string, Payment[]>();
  for (const payment of payments) {
    if (!isAppliedPayment(payment)) continue;
    const invoiceId = payment.invoice_id;
    if (!invoiceId) continue;
    const list = paymentsByInvoice.get(invoiceId) ?? [];
    list.push(payment);
    paymentsByInvoice.set(invoiceId, list);

    const customerId = paymentCustomerId(payment);
    if (!customerId) continue;
    ensure(
      customerId,
      payment.invoices?.customers?.name ?? "Unknown customer"
    );
  }

  for (const invoice of invoiceById.values()) {
    if (!invoiceIsPaid(invoice)) continue;
    const invPayments = paymentsByInvoice.get(invoice.id) ?? [];
    if (invPayments.length === 0) continue;

    const resolvedIssue =
      resolveIssueDate(invoice) ??
      invPayments
        .map((payment) => payment.invoices?.issue_date)
        .find((value): value is string => Boolean(value)) ??
      null;
    if (!resolvedIssue) continue;

    const settlementDate = invPayments.reduce(
      (latest, payment) =>
        payment.payment_date > latest ? payment.payment_date : latest,
      invPayments[0].payment_date
    );
    const days = daysBetween(resolvedIssue, settlementDate);
    if (days < 0) continue;

    const row = byCustomer.get(invoice.customer_id);
    if (!row) continue;
    row.paidInvoiceDays.push(days);
  }

  const results: CustomerCollectionRisk[] = [];

  for (const row of byCustomer.values()) {
    if (!row.hasInvoice && row.paidInvoiceDays.length === 0) continue;

    const hasPaymentHistory = row.paidInvoiceDays.length > 0;
    const averageDaysToPay = hasPaymentHistory
      ? Math.round(
          row.paidInvoiceDays.reduce((sum, days) => sum + days, 0) /
            row.paidInvoiceDays.length
        )
      : null;

    const paymentBehavior = hasPaymentHistory
      ? paymentBehaviorFromDays(averageDaysToPay)
      : null;

    let score = 0;
    score += row.overdueInvoiceCount * 3;

    if (row.outstandingBalance >= 5000) score += 3;
    else if (row.outstandingBalance >= 2000) score += 2;
    else if (row.outstandingBalance > 0) score += 1;

    if (averageDaysToPay != null) {
      if (averageDaysToPay >= 46) score += 3;
      else if (averageDaysToPay >= 31) score += 2;
      else if (averageDaysToPay >= 16) score += 1;
    } else if (row.overdueInvoiceCount > 0) {
      score += 2;
    }

    if (row.outstandingBalance <= 0 && row.overdueInvoiceCount === 0) {
      score = Math.min(score, 2);
    }

    const risk = riskFromScore(score);
    results.push({
      customerId: row.customerId,
      customerName: row.customerName,
      risk,
      outstandingBalance: Math.round(row.outstandingBalance * 100) / 100,
      overdueInvoiceCount: row.overdueInvoiceCount,
      averageDaysToPay,
      hasPaymentHistory,
      paymentBehavior,
      riskScore: score,
    });
  }

  return results.sort((a, b) => {
    const rankDiff = riskRank(b.risk) - riskRank(a.risk);
    if (rankDiff !== 0) return rankDiff;
    if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
    if (b.outstandingBalance !== a.outstandingBalance) {
      return b.outstandingBalance - a.outstandingBalance;
    }
    return b.overdueInvoiceCount - a.overdueInvoiceCount;
  });
}
