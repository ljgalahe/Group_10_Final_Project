import { totalOpenAp } from "./ap-aging";
import type { ApInvoice } from "./ap-types";

function parseIso(iso: string) {
  return new Date(iso + "T00:00:00");
}

function toIso(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * DPO over a rolling ~90-day window:
 * (open AP / credit purchases in window) × days in period.
 * Credit purchases = sum of mock invoice amounts (open + paid) dated in window.
 */
export function computeDpo(invoices: ApInvoice[], asOf: string) {
  const asOfDate = parseIso(asOf);
  const windowStart = new Date(asOfDate);
  windowStart.setDate(windowStart.getDate() - 89);
  const startIso = toIso(windowStart);
  const daysInPeriod = 90;

  const openAp = totalOpenAp(invoices);
  const creditPurchases = invoices
    .filter(
      (inv) => inv.invoiceDate >= startIso && inv.invoiceDate <= asOf
    )
    .reduce((sum, inv) => sum + inv.amount, 0);

  const dpo =
    creditPurchases > 0 ? (openAp / creditPurchases) * daysInPeriod : 0;

  return {
    openAp,
    creditPurchases,
    daysInPeriod,
    dpo: Math.round(dpo * 10) / 10,
  };
}

/** Cash conversion cycle as DSO − DPO (per product requirement). */
export function computeCashConversionCycle(dso: number, dpo: number) {
  return Math.round((dso - dpo) * 10) / 10;
}
