import { daysBetween, isOpenInvoiceStatus } from "@/lib/payment-utils";
import type { Payment } from "@/lib/types";

export type CollectionRiskLevel = "high" | "medium" | "low";

export type CustomerCollectionRisk = {
  customerId: string;
  customerName: string;
  risk: CollectionRiskLevel;
  outstandingBalance: number;
  overdueInvoiceCount: number;
  averageDaysToPay: number | null;
  riskScore: number;
};

type RiskInvoice = {
  id: string;
  customer_id: string;
  total: number;
  amount_paid: number;
  status: string;
  due_date: string;
  issue_date?: string;
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
    Math.round((Number(invoice.total) - Number(invoice.amount_paid)) * 100) / 100;
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

/**
 * Simple manager-facing collection risk from existing invoice + payment data.
 * Higher score = higher risk. Sorted high → low.
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
    daysToPay: number[];
  };

  const byCustomer = new Map<string, Acc>();

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
      daysToPay: [],
    };
    byCustomer.set(customerId, created);
    return created;
  }

  for (const invoice of invoices) {
    if (invoice.status === "canceled" || invoice.status === "voided") {
      continue;
    }

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

  for (const payment of payments) {
    const status = payment.status ?? "applied";
    if (status === "void" || status === "unapplied") continue;

    const customerId =
      payment.invoices?.customers?.id ??
      payment.invoices?.customer_id ??
      payment.customer_id;
    if (!customerId) continue;

    const customerName = payment.invoices?.customers?.name ?? "Unknown customer";
    const row = ensure(customerId, customerName);
    const issueDate = payment.invoices?.issue_date;
    if (issueDate) {
      row.daysToPay.push(daysBetween(issueDate, payment.payment_date));
    }
  }

  const results: CustomerCollectionRisk[] = [];

  for (const row of byCustomer.values()) {
    if (!row.hasInvoice && row.daysToPay.length === 0) continue;

    const averageDaysToPay =
      row.daysToPay.length > 0
        ? Math.round(
            row.daysToPay.reduce((sum, days) => sum + days, 0) /
              row.daysToPay.length
          )
        : null;

    let score = 0;
    score += row.overdueInvoiceCount * 3;

    if (row.outstandingBalance >= 5000) score += 3;
    else if (row.outstandingBalance >= 2000) score += 2;
    else if (row.outstandingBalance > 0) score += 1;

    if (averageDaysToPay != null) {
      if (averageDaysToPay >= 60) score += 3;
      else if (averageDaysToPay >= 40) score += 2;
      else if (averageDaysToPay >= 30) score += 1;
    }

    // Paid-up customers with no overdue stay low even with slow historical speed.
    if (row.outstandingBalance <= 0 && row.overdueInvoiceCount === 0) {
      score = Math.min(score, 2);
    }

    const risk = riskFromScore(score);
    results.push({
      customerId: row.customerId,
      customerName: row.customerName,
      risk,
      outstandingBalance:
        Math.round(row.outstandingBalance * 100) / 100,
      overdueInvoiceCount: row.overdueInvoiceCount,
      averageDaysToPay,
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
