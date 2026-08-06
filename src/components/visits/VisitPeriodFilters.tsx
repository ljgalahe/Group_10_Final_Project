"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  buildVisitsQuery,
  type OrganizeMode,
  type VisitPeriod,
} from "@/lib/visit-period";

export function VisitPeriodFilters({
  period,
  organize,
  basePath = "/visits",
  extraQuery,
}: {
  period: VisitPeriod;
  organize: OrganizeMode;
  basePath?: string;
  extraQuery?: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function go(next: Partial<VisitPeriod>, nextOrganize = organize) {
    const merged = { ...period, ...next };
    startTransition(() => {
      router.push(
        `${basePath}?${buildVisitsQuery(merged, nextOrganize, extraQuery)}`
      );
    });
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-stone-700">Time range</p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-sm text-stone-600">
          Show
          <select
            className="mt-1 block rounded-md border border-stone-300 px-3 py-2"
            value={period.grain}
            disabled={pending}
            onChange={(e) =>
              go({ grain: e.target.value as VisitPeriod["grain"] })
            }
          >
            <option value="all">All time</option>
            <option value="year">Year</option>
            <option value="month">Month</option>
            <option value="week">Week</option>
            <option value="day">Day</option>
          </select>
        </label>

        {period.grain !== "all" && (
          <label className="text-sm text-stone-600">
            Year
            <select
              className="mt-1 block rounded-md border border-stone-300 px-3 py-2"
              value={period.year}
              disabled={pending}
              onChange={(e) => go({ year: Number(e.target.value) })}
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        )}

        {(period.grain === "month" ||
          period.grain === "week" ||
          period.grain === "day") && (
          <label className="text-sm text-stone-600">
            Month
            <select
              className="mt-1 block rounded-md border border-stone-300 px-3 py-2"
              value={period.month}
              disabled={pending}
              onChange={(e) => go({ month: Number(e.target.value) })}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2026, m - 1, 1).toLocaleString("en-US", {
                    month: "long",
                  })}
                </option>
              ))}
            </select>
          </label>
        )}

        {period.grain === "week" && (
          <label className="text-sm text-stone-600">
            Week
            <select
              className="mt-1 block rounded-md border border-stone-300 px-3 py-2"
              value={period.week}
              disabled={pending}
              onChange={(e) => go({ week: Number(e.target.value) })}
            >
              {[1, 2, 3, 4, 5].map((w) => (
                <option key={w} value={w}>
                  Week {w}
                </option>
              ))}
            </select>
          </label>
        )}

        {period.grain === "day" && (
          <label className="text-sm text-stone-600">
            Day
            <select
              className="mt-1 block rounded-md border border-stone-300 px-3 py-2"
              value={period.day}
              disabled={pending}
              onChange={(e) => go({ day: Number(e.target.value) })}
            >
              {Array.from(
                { length: new Date(period.year, period.month, 0).getDate() },
                (_, i) => i + 1
              ).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </div>
  );
}

export function OrganizeToggle({
  period,
  organize,
}: {
  period: VisitPeriod;
  organize: OrganizeMode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setMode(mode: OrganizeMode) {
    startTransition(() => {
      router.push(`/visits?${buildVisitsQuery(period, mode)}`);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="mr-2 text-sm font-medium text-stone-700">Organize by</p>
      <button
        type="button"
        disabled={pending}
        onClick={() => setMode("company")}
        className={`rounded-md px-3 py-2 text-sm font-medium ${
          organize === "company"
            ? "bg-green-800 text-white"
            : "border border-stone-300 text-stone-700 hover:bg-stone-50"
        }`}
      >
        Company
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => setMode("jobs")}
        className={`rounded-md px-3 py-2 text-sm font-medium ${
          organize === "jobs"
            ? "bg-green-800 text-white"
            : "border border-stone-300 text-stone-700 hover:bg-stone-50"
        }`}
      >
        Jobs
      </button>
    </div>
  );
}
