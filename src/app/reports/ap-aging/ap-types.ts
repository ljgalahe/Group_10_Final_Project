/** Shared Accounts Payable types for the accountant AP report. */

export const AP_CATEGORIES = [
  "Materials",
  "Equipment Financing",
  "Fuel",
  "Insurance",
  "Subscriptions",
] as const;

export type ApCategory = (typeof AP_CATEGORIES)[number];

export type ApInvoiceStatus = "open" | "paid";

export type ApInvoice = {
  id: string;
  vendorName: string;
  category: ApCategory;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  status: ApInvoiceStatus;
  /** Early-pay discount percent (e.g. 2 = 2%). */
  discountPercent: number | null;
  /** Last day the early-pay discount is available (ISO date). */
  discountDeadline: string | null;
};

export type ApAgingBucketKey =
  | "current"
  | "1-30"
  | "31-60"
  | "61-90"
  | "90+";

export type ApAgingBuckets = Record<ApAgingBucketKey, ApInvoice[]>;
