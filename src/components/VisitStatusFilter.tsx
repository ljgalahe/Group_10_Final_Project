"use client";

import { usePathname, useRouter } from "next/navigation";

const OPTIONS = [
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "all", label: "All Visits" },
] as const;

export type VisitStatusFilterValue = (typeof OPTIONS)[number]["value"];

export function VisitStatusFilter({
  value,
}: {
  value: VisitStatusFilterValue;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="visit-status-filter" className="text-sm text-stone-600">
        Show
      </label>
      <select
        id="visit-status-filter"
        value={value}
        onChange={(e) => {
          const next = e.target.value as VisitStatusFilterValue;
          if (next === "scheduled") {
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
