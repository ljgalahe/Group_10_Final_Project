/** Featured commercial services — shared by welcome page + quote form. */
export const COMMERCIAL_SERVICES = [
  {
    value: "lawn_mowing_edging",
    title: "Lawn mowing & edging",
    blurb:
      "Regular lawn cutting, trimming, and tidy edges around buildings and drives.",
    image: "/welcome/service-lawn.png",
  },
  {
    value: "flower_beds_seasonal",
    title: "Flower beds & seasonal plants",
    blurb:
      "Planting and swapping seasonal flowers so entrances stay colorful.",
    image: "/welcome/service-flowers.png",
  },
  {
    value: "sprinkler_watering",
    title: "Sprinkler & watering systems",
    blurb:
      "Install, adjust, and maintain irrigation so plants stay watered correctly.",
    image: "/welcome/service-irrigation.png",
  },
  {
    value: "tree_bush_trimming",
    title: "Tree & bush trimming",
    blurb:
      "Prune trees and shrubs to keep sight lines, signs, and walkways clear.",
    image: "/welcome/service-trimming.png",
  },
  {
    value: "mulch_landscape_beds",
    title: "Mulch & landscape beds",
    blurb: "Refresh mulch, pull weeds, and keep planting beds neat.",
    image: "/welcome/service-mulch.png",
  },
  {
    value: "sidewalk_parking_cleanup",
    title: "Sidewalk & parking lot cleanup",
    blurb:
      "Blow off walkways, plazas, and lot edges so customers can move freely.",
    image: "/welcome/service-cleanup.png",
  },
  {
    value: "leaf_debris_removal",
    title: "Leaf & debris removal",
    blurb:
      "Clear leaves, sticks, and litter from lawns and outdoor gathering areas.",
    image: "/welcome/service-leaves.png",
  },
  {
    value: "snow_ice_clearing",
    title: "Snow & ice clearing",
    blurb:
      "Plow and treat entrances, sidewalks, and priority routes after storms.",
    image: "/welcome/service-snow.png",
  },
  {
    value: "other",
    title: "Other",
    blurb: "Tell us about another commercial grounds service you need.",
    image: null,
  },
] as const;

export type CommercialServiceValue =
  (typeof COMMERCIAL_SERVICES)[number]["value"];

/** Legacy demo inquiry values still allowed in the database. */
export const LEGACY_SERVICE_VALUES = [
  "mowing",
  "irrigation",
  "seasonal_color",
  "snow_removal",
  "other",
] as const;

/** Map featured services onto existing DB-allowed values until migration is applied. */
export const SERVICE_TO_LEGACY: Record<string, string> = {
  lawn_mowing_edging: "lawn_mowing_edging",
  flower_beds_seasonal: "flower_beds_seasonal",
  sprinkler_watering: "sprinkler_watering",
  tree_bush_trimming: "tree_bush_trimming",
  mulch_landscape_beds: "mulch_landscape_beds",
  sidewalk_parking_cleanup: "sidewalk_parking_cleanup",
  leaf_debris_removal: "leaf_debris_removal",
  snow_ice_clearing: "snow_ice_clearing",
  // Legacy demo values → closest featured service
  mowing: "lawn_mowing_edging",
  irrigation: "sprinkler_watering",
  seasonal_color: "flower_beds_seasonal",
  snow_removal: "snow_ice_clearing",
  other: "other",
};

export const ALLOWED_SERVICE_VALUES = new Set<string>([
  ...COMMERCIAL_SERVICES.map((s) => s.value),
  ...LEGACY_SERVICE_VALUES,
]);

export const SERVICE_LABELS: Record<string, string> = {
  ...Object.fromEntries(
    COMMERCIAL_SERVICES.map((s) => [s.value, s.title])
  ),
  mowing: "Lawn mowing & edging",
  irrigation: "Sprinkler & watering systems",
  seasonal_color: "Flower beds & seasonal plants",
  snow_removal: "Snow & ice clearing",
  other: "Other",
};

/** Prefer featured commercial keys; fall back to legacy aliases. */
export function toCanonicalServiceValues(selected: string[]): string[] {
  return [
    ...new Set(selected.map((value) => SERVICE_TO_LEGACY[value] ?? "other")),
  ];
}

/** @deprecated Use toCanonicalServiceValues — kept for older call sites. */
export function toLegacyServiceValues(selected: string[]): string[] {
  return toCanonicalServiceValues(selected);
}
