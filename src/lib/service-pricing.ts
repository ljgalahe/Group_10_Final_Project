/**
 * Acre-banded commercial landscaping demo pricing catalog.
 * Midpoints sit inside market ranges; larger acre bands get volume discounts.
 * Anchors: mowing ~$50–$150/acre (<5) / ~$25–$60 (5+); full-service ~$800–$1,600/acre/mo.
 */

export type ServiceCatalogKey =
  | "mowing"
  | "edging"
  | "irrigation"
  | "seasonal_color"
  | "fertilization"
  | "leaf_cleanup"
  | "snow_removal"
  | "full_service"
  | "other";

export type AcreBand = "<5" | "5+";

export interface ServiceCatalogItem {
  key: ServiceCatalogKey;
  label: string;
  description: string;
  /** Per-acre monthly midpoints by acre band (demo USD). */
  perAcreMonthly: Record<AcreBand, { low: number; mid: number; high: number }>;
  unitLabel: string;
}

export interface QuoteLineItem {
  serviceKey: ServiceCatalogKey | string;
  label: string;
  acres: number;
  unitPrice: number;
  lineTotal: number;
  quantity?: number;
}

export const SERVICE_CATALOG: ServiceCatalogItem[] = [
  {
    key: "mowing",
    label: "Mowing & Grounds Care",
    description: "Weekly mowing, trimming, and grounds tidy-up.",
    perAcreMonthly: {
      "<5": { low: 50, mid: 100, high: 150 },
      "5+": { low: 25, mid: 42, high: 60 },
    },
    unitLabel: "per acre / month",
  },
  {
    key: "edging",
    label: "Edging",
    description: "Bed and walkway edge definition.",
    perAcreMonthly: {
      "<5": { low: 20, mid: 35, high: 50 },
      "5+": { low: 12, mid: 22, high: 35 },
    },
    unitLabel: "per acre / month",
  },
  {
    key: "irrigation",
    label: "Irrigation",
    description: "System checks, adjustments, and seasonal start/stop.",
    perAcreMonthly: {
      "<5": { low: 40, mid: 75, high: 110 },
      "5+": { low: 25, mid: 45, high: 70 },
    },
    unitLabel: "per acre / month",
  },
  {
    key: "seasonal_color",
    label: "Seasonal Color",
    description: "Rotating color beds and seasonal plantings.",
    perAcreMonthly: {
      "<5": { low: 60, mid: 110, high: 160 },
      "5+": { low: 40, mid: 70, high: 100 },
    },
    unitLabel: "per acre / month",
  },
  {
    key: "fertilization",
    label: "Fertilization & Weed Control",
    description: "Scheduled turf nutrition and weed programs.",
    perAcreMonthly: {
      "<5": { low: 45, mid: 85, high: 130 },
      "5+": { low: 30, mid: 55, high: 85 },
    },
    unitLabel: "per acre / month",
  },
  {
    key: "leaf_cleanup",
    label: "Leaf Cleanup",
    description: "Seasonal leaf removal (averaged monthly).",
    perAcreMonthly: {
      "<5": { low: 35, mid: 65, high: 100 },
      "5+": { low: 22, mid: 40, high: 65 },
    },
    unitLabel: "per acre / month (seasonal)",
  },
  {
    key: "snow_removal",
    label: "Snow Removal",
    description: "Seasonal snow and ice response (averaged monthly).",
    perAcreMonthly: {
      "<5": { low: 80, mid: 140, high: 200 },
      "5+": { low: 50, mid: 90, high: 130 },
    },
    unitLabel: "per acre / month (seasonal)",
  },
  {
    key: "full_service",
    label: "Full-Service Bundle",
    description: "Multi-line package reference (~$800–$1,600/acre/month).",
    perAcreMonthly: {
      "<5": { low: 800, mid: 1200, high: 1600 },
      "5+": { low: 650, mid: 950, high: 1300 },
    },
    unitLabel: "per acre / month",
  },
  {
    key: "other",
    label: "Other Services",
    description: "Custom scope priced from survey notes.",
    perAcreMonthly: {
      "<5": { low: 40, mid: 80, high: 120 },
      "5+": { low: 30, mid: 55, high: 90 },
    },
    unitLabel: "per acre / month",
  },
];

export function getServiceCatalog(): ServiceCatalogItem[] {
  return SERVICE_CATALOG;
}

export function serviceLabel(serviceKey: string): string {
  return getCatalogItem(serviceKey)?.label ?? serviceKey;
}

export function acreBandFor(acres: number): AcreBand {
  return acres >= 5 ? "5+" : "<5";
}

export function getCatalogItem(
  serviceKey: string
): ServiceCatalogItem | undefined {
  return SERVICE_CATALOG.find((s) => s.key === serviceKey);
}

/** Midpoint unit price for a service at the given acreage. */
export function unitPriceForService(
  serviceKey: string,
  acres: number
): number {
  const item = getCatalogItem(serviceKey) ?? getCatalogItem("other")!;
  const band = acreBandFor(Math.max(acres, 0.1));
  return item.perAcreMonthly[band].mid;
}

export function priceRangeLabel(serviceKey: string, acres: number): string {
  const item = getCatalogItem(serviceKey) ?? getCatalogItem("other")!;
  const band = acreBandFor(Math.max(acres, 0.1));
  const { low, high } = item.perAcreMonthly[band];
  return `$${low}–$${high} ${item.unitLabel}`;
}

export function buildLineItem(
  serviceKey: string,
  acres: number,
  labelOverride?: string
): QuoteLineItem {
  const item = getCatalogItem(serviceKey) ?? getCatalogItem("other")!;
  const safeAcres = Math.max(Number(acres) || 0.1, 0.1);
  const unitPrice = unitPriceForService(serviceKey, safeAcres);
  const lineTotal = Math.round(unitPrice * safeAcres * 100) / 100;
  return {
    serviceKey: item.key,
    label: labelOverride ?? item.label,
    acres: safeAcres,
    unitPrice,
    lineTotal,
    quantity: 1,
  };
}

/**
 * Estimate monthly fee from line items.
 * Visits-per-week lightly scales labor-heavy lines (mowing/edging) above 1x/week.
 */
export function estimateMonthlyFee(
  lineItems: Pick<QuoteLineItem, "lineTotal" | "serviceKey">[],
  _acres: number,
  visitsPerWeek = 1
): number {
  const visitFactor = Math.max(0.75, Math.min(2.5, Number(visitsPerWeek) || 1));
  const total = lineItems.reduce((sum, line) => {
    const key = String(line.serviceKey);
    const laborHeavy = key === "mowing" || key === "edging";
    const factor = laborHeavy ? visitFactor : 1;
    return sum + Number(line.lineTotal || 0) * factor;
  }, 0);
  return Math.round(total * 100) / 100;
}

export function catalogSnapshotForAcres(acres: number) {
  return SERVICE_CATALOG.map((item) => ({
    key: item.key,
    label: item.label,
    description: item.description,
    unitLabel: item.unitLabel,
    rangeLabel: priceRangeLabel(item.key, acres),
    unitPrice: unitPriceForService(item.key, acres),
  }));
}
