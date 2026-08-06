export const EQUIPMENT_CATEGORIES = [
  "Mowers",
  "Trucks",
  "Trucks/Trailers",
  "Trailers",
  "Irrigation tools",
  "Hand/power tools",
  "Other",
] as const;

export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number];

export type EquipmentStatus = "active" | "retired";

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
