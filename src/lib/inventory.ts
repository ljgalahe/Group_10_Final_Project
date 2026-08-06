/** Stock is low when on-hand quantity is at or below 25% of par level. */
export const LOW_STOCK_THRESHOLD = 0.25;

export type InventoryStockSnapshot = {
  id: string;
  name: string;
  unit: string;
  quantity_on_hand: number;
  par_level: number;
};

export function stockFillRatio(item: {
  quantity_on_hand: number;
  par_level: number;
}): number {
  if (item.par_level <= 0) return 0;
  return Math.max(
    0,
    Math.min(1, item.quantity_on_hand / item.par_level)
  );
}

export function stockFillPercent(item: {
  quantity_on_hand: number;
  par_level: number;
}): number {
  return stockFillRatio(item) * 100;
}

export function isLowStock(item: {
  quantity_on_hand: number;
  par_level: number;
}): boolean {
  return stockFillRatio(item) <= LOW_STOCK_THRESHOLD;
}

export function filterLowStock<T extends InventoryStockSnapshot>(
  items: T[]
): T[] {
  return items.filter(isLowStock);
}
