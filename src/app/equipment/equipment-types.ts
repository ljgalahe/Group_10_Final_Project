export const EQUIPMENT_CATEGORIES = [
  "Mowers",
  "Trucks",
  "Trailers",
  "Tractors",
  "Skid steers",
  "Irrigation tools",
  "Hand/power tools",
  "Other",
] as const;

export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number];

/** Categories that do not take unit-of-production depreciation. */
export const NON_DEPRECIABLE_CATEGORIES: readonly EquipmentCategory[] = [
  "Hand/power tools",
  "Other",
];

export function categoryIsDepreciable(category: EquipmentCategory): boolean {
  return !NON_DEPRECIABLE_CATEGORIES.includes(category);
}

/** Hand/power tools have no useful life, salvage, or estimated life hours. */
export function categoryTracksUsefulLife(category: EquipmentCategory): boolean {
  return category !== "Hand/power tools";
}

export type EquipmentStatus = "active" | "retired";

export type EquipmentContractRevenue = {
  contract_id: string;
  contract_title: string;
  customer_name: string;
  hours: number;
  revenue: number;
};

export type EquipmentRow = {
  id: string;
  name: string;
  category: EquipmentCategory;
  purchase_date: string;
  cost: number;
  salvage_value: number;
  useful_life_years: number;
  useful_life_months: number;
  estimated_total_hours: number;
  status: EquipmentStatus;
  retired_at: string | null;
  notes: string | null;
  hours_used: number;
  revenue_produced: number;
  contracts_worked: EquipmentContractRevenue[];
};

export type EquipmentUsageRow = {
  id: string;
  equipment_id: string;
  equipment_name: string;
  visit_id: string;
  hours: number;
  used_on: string;
  notes: string | null;
  visit_date: string;
  contract_title: string;
  customer_name: string;
};

export type CompletedVisitOption = {
  id: string;
  scheduled_date: string;
  label: string;
};
