/** Featured commercial services — shared by welcome page + quote form. */
export const COMMERCIAL_SERVICES = [
  {
    value: "lawn_mowing_edging",
    title: "Lawn mowing & edging",
    blurb:
      "Regular lawn cutting, trimming, and tidy edges around buildings and drives.",
  },
  {
    value: "flower_beds_seasonal",
    title: "Flower beds & seasonal plants",
    blurb:
      "Planting and swapping seasonal flowers so entrances stay colorful.",
  },
  {
    value: "sprinkler_watering",
    title: "Sprinkler & watering systems",
    blurb:
      "Install, adjust, and maintain irrigation so plants stay watered correctly.",
  },
  {
    value: "tree_bush_trimming",
    title: "Tree & bush trimming",
    blurb:
      "Prune trees and shrubs to keep sight lines, signs, and walkways clear.",
  },
  {
    value: "mulch_landscape_beds",
    title: "Mulch & landscape beds",
    blurb: "Refresh mulch, pull weeds, and keep planting beds neat.",
  },
  {
    value: "sidewalk_parking_cleanup",
    title: "Sidewalk & parking lot cleanup",
    blurb:
      "Blow off walkways, plazas, and lot edges so customers can move freely.",
  },
  {
    value: "leaf_debris_removal",
    title: "Leaf & debris removal",
    blurb:
      "Clear leaves, sticks, and litter from lawns and outdoor gathering areas.",
  },
  {
    value: "snow_ice_clearing",
    title: "Snow & ice clearing",
    blurb:
      "Plow and treat entrances, sidewalks, and priority routes after storms.",
  },
  {
    value: "other",
    title: "Other",
    blurb: "Tell us about another commercial grounds service you need.",
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
  lawn_mowing_edging: "mowing",
  flower_beds_seasonal: "seasonal_color",
  sprinkler_watering: "irrigation",
  tree_bush_trimming: "other",
  mulch_landscape_beds: "other",
  sidewalk_parking_cleanup: "other",
  leaf_debris_removal: "other",
  snow_ice_clearing: "snow_removal",
  mowing: "mowing",
  irrigation: "irrigation",
  seasonal_color: "seasonal_color",
  snow_removal: "snow_removal",
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
  mowing: "Mowing & grounds care",
  irrigation: "Irrigation",
  seasonal_color: "Seasonal color",
  snow_removal: "Snow removal",
  other: "Other",
};

export function toLegacyServiceValues(selected: string[]): string[] {
  return [
    ...new Set(selected.map((value) => SERVICE_TO_LEGACY[value] ?? "other")),
  ];
}
