import type {
  ApAgingBucketKey,
  ApAgingBuckets,
  ApCategory,
  ApInvoice,
} from "./ap-types";
import { AP_CATEGORIES } from "./ap-types";

function parseIso(iso: string) {
  return new Date(iso + "T00:00:00");
}

export function daysBetween(startIso: string, endIso: string) {
  const start = parseIso(startIso).getTime();
  const end = parseIso(endIso).getTime();
  return Math.floor((end - start) / 86_400_000);
}

export function openApInvoices(invoices: ApInvoice[]) {
  return invoices.filter((inv) => inv.status === "open" && inv.amount > 0);
}

export function totalOpenAp(invoices: ApInvoice[]) {
  return openApInvoices(invoices).reduce((sum, inv) => sum + inv.amount, 0);
}

export function bucketOpenApInvoices(
  invoices: ApInvoice[],
  asOf: string
): ApAgingBuckets {
  const buckets: ApAgingBuckets = {
    current: [],
    "1-30": [],
    "31-60": [],
    "61-90": [],
    "90+": [],
  };

  for (const invoice of openApInvoices(invoices)) {
    const daysOverdue = daysBetween(invoice.dueDate, asOf);
    if (daysOverdue <= 0) buckets.current.push(invoice);
    else if (daysOverdue <= 30) buckets["1-30"].push(invoice);
    else if (daysOverdue <= 60) buckets["31-60"].push(invoice);
    else if (daysOverdue <= 90) buckets["61-90"].push(invoice);
    else buckets["90+"].push(invoice);
  }

  return buckets;
}

export function filterByCategory(
  invoices: ApInvoice[],
  category: ApCategory | "All"
) {
  if (category === "All") return invoices;
  return invoices.filter((inv) => inv.category === category);
}

export function openApByCategory(invoices: ApInvoice[]) {
  const totals = Object.fromEntries(
    AP_CATEGORIES.map((c) => [c, 0])
  ) as Record<ApCategory, number>;

  for (const inv of openApInvoices(invoices)) {
    totals[inv.category] += inv.amount;
  }
  return totals;
}

export function discountSavings(invoice: ApInvoice) {
  if (invoice.discountPercent == null || invoice.discountPercent <= 0) {
    return 0;
  }
  return Math.round(invoice.amount * (invoice.discountPercent / 100) * 100) / 100;
}

/** Open invoices still inside an early-pay window (deadline on or after asOf). */
export function openDiscountWindow(invoices: ApInvoice[], asOf: string) {
  return openApInvoices(invoices)
    .filter(
      (inv) =>
        inv.discountPercent != null &&
        inv.discountPercent > 0 &&
        inv.discountDeadline != null &&
        inv.discountDeadline >= asOf
    )
    .sort((a, b) =>
      (a.discountDeadline ?? "").localeCompare(b.discountDeadline ?? "")
    );
}

export function discountsAvailableThisMonth(
  invoices: ApInvoice[],
  asOf: string
) {
  const asOfDate = parseIso(asOf);
  const year = asOfDate.getFullYear();
  const month = asOfDate.getMonth();

  return openDiscountWindow(invoices, asOf)
    .filter((inv) => {
      const d = parseIso(inv.discountDeadline!);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .reduce((sum, inv) => sum + discountSavings(inv), 0);
}

/** Open invoices due within the next `days` days (inclusive of asOf). */
export function upcomingPayments(
  invoices: ApInvoice[],
  asOf: string,
  days = 14
) {
  const end = new Date(parseIso(asOf));
  end.setDate(end.getDate() + days);
  const endIso = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;

  return openApInvoices(invoices)
    .filter((inv) => inv.dueDate >= asOf && inv.dueDate <= endIso)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function bucketTotal(
  buckets: ApAgingBuckets,
  key: ApAgingBucketKey
) {
  return buckets[key].reduce((sum, inv) => sum + inv.amount, 0);
}
