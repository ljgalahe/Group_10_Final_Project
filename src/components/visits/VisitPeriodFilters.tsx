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
    <div className="gs-reveal-delay">
      <p className="gs-mark mb-3">Index</p>
      <div className="gs-index-bar">
        <label className="gs-index-field">
          <span>Show</span>
          <select
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
          <label className="gs-index-field">
            <span>Year</span>
            <select
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
          <label className="gs-index-field">
            <span>Month</span>
            <select
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
          <label className="gs-index-field">
            <span>Week</span>
            <select
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
          <label className="gs-index-field">
            <span>Day</span>
            <select
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
    <div>
      <p className="gs-mark mb-2">Organize</p>
      <div className="gs-index-tabs" role="tablist" aria-label="Organize by">
        <button
          type="button"
          role="tab"
          disabled={pending}
          aria-current={organize === "company" ? "true" : undefined}
          onClick={() => setMode("company")}
          className={`gs-index-tab ${organize === "company" ? "is-active" : ""}`}
        >
          Company
        </button>
        <button
          type="button"
          role="tab"
          disabled={pending}
          aria-current={organize === "jobs" ? "true" : undefined}
          onClick={() => setMode("jobs")}
          className={`gs-index-tab ${organize === "jobs" ? "is-active" : ""}`}
        >
          Jobs
        </button>
      </div>
    </div>
  );
}
