import { normalizeServiceName } from "@/components/crew-lead/buildCrewSchedule";

/** Professional title case for crew-lead list labels. */
export function toTitleCase(value: string): string {
  const small = new Set(["a", "an", "and", "as", "at", "for", "from", "in", "of", "on", "or", "the", "to"]);
  return value
    .trim()
    .split(/(\s+|\/|-)/)
    .map((part, index, parts) => {
      if (/^\s+$/.test(part) || part === "/" || part === "-") return part;
      const lower = part.toLowerCase();
      if (index !== 0 && index !== parts.length - 1 && small.has(lower)) {
        return lower;
      }
      if (/^[A-Z]{2,}$/.test(part)) return part; // keep PPE, PVC, etc.
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
}

const SERVICE_MATERIALS: Record<string, string[]> = {
  Mowing: ["Fuel Mix", "Trash Bags"],
  Edging: ["Edger Line / Blades"],
  Trimming: ["Hedge Clippings Bags"],
  "Spring Cleanup": ["Leaf Bags", "Mulch", "Dirt"],
  Fertilization: ["Fertilizer", "Soil Amendment"],
  "Bed Weeding": ["Pre-Emergent", "Mulch", "Flowers (Seasonal)"],
  "Detention Pond Maintenance": ["Pond Treatment", "Riprap Stone"],
  "Irrigation Inspection": ["Replacement Emitters", "PVC Fittings"],
  "Island Mowing": ["Fuel Mix", "Sod Patches"],
  "Seasonal Watering": ["Hose Fittings"],
  "Controller Adjustments": ["Controller Batteries"],
};

const SERVICE_EQUIPMENT: Record<string, string[]> = {
  Mowing: ["Commercial Mower", "Trailer"],
  Edging: ["Stick Edger", "Blower"],
  Trimming: ["Hedge Trimmer", "Blower"],
  "Spring Cleanup": ["Blower", "Rakes", "Wheelbarrow"],
  Fertilization: ["Spreader", "PPE"],
  "Bed Weeding": ["Hand Tools", "Kneeling Pads"],
  "Detention Pond Maintenance": ["Utility Vehicle", "Pump"],
  "Irrigation Inspection": ["Pressure Gauge", "Valve Keys"],
  "Island Mowing": ["Zero-Turn Mower", "Weed Eater"],
  "Seasonal Watering": ["Water Tank / Hose Reel"],
  "Controller Adjustments": ["Multimeter", "Laptop / Programmer"],
};

const SERVICE_TASKS: Record<string, string[]> = {
  Mowing: ["Mow All Turf Zones", "Bag Clippings from Hardscape"],
  Edging: ["Edge Sidewalks and Beds", "Clean Curb Lines"],
  Trimming: ["Trim Hedges to Spec", "Shape Entrance Plantings"],
  "Spring Cleanup": ["Clear Winter Debris", "Refresh Bed Lines"],
  Fertilization: ["Apply Fertilizer per Label", "Water-In If Required"],
  "Bed Weeding": ["Pull / Treat Weeds", "Top-Dress Beds"],
  "Detention Pond Maintenance": ["Clear Outlet", "Inspect Embankment"],
  "Irrigation Inspection": ["Run Zones", "Flag Broken Heads"],
  "Island Mowing": ["Mow Islands", "Detail Around Trees"],
  "Seasonal Watering": ["Water Stressed Areas", "Check for Runoff"],
  "Controller Adjustments": ["Verify Schedules", "Update Seasonal Runtime"],
};

const DEFAULT_MATERIALS = ["Dirt", "Sod", "Flowers", "Mulch"];
const DEFAULT_EQUIPMENT = ["Mower", "Trailer", "Hand Tools"];
const DEFAULT_TASKS = [
  "Arrive On Site and Check In",
  "Complete Contracted Services",
  "Photo Documentation",
  "Site Cleanup Before Departure",
];

function uniqueTitleCased(values: string[]): string[] {
  const map = new Map<string, string>();
  for (const value of values) {
    const titled = toTitleCase(value);
    map.set(titled.toLowerCase(), titled);
  }
  return Array.from(map.values());
}

export function materialsForServices(services: string[]): string[] {
  const items: string[] = [];
  for (const service of services) {
    const key = normalizeServiceName(service);
    items.push(...(SERVICE_MATERIALS[key] ?? []));
  }
  if (items.length === 0) items.push(...DEFAULT_MATERIALS);
  return uniqueTitleCased(items);
}

export function equipmentForServices(services: string[]): string[] {
  const items: string[] = [];
  for (const service of services) {
    const key = normalizeServiceName(service);
    items.push(...(SERVICE_EQUIPMENT[key] ?? []));
  }
  if (items.length === 0) items.push(...DEFAULT_EQUIPMENT);
  return uniqueTitleCased(items);
}

export function tasksForServices(services: string[]): { id: string; label: string }[] {
  const labels: string[] = [...DEFAULT_TASKS];
  for (const service of services) {
    const key = normalizeServiceName(service);
    labels.push(...(SERVICE_TASKS[key] ?? [`Complete ${key}`]));
  }
  return uniqueTitleCased(labels).map((label, index) => ({
    id: `task-${index}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    label,
  }));
}

export function formatStatusLabel(status: string): string {
  return toTitleCase(status.replace(/_/g, " "));
}
