import type { ArInvoice } from "./ar-types";

function daysBetween(startIso: string, endIso: string) {
  const a = new Date(startIso + "T00:00:00").getTime();
  const b = new Date(endIso + "T00:00:00").getTime();
  return Math.round((b - a) / 86_400_000);
}

function addMonths(iso: string, delta: number) {
  const d = new Date(iso + "T00:00:00");
  d.setMonth(d.getMonth() + delta);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function cap(n: number, max: number) {
  return Math.min(n, max);
}

export type CustomerRiskTier = "Critical" | "High" | "Watch" | "Low";

export type CustomerRiskRow = {
  customer: string;
  riskScore: number;
  tier: CustomerRiskTier;
  shortPayCount: number;
  shortPayExposure: number;
  latePayCount: number;
  avgDaysLate: number;
  openPastDue: number;
  openPastDueCount: number;
  invoiceCount: number;
};

function tierForScore(score: number): CustomerRiskTier {
  if (score >= 70) return "Critical";
  if (score >= 40) return "High";
  if (score >= 12) return "Watch";
  return "Low";
}

/**
 * Score every customer with invoice activity.
 * Scale ≈0–100 with capped components; late pays use trailing 12 months.
 */
export function scoreAllCustomers(
  invoices: ArInvoice[],
  asOf: string
): CustomerRiskRow[] {
  type Acc = {
    customer: string;
    shortPayCount: number;
    shortPayExposure: number;
    latePayCount: number;
    lateDaysSum: number;
    openPastDue: number;
    openPastDueCount: number;
    disputeCount: number;
    invoiceCount: number;
  };

  const byCustomer = new Map<string, Acc>();
  const lateWindowStart = addMonths(asOf, -12);

  function acc(name: string): Acc {
    let row = byCustomer.get(name);
    if (!row) {
      row = {
        customer: name,
        shortPayCount: 0,
        shortPayExposure: 0,
        latePayCount: 0,
        lateDaysSum: 0,
        openPastDue: 0,
        openPastDueCount: 0,
        disputeCount: 0,
        invoiceCount: 0,
      };
      byCustomer.set(name, row);
    }
    return row;
  }

  for (const inv of invoices) {
    const name = inv.customers?.name ?? inv.customer;
    if (!name) continue;
    const row = acc(name);
    row.invoiceCount += 1;
    const billed = Number(inv.amount_billed);
    const paid = Number(inv.amount_paid);
    const balance = Math.max(0, billed - paid);

    const isShortPay =
      inv.status === "Short-Paid" ||
      (paid > 0.01 && balance > 0.01 && paid < billed - 0.01);

    if (isShortPay) {
      row.shortPayCount += 1;
      row.shortPayExposure += balance > 0.01 ? balance : billed - paid;
    }

    if (inv.status === "Disputed") {
      row.disputeCount += 1;
    }

    if (
      inv.paid_date &&
      inv.paid_date >= lateWindowStart &&
      paid >= billed - 0.01 &&
      inv.paid_date > inv.due_date
    ) {
      const daysLate = daysBetween(inv.due_date, inv.paid_date);
      if (daysLate > 0) {
        row.latePayCount += 1;
        row.lateDaysSum += daysLate;
      }
    }

    if (balance > 0.01 && inv.due_date < asOf) {
      row.openPastDue += balance;
      row.openPastDueCount += 1;
    }
  }

  const rows: CustomerRiskRow[] = [];

  for (const row of byCustomer.values()) {
    if (row.invoiceCount === 0) continue;

    const avgDaysLate =
      row.latePayCount > 0 ? row.lateDaysSum / row.latePayCount : 0;

    const riskScore = Math.round(
      cap(row.shortPayCount * 10, 25) +
        cap(row.shortPayExposure / 800, 15) +
        cap(row.latePayCount * 2, 25) +
        cap(avgDaysLate / 4, 15) +
        cap(row.openPastDue / 2500, 15) +
        cap(row.openPastDueCount * 1.5, 10) +
        cap(row.disputeCount * 5, 10)
    );

    rows.push({
      customer: row.customer,
      riskScore,
      tier: tierForScore(riskScore),
      shortPayCount: row.shortPayCount,
      shortPayExposure: row.shortPayExposure,
      latePayCount: row.latePayCount,
      avgDaysLate: Math.round(avgDaysLate),
      openPastDue: row.openPastDue,
      openPastDueCount: row.openPastDueCount,
      invoiceCount: row.invoiceCount,
    });
  }

  return rows.sort((a, b) => b.riskScore - a.riskScore);
}

export function rankRiskiestCustomers(
  invoices: ArInvoice[],
  asOf: string,
  limit = 5
): CustomerRiskRow[] {
  return scoreAllCustomers(invoices, asOf)
    .filter((r) => r.riskScore >= 12)
    .slice(0, limit);
}

/** Lowest risk scores among customers with invoice history. */
export function rankLeastRiskyCustomers(
  invoices: ArInvoice[],
  asOf: string,
  limit = 5
): CustomerRiskRow[] {
  return [...scoreAllCustomers(invoices, asOf)]
    .sort((a, b) => a.riskScore - b.riskScore || a.customer.localeCompare(b.customer))
    .slice(0, limit);
}
