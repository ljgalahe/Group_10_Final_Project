"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  buildCompletedQuery,
  type CompletedSortMode,
  type VisitPeriod,
} from "@/lib/visit-period";

export function CompletedSortToggle({
  period,
  sort,
  basePath = "/visits/completed",
}: {
  period: VisitPeriod;
  sort: CompletedSortMode;
  basePath?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setSort(next: CompletedSortMode) {
    startTransition(() => {
      router.push(`${basePath}?${buildCompletedQuery(period, next)}`);
    });
  }

  const options: { value: CompletedSortMode; label: string }[] = [
    { value: "date", label: "Date" },
    { value: "company", label: "Company" },
    { value: "job", label: "Job" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="mr-1 text-sm font-medium text-stone-700">Order by</p>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={pending}
          onClick={() => setSort(option.value)}
          className={`rounded-md px-3 py-2 text-sm font-medium ${
            sort === option.value
              ? "bg-green-800 text-white"
              : "border border-stone-300 text-stone-700 hover:bg-stone-50"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
