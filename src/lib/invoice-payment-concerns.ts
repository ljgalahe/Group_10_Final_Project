import type { InvoiceListItem } from "@/lib/invoice-list";

export type PaymentConcernFlag =
  | "frequently_overdue"
  | "late_payment"
  | "consider_hold";

export type CompanyPaymentConcern = {
  companyName: string;
  invoiceCount: number;
  overdueCount: number;
  overdueBalance: number;
  openBalance: number;
  maxDaysOverdue: number;
  flags: PaymentConcernFlag[];
  reasons: string[];
};

/** Past-due age that triggers “hold jobs” on the invoices page. */
const SIGNIFICANT_DAYS = 30;
const FREQUENT_OVERDUE_MIN = 2;

function daysPastDue(dueDate: string, asOfDate: string): number {
  const due = new Date(dueDate + "T00:00:00").getTime();
  const asOf = new Date(asOfDate + "T00:00:00").getTime();
  return Math.floor((asOf - due) / 86_400_000);
}

export function paymentConcernFlagLabel(flag: PaymentConcernFlag): string {
  if (flag === "frequently_overdue") return "Often late";
  if (flag === "late_payment") return "Past due";
  return "Hold jobs?";
}

/**
 * Flag companies with repeated overdue invoices, late balances,
 * or aging severe enough to consider pausing field work.
 */
export function buildCompanyPaymentConcerns(
  invoices: InvoiceListItem[],
  asOfDate: string
): CompanyPaymentConcern[] {
  type Acc = {
    companyName: string;
    invoiceCount: number;
    overdueCount: number;
    overdueBalance: number;
    openBalance: number;
    maxDaysOverdue: number;
  };

  const byCompany = new Map<string, Acc>();

  for (const invoice of invoices) {
    const name = invoice.customerName || "Customer";
    let row = byCompany.get(name);
    if (!row) {
      row = {
        companyName: name,
        invoiceCount: 0,
        overdueCount: 0,
        overdueBalance: 0,
        openBalance: 0,
        maxDaysOverdue: 0,
      };
      byCompany.set(name, row);
    }

    row.invoiceCount += 1;
    if (invoice.balance > 0.001) {
      row.openBalance += invoice.balance;
    }

    if (invoice.overdue && invoice.balance > 0.001) {
      row.overdueCount += 1;
      row.overdueBalance += invoice.balance;
      const days = daysPastDue(invoice.due_date, asOfDate);
      if (days > row.maxDaysOverdue) row.maxDaysOverdue = days;
    }
  }

  const results: CompanyPaymentConcern[] = [];

  for (const row of byCompany.values()) {
    if (row.overdueCount === 0) continue;

    const flags: PaymentConcernFlag[] = [];
    const reasons: string[] = [];

    const overdueShare =
      row.invoiceCount > 0 ? row.overdueCount / row.invoiceCount : 0;

    if (
      row.overdueCount >= FREQUENT_OVERDUE_MIN ||
      (row.invoiceCount >= 2 && overdueShare >= 0.5)
    ) {
      flags.push("frequently_overdue");
    }

    if (row.overdueCount >= 1 && row.maxDaysOverdue > 0) {
      flags.push("late_payment");
    }

    if (row.maxDaysOverdue >= SIGNIFICANT_DAYS) {
      flags.push("consider_hold");
      reasons.push(
        `Pause upcoming visits — ${SIGNIFICANT_DAYS}+ days past due.`
      );
    }

    if (flags.length === 0) continue;

    results.push({
      companyName: row.companyName,
      invoiceCount: row.invoiceCount,
      overdueCount: row.overdueCount,
      overdueBalance: Math.round(row.overdueBalance * 100) / 100,
      openBalance: Math.round(row.openBalance * 100) / 100,
      maxDaysOverdue: row.maxDaysOverdue,
      flags,
      reasons,
    });
  }

  return results.sort((a, b) => {
    const holdA = a.flags.includes("consider_hold") ? 1 : 0;
    const holdB = b.flags.includes("consider_hold") ? 1 : 0;
    if (holdB !== holdA) return holdB - holdA;
    if (b.maxDaysOverdue !== a.maxDaysOverdue) {
      return b.maxDaysOverdue - a.maxDaysOverdue;
    }
    return b.overdueBalance - a.overdueBalance;
  });
}
