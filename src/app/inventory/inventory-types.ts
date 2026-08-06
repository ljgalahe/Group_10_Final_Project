export const INVENTORY_CATEGORIES = [
  "Mulch & beds",
  "Fertilizer & soil",
  "Fuel & fluids",
  "Irrigation",
  "Sod & turf",
  "General supplies",
] as const;

export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];

export type InventoryRow = {
  id: string;
  name: string;
  sku: string | null;
  category: InventoryCategory;
  unit: string;
  quantity_on_hand: number;
  par_level: number;
  unit_cost: number | null;
  notes: string | null;
  updated_at: string;
};
