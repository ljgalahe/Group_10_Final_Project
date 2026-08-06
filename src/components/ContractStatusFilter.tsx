"use client";

import { usePathname, useRouter } from "next/navigation";

const OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "approved", label: "Approved" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
] as const;

export type ContractStatusFilterValue = (typeof OPTIONS)[number]["value"];

export function ContractStatusFilter({
  value,
}: {
  value: ContractStatusFilterValue;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="contract-status-filter" className="text-sm text-stone-600">
        Show
      </label>
      <select
        id="contract-status-filter"
        value={value}
        onChange={(e) => {
          const next = e.target.value as ContractStatusFilterValue;
          if (next === "all") {
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
