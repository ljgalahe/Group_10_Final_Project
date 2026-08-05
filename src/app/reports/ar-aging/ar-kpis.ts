import type { ArInvoice } from "./ar-types";

export type DsoMonthPoint = {
  /** YYYY-MM of the month-end snapshot */
  monthKey: string;
  label: string;
  asOf: string;
  totalAr: number;
  currentAr: number;
  creditSales: number;
  daysInPeriod: number;
  dso: number;
  bestPossibleDso: number;
  daysDelinquent: number;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toIsoDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseIso(iso: string) {
  return new Date(iso + "T00:00:00");
}

/** Last calendar day of the month containing `d`, capped at `cap` when in the same month. */
function monthEnd(d: Date, cap?: string) {
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  if (cap) {
    const capDate = parseIso(cap);
    if (
      capDate.getFullYear() === end.getFullYear() &&
      capDate.getMonth() === end.getMonth() &&
      capDate < end
    ) {
      return toIsoDate(capDate);
    }
  }
  return toIsoDate(end);
}

function monthKeyFromDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

const AXIS_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Consistent chart x-axis format: `Aug '26` */
function formatAxisMonthLabel(d: Date) {
  return `${AXIS_MONTHS[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`;
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Reconstruct open balance as of a historical date from final invoice state.
 * Prefer applied payment events; fall back to paid_date / amount_paid.
 */
export function balanceAsOf(invoice: ArInvoice, asOf: string): number {
  if (invoice.invoice_date > asOf) return 0;

  if (invoice.payments && invoice.payments.length > 0) {
    const paidToDate = invoice.payments
      .filter((p) => p.payment_date <= asOf)
      .reduce((sum, p) => sum + p.amount, 0);
    return Math.max(0, invoice.amount_billed - paidToDate);
  }

  const fullyPaid =
    invoice.amount_paid >= invoice.amount_billed - 0.001 &&
    invoice.paid_date != null;

  if (fullyPaid) {
    if (invoice.paid_date! <= asOf) return 0;
    return invoice.amount_billed;
  }

  // Partial payment recorded: only count it if paid_date is on/before asOf
  if (invoice.paid_date && invoice.paid_date <= asOf && invoice.amount_paid > 0) {
    return Math.max(0, invoice.amount_billed - invoice.amount_paid);
  }

  // Payment in the future (or unpaid): full billed amount still open
  return invoice.amount_billed;
}

function isCurrentAr(invoice: ArInvoice, asOf: string, balance: number): boolean {
  if (balance <= 0) return false;
  return invoice.due_date >= asOf;
}

function creditSalesInWindow(
  invoices: ArInvoice[],
  windowStart: string,
  windowEnd: string
) {
  let sales = 0;
  for (const inv of invoices) {
    if (inv.invoice_date >= windowStart && inv.invoice_date <= windowEnd) {
      sales += inv.amount_billed;
    }
  }
  return sales;
}

function rollingThreeMonthWindow(asOf: string) {
  const end = parseIso(asOf);
  const start = new Date(end.getFullYear(), end.getMonth() - 2, 1);
  const windowStart = toIsoDate(start);

  let days = 0;
  for (let i = 0; i < 3; i++) {
    const m = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const dim = daysInMonth(m.getFullYear(), m.getMonth());
    // Cap the final month at asOf day when not a full month-end
    if (i === 2) {
      const lastDay = Math.min(end.getDate(), dim);
      days += lastDay;
    } else {
      days += dim;
    }
  }

  return { windowStart, windowEnd: asOf, daysInPeriod: days };
}

function arTotalsAt(invoices: ArInvoice[], asOf: string) {
  let totalAr = 0;
  let currentAr = 0;
  for (const inv of invoices) {
    const bal = balanceAsOf(inv, asOf);
    if (bal <= 0) continue;
    totalAr += bal;
    if (isCurrentAr(inv, asOf, bal)) currentAr += bal;
  }
  return { totalAr, currentAr };
}

function monthStart(d: Date) {
  return toIsoDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

function dayBefore(iso: string) {
  const d = parseIso(iso);
  d.setDate(d.getDate() - 1);
  return toIsoDate(d);
}

export type CeiMode = "trailing_3m" | "annualized_mtd";

export type CeiMonthPoint = {
  monthKey: string;
  label: string;
  asOf: string;
  mode: CeiMode;
  beginningAr: number;
  /** Sales used in the CEI formula (may be annualized). */
  creditSales: number;
  /** Raw MTD / window sales before annualization. */
  rawCreditSales: number;
  endingTotalAr: number;
  endingCurrentAr: number;
  cei: number;
  /** For annualized MTD: days elapsed / days in month. */
  annualizeFactor: number;
};

function ceiFromParts(
  beginningAr: number,
  creditSales: number,
  endingTotalAr: number,
  endingCurrentAr: number
) {
  const numerator = beginningAr + creditSales - endingTotalAr;
  const denominator = beginningAr + creditSales - endingCurrentAr;
  return denominator > 0 ? (numerator / denominator) * 100 : 0;
}

/**
 * Trailing 3-month CEI ending on `asOf`:
 * Beg AR = open AR the day before the 3-month window starts.
 * Sales = credit sales over the rolling 3 months.
 */
export function computeCeiTrailing3m(
  invoices: ArInvoice[],
  asOf: string
): CeiMonthPoint {
  const end = parseIso(asOf);
  const { windowStart } = rollingThreeMonthWindow(asOf);
  const beginningAsOf = dayBefore(windowStart);

  const { totalAr: beginningAr } = arTotalsAt(invoices, beginningAsOf);
  const { totalAr: endingTotalAr, currentAr: endingCurrentAr } = arTotalsAt(
    invoices,
    asOf
  );
  const creditSales = creditSalesInWindow(invoices, windowStart, asOf);
  const cei = ceiFromParts(
    beginningAr,
    creditSales,
    endingTotalAr,
    endingCurrentAr
  );

  return {
    monthKey: monthKeyFromDate(end),
    label: formatAxisMonthLabel(end),
    asOf,
    mode: "trailing_3m",
    beginningAr,
    creditSales,
    rawCreditSales: creditSales,
    endingTotalAr,
    endingCurrentAr,
    cei,
    annualizeFactor: 1,
  };
}

/**
 * Month-to-date CEI with sales annualized to a full month:
 * scaledSales = MTD sales × (days in month / days elapsed).
 * At month-end, factor is 1 (same as plain monthly CEI).
 */
export function computeCeiAnnualizedMtd(
  invoices: ArInvoice[],
  asOf: string
): CeiMonthPoint {
  const end = parseIso(asOf);
  const periodStart = monthStart(end);
  const beginningAsOf = dayBefore(periodStart);

  const { totalAr: beginningAr } = arTotalsAt(invoices, beginningAsOf);
  const { totalAr: endingTotalAr, currentAr: endingCurrentAr } = arTotalsAt(
    invoices,
    asOf
  );
  const rawCreditSales = creditSalesInWindow(invoices, periodStart, asOf);

  const dim = daysInMonth(end.getFullYear(), end.getMonth());
  const daysElapsed = Math.max(1, end.getDate());
  const annualizeFactor = dim / daysElapsed;
  const creditSales = rawCreditSales * annualizeFactor;

  const cei = ceiFromParts(
    beginningAr,
    creditSales,
    endingTotalAr,
    endingCurrentAr
  );

  return {
    monthKey: monthKeyFromDate(end),
    label: formatAxisMonthLabel(end),
    asOf,
    mode: "annualized_mtd",
    beginningAr,
    creditSales,
    rawCreditSales,
    endingTotalAr,
    endingCurrentAr,
    cei,
    annualizeFactor,
  };
}

export function computeCeiAt(
  invoices: ArInvoice[],
  asOf: string,
  mode: CeiMode = "trailing_3m"
): CeiMonthPoint {
  return mode === "annualized_mtd"
    ? computeCeiAnnualizedMtd(invoices, asOf)
    : computeCeiTrailing3m(invoices, asOf);
}

export function buildCeiHistory(
  invoices: ArInvoice[],
  asOf: string,
  mode: CeiMode,
  months = 12
): { series: CeiMonthPoint[]; priorYear: CeiMonthPoint | null } {
  const end = parseIso(asOf);
  const series: CeiMonthPoint[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const cursor = new Date(end.getFullYear(), end.getMonth() - i, 1);
    const snap = monthEnd(cursor, asOf);
    series.push(computeCeiAt(invoices, snap, mode));
  }

  const prior = new Date(end.getFullYear() - 1, end.getMonth(), 1);
  const priorAsOf = monthEnd(prior, asOf);
  const oldest = invoices.reduce(
    (min, inv) => (inv.invoice_date < min ? inv.invoice_date : min),
    asOf
  );
  const priorYear =
    priorAsOf >= oldest ? computeCeiAt(invoices, priorAsOf, mode) : null;

  return { series, priorYear };
}

export type CeiKpiSummary = {
  mode: CeiMode;
  current: CeiMonthPoint;
  priorYear: CeiMonthPoint | null;
  yoyCei: number | null;
};

export function summarizeCeiKpi(
  invoices: ArInvoice[],
  asOf: string,
  mode: CeiMode = "trailing_3m"
): CeiKpiSummary {
  const { series, priorYear } = buildCeiHistory(invoices, asOf, mode, 12);
  const current = series[series.length - 1]!;
  return {
    mode,
    current,
    priorYear,
    yoyCei: priorYear != null ? current.cei - priorYear.cei : null,
  };
}

export function ceiHealthTone(cei: number): "green" | "amber" | "red" {
  if (cei > 80) return "green";
  if (cei >= 60) return "amber";
  return "red";
}

export function computeDsoAt(invoices: ArInvoice[], asOf: string): DsoMonthPoint {
  const { windowStart, daysInPeriod } = rollingThreeMonthWindow(asOf);
  const { totalAr, currentAr } = arTotalsAt(invoices, asOf);

  const creditSales = creditSalesInWindow(invoices, windowStart, asOf);
  const dso = creditSales > 0 ? (totalAr / creditSales) * daysInPeriod : 0;
  const bestPossibleDso =
    creditSales > 0 ? (currentAr / creditSales) * daysInPeriod : 0;
  const daysDelinquent = Math.max(0, dso - bestPossibleDso);

  const d = parseIso(asOf);
  return {
    monthKey: monthKeyFromDate(d),
    label: formatAxisMonthLabel(d),
    asOf,
    totalAr,
    currentAr,
    creditSales,
    daysInPeriod,
    dso,
    bestPossibleDso,
    daysDelinquent,
  };
}

/**
 * Build month-end DSO points. Includes `months` recent points plus optional
 * prior-year same-month point for YoY comparison.
 */
export function buildDsoHistory(
  invoices: ArInvoice[],
  asOf: string,
  months = 12
): { series: DsoMonthPoint[]; priorYear: DsoMonthPoint | null } {
  const end = parseIso(asOf);
  const series: DsoMonthPoint[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const cursor = new Date(end.getFullYear(), end.getMonth() - i, 1);
    const snap = monthEnd(cursor, asOf);
    series.push(computeDsoAt(invoices, snap));
  }

  const prior = new Date(end.getFullYear() - 1, end.getMonth(), 1);
  const priorAsOf = monthEnd(prior, asOf);
  // Only compute prior year if we have invoices that old
  const oldest = invoices.reduce(
    (min, inv) => (inv.invoice_date < min ? inv.invoice_date : min),
    asOf
  );
  const priorYear =
    priorAsOf >= oldest ? computeDsoAt(invoices, priorAsOf) : null;

  return { series, priorYear };
}

export type DsoKpiSummary = {
  current: DsoMonthPoint;
  priorYear: DsoMonthPoint | null;
  yoyDaysDelinquent: number | null;
  yoyDso: number | null;
};

export function summarizeDsoKpi(
  invoices: ArInvoice[],
  asOf: string
): DsoKpiSummary {
  const { series, priorYear } = buildDsoHistory(invoices, asOf, 12);
  const current = series[series.length - 1]!;
  return {
    current,
    priorYear,
    yoyDaysDelinquent:
      priorYear != null
        ? current.daysDelinquent - priorYear.daysDelinquent
        : null,
    yoyDso: priorYear != null ? current.dso - priorYear.dso : null,
  };
}

function daysPastDue(dueDate: string, asOf: string): number {
  const due = parseIso(dueDate).getTime();
  const end = parseIso(asOf).getTime();
  return Math.floor((end - due) / 86_400_000);
}

export type WaddMonthPoint = {
  monthKey: string;
  label: string;
  asOf: string;
  totalAr: number;
  pastDueAr: number;
  pastDueCount: number;
  /** Σ(days past due × open balance) / past-due AR */
  weightedAvgDaysDelinquent: number;
  /** Simple average days past due across past-due invoices only */
  unweightedAvgDaysPastDue: number;
};

/**
 * Weighted Average Days Delinquent:
 * for each past-due invoice, days past due × open balance, summed, ÷ past-due AR.
 * (Denominator is past-due AR — not total AR — so the figure is comparable to the
 * unweighted average of days past due.)
 */
export function computeWaddAt(
  invoices: ArInvoice[],
  asOf: string
): WaddMonthPoint {
  let totalAr = 0;
  let pastDueAr = 0;
  let weightedSum = 0;
  let unweightedSum = 0;
  let pastDueCount = 0;

  for (const inv of invoices) {
    const bal = balanceAsOf(inv, asOf);
    if (bal <= 0) continue;
    totalAr += bal;

    const dpd = daysPastDue(inv.due_date, asOf);
    if (dpd <= 0) continue;

    pastDueAr += bal;
    weightedSum += dpd * bal;
    unweightedSum += dpd;
    pastDueCount += 1;
  }

  const d = parseIso(asOf);
  return {
    monthKey: monthKeyFromDate(d),
    label: formatAxisMonthLabel(d),
    asOf,
    totalAr,
    pastDueAr,
    pastDueCount,
    weightedAvgDaysDelinquent: pastDueAr > 0 ? weightedSum / pastDueAr : 0,
    unweightedAvgDaysPastDue:
      pastDueCount > 0 ? unweightedSum / pastDueCount : 0,
  };
}

export function buildWaddHistory(
  invoices: ArInvoice[],
  asOf: string,
  months = 12
): { series: WaddMonthPoint[]; priorYear: WaddMonthPoint | null } {
  const end = parseIso(asOf);
  const series: WaddMonthPoint[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const cursor = new Date(end.getFullYear(), end.getMonth() - i, 1);
    const snap = monthEnd(cursor, asOf);
    series.push(computeWaddAt(invoices, snap));
  }

  const prior = new Date(end.getFullYear() - 1, end.getMonth(), 1);
  const priorAsOf = monthEnd(prior, asOf);
  const oldest = invoices.reduce(
    (min, inv) => (inv.invoice_date < min ? inv.invoice_date : min),
    asOf
  );
  const priorYear =
    priorAsOf >= oldest ? computeWaddAt(invoices, priorAsOf) : null;

  return { series, priorYear };
}

export type WaddKpiSummary = {
  current: WaddMonthPoint;
  priorYear: WaddMonthPoint | null;
  yoyWeighted: number | null;
};

export function summarizeWaddKpi(
  invoices: ArInvoice[],
  asOf: string
): WaddKpiSummary {
  const { series, priorYear } = buildWaddHistory(invoices, asOf, 12);
  const current = series[series.length - 1]!;
  return {
    current,
    priorYear,
    yoyWeighted:
      priorYear != null
        ? current.weightedAvgDaysDelinquent -
          priorYear.weightedAvgDaysDelinquent
        : null,
  };
}

export type PctCurrentMonthPoint = {
  monthKey: string;
  label: string;
  asOf: string;
  totalAr: number;
  currentAr: number;
  /** Current AR ÷ total AR × 100 */
  pctCurrent: number;
};

export function computePctCurrentAt(
  invoices: ArInvoice[],
  asOf: string
): PctCurrentMonthPoint {
  const { totalAr, currentAr } = arTotalsAt(invoices, asOf);
  const d = parseIso(asOf);
  return {
    monthKey: monthKeyFromDate(d),
    label: formatAxisMonthLabel(d),
    asOf,
    totalAr,
    currentAr,
    pctCurrent: totalAr > 0 ? (currentAr / totalAr) * 100 : 0,
  };
}

export function buildPctCurrentHistory(
  invoices: ArInvoice[],
  asOf: string,
  months = 12
): { series: PctCurrentMonthPoint[]; priorYear: PctCurrentMonthPoint | null } {
  const end = parseIso(asOf);
  const series: PctCurrentMonthPoint[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const cursor = new Date(end.getFullYear(), end.getMonth() - i, 1);
    const snap = monthEnd(cursor, asOf);
    series.push(computePctCurrentAt(invoices, snap));
  }

  const prior = new Date(end.getFullYear() - 1, end.getMonth(), 1);
  const priorAsOf = monthEnd(prior, asOf);
  const oldest = invoices.reduce(
    (min, inv) => (inv.invoice_date < min ? inv.invoice_date : min),
    asOf
  );
  const priorYear =
    priorAsOf >= oldest ? computePctCurrentAt(invoices, priorAsOf) : null;

  return { series, priorYear };
}

export type PctCurrentKpiSummary = {
  current: PctCurrentMonthPoint;
  priorYear: PctCurrentMonthPoint | null;
  yoyPctCurrent: number | null;
};

export function summarizePctCurrentKpi(
  invoices: ArInvoice[],
  asOf: string
): PctCurrentKpiSummary {
  const { series, priorYear } = buildPctCurrentHistory(invoices, asOf, 12);
  const current = series[series.length - 1]!;
  return {
    current,
    priorYear,
    yoyPctCurrent:
      priorYear != null ? current.pctCurrent - priorYear.pctCurrent : null,
  };
}
