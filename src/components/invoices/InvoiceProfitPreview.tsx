"use client";

import type { ManagerInvoiceRow } from "@/lib/invoice-controls";
import { formatCurrency } from "@/lib/format";
import { INVOICE_TARGET_MARGIN } from "@/lib/invoice-controls";

export function InvoiceProfitPreview({ row }: { row: ManagerInvoiceRow }) {
  const { profit } = row;
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
        Profit preview
      </p>
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-stone-500">Revenue</dt>
          <dd>{formatCurrency(profit.revenue)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-stone-500">Labor</dt>
          <dd>{formatCurrency(profit.labor)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-stone-500">Materials</dt>
          <dd>{formatCurrency(profit.materials)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-stone-500">Equipment</dt>
          <dd>{formatCurrency(profit.equipment)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-stone-500">Travel / fuel</dt>
          <dd>{formatCurrency(profit.travelFuel)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-stone-500">Other</dt>
          <dd>{formatCurrency(profit.other)}</dd>
        </div>
        <div className="flex justify-between border-t border-stone-100 pt-2 font-semibold text-green-950">
          <dt>Profit</dt>
          <dd>{formatCurrency(profit.profit)}</dd>
        </div>
        <div className="flex justify-between text-sm">
          <dt className="text-stone-500">Margin</dt>
          <dd
            className={
              profit.belowTarget ? "font-semibold text-red-700" : "text-green-800"
            }
          >
            {profit.marginPct}%
            {profit.belowTarget
              ? ` (below ${INVOICE_TARGET_MARGIN}% target)`
              : ""}
          </dd>
        </div>
      </dl>
    </div>
  );
}
