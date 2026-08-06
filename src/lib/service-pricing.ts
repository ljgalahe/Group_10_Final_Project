/**
 * Acre-banded commercial landscaping demo pricing catalog.
 * Keys and labels match featured services on the welcome / request-a-quote form
 * ([COMMERCIAL_SERVICES](./commercial-services.ts)) so quotes, surveys, and
 * contracts stay aligned with the public site.
 */

import {
  COMMERCIAL_SERVICES,
  type CommercialServiceValue,
} from "@/lib/commercial-services";

export type ServiceCatalogKey = CommercialServiceValue;

export type AcreBand = "<5" | "5+";

export interface ServiceCatalogItem {
  key: ServiceCatalogKey;
  label: string;
  description: string;
  /** Per-acre monthly midpoints by acre band (demo USD). */
  perAcreMonthly: Record<AcreBand, { low: number; mid: number; high: number }>;
  unitLabel: string;
  image: string | null;
}

export interface QuoteLineItem {
  serviceKey: ServiceCatalogKey | string;
  label: string;
  acres: number;
  unitPrice: number;
  lineTotal: number;
  quantity?: number;
}

/** Pricing midpoints for each featured commercial service. */
const PRICING_BY_KEY: Record<
  Exclude<CommercialServiceValue, "other">,
  Record<AcreBand, { low: number; mid: number; high: number }>
> = {
  lawn_mowing_edging: {
    "<5": { low: 50, mid: 100, high: 150 },
    "5+": { low: 25, mid: 42, high: 60 },
  },
  flower_beds_seasonal: {
    "<5": { low: 60, mid: 110, high: 160 },
    "5+": { low: 40, mid: 70, high: 100 },
  },
  sprinkler_watering: {
    "<5": { low: 40, mid: 75, high: 110 },
    "5+": { low: 25, mid: 45, high: 70 },
  },
  tree_bush_trimming: {
    "<5": { low: 45, mid: 85, high: 130 },
    "5+": { low: 30, mid: 55, high: 85 },
  },
  mulch_landscape_beds: {
    "<5": { low: 40, mid: 75, high: 110 },
    "5+": { low: 28, mid: 50, high: 75 },
  },
  sidewalk_parking_cleanup: {
    "<5": { low: 30, mid: 55, high: 85 },
    "5+": { low: 20, mid: 38, high: 60 },
  },
  leaf_debris_removal: {
    "<5": { low: 35, mid: 65, high: 100 },
    "5+": { low: 22, mid: 40, high: 65 },
  },
  snow_ice_clearing: {
    "<5": { low: 80, mid: 140, high: 200 },
    "5+": { low: 50, mid: 90, high: 130 },
  },
};

const OTHER_PRICING: Record<AcreBand, { low: number; mid: number; high: number }> =
  {
    "<5": { low: 40, mid: 80, high: 120 },
    "5+": { low: 30, mid: 55, high: 90 },
  };

export const SERVICE_CATALOG: ServiceCatalogItem[] = COMMERCIAL_SERVICES.map(
  (service) => ({
    key: service.value,
    label: service.title,
    description: service.blurb,
    perAcreMonthly:
      service.value === "other"
        ? OTHER_PRICING
        : PRICING_BY_KEY[service.value],
    unitLabel:
      service.value === "leaf_debris_removal" ||
      service.value === "snow_ice_clearing"
        ? "per acre / month (seasonal)"
        : "per acre / month",
    image: service.image,
  })
);

/** Map older quote/seed keys onto the featured commercial catalog. */
const LEGACY_KEY_ALIASES: Record<string, ServiceCatalogKey> = {
  mowing: "lawn_mowing_edging",
  edging: "lawn_mowing_edging",
  irrigation: "sprinkler_watering",
  seasonal_color: "flower_beds_seasonal",
  fertilization: "mulch_landscape_beds",
  leaf_cleanup: "leaf_debris_removal",
  snow_removal: "snow_ice_clearing",
  full_service: "lawn_mowing_edging",
  other: "other",
};

export function resolveServiceKey(serviceKey: string): ServiceCatalogKey {
  const raw = serviceKey.trim();
  if (!raw) return "other";
  if (SERVICE_CATALOG.some((item) => item.key === raw)) {
    return raw as ServiceCatalogKey;
  }
  if (LEGACY_KEY_ALIASES[raw]) {
    return LEGACY_KEY_ALIASES[raw];
  }
  const lower = raw.toLowerCase();
  const byLabel = SERVICE_CATALOG.find(
    (item) => item.label.toLowerCase() === lower
  );
  if (byLabel) return byLabel.key;
  return "other";
}

export function getServiceCatalog(): ServiceCatalogItem[] {
  return SERVICE_CATALOG;
}

export function serviceLabel(serviceKey: string): string {
  return getCatalogItem(serviceKey)?.label ?? serviceKey;
}

/** Display name written to contract_services.service_name */
export function contractServiceName(serviceKey: string): string {
  return serviceLabel(resolveServiceKey(serviceKey));
}

export function acreBandFor(acres: number): AcreBand {
  return acres >= 5 ? "5+" : "<5";
}

export function getCatalogItem(
  serviceKey: string
): ServiceCatalogItem | undefined {
  const resolved = resolveServiceKey(serviceKey);
  return SERVICE_CATALOG.find((s) => s.key === resolved);
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
 * Visits-per-week lightly scales labor-heavy lines above 1x/week.
 */
export function estimateMonthlyFee(
  lineItems: Pick<QuoteLineItem, "lineTotal" | "serviceKey">[],
  _acres: number,
  visitsPerWeek = 1
): number {
  const visitFactor = Math.max(0.75, Math.min(2.5, Number(visitsPerWeek) || 1));
  const laborHeavy = new Set([
    "lawn_mowing_edging",
    "sidewalk_parking_cleanup",
    "leaf_debris_removal",
    "mowing",
    "edging",
  ]);
  const total = lineItems.reduce((sum, line) => {
    const key = String(line.serviceKey);
    const factor = laborHeavy.has(key) ? visitFactor : 1;
    return sum + Number(line.lineTotal || 0) * factor;
  }, 0);
  return Math.round(total * 100) / 100;
}

export function catalogSnapshotForAcres(acres: number) {
  return SERVICE_CATALOG.filter((item) => item.key !== "other").map((item) => ({
    key: item.key,
    label: item.label,
    description: item.description,
    unitLabel: item.unitLabel,
    rangeLabel: priceRangeLabel(item.key, acres),
    unitPrice: unitPriceForService(item.key, acres),
  }));
}
