"use client";

import { usePathname, useRouter } from "next/navigation";

const OPTIONS = [
  { value: "due", label: "Due / Open" },
  { value: "paid", label: "Paid" },
  { value: "all", label: "All Invoices" },
] as const;

export type InvoiceStatusFilterValue = (typeof OPTIONS)[number]["value"];

export function InvoiceStatusFilter({
  value,
}: {
  value: InvoiceStatusFilterValue;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="invoice-status-filter" className="text-sm text-stone-600">
        Show
      </label>
      <select
        id="invoice-status-filter"
        value={value}
        onChange={(e) => {
          const next = e.target.value as InvoiceStatusFilterValue;
          if (next === "due") {
            router.push(pathname);
          } else {
            router.push(`${pathname}?status=${next}`);
          }
        }}
        className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800"
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
