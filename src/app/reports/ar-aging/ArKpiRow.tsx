"use client";

import type { ReactNode } from "react";
import {
  ceiHealthTone,
  type CeiKpiSummary,
  type CeiMode,
  type DsoKpiSummary,
  type PctCurrentKpiSummary,
  type WaddKpiSummary,
} from "./ar-kpis";

type TrendTone = "green" | "amber" | "red" | "default";

const VALUE_TONE: Record<TrendTone, string> = {
  default: "text-green-950",
  green: "text-green-800",
  amber: "text-amber-700",
  red: "text-red-700",
};

function YoyBadge({
  delta,
  higherIsBetter = false,
  unit = "days",
}: {
  delta: number | null;
  higherIsBetter?: boolean;
  unit?: string;
}) {
  if (delta == null || Number.isNaN(delta)) {
    return <span className="text-xs text-stone-400">No YoY data</span>;
  }

  const improved = higherIsBetter ? delta > 0.05 : delta < -0.05;
  const worsened = higherIsBetter ? delta < -0.05 : delta > 0.05;
  const abs = Math.abs(delta);
  const label = `${delta > 0 ? "+" : ""}${delta.toFixed(1)}${unit === "%" ? " pts" : ""} vs LY`;
  const arrow = delta > 0.05 ? "▲" : delta < -0.05 ? "▼" : "●";

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        improved
          ? "text-green-700"
          : worsened
            ? "text-red-700"
            : "text-stone-500"
      }`}
    >
      <span aria-hidden="true">{arrow}</span>
      {label}
      <span className="sr-only">
        {abs.toFixed(1)} {unit}{" "}
        {worsened ? "worse" : improved ? "better" : "unchanged"} versus last year
      </span>
    </span>
  );
}

/** Shared shell: title top, metric centered in remaining space */
function KpiCard({
  title,
  subtitle,
  headerRight,
  value,
  valueClassName,
  yoy,
  secondary,
}: {
  title: string;
  subtitle?: string;
  headerRight?: ReactNode;
  value: string;
  valueClassName?: string;
  yoy: ReactNode;
  secondary?: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col rounded-xl border border-stone-200 bg-white p-3.5 shadow-sm sm:p-4">
      <div className="flex shrink-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium leading-snug text-stone-500">
            {title}
          </p>
          {subtitle ? (
            <p className="mt-0.5 text-[11px] leading-snug text-stone-400">
              {subtitle}
            </p>
          ) : null}
        </div>
        {headerRight ? (
          <div className="shrink-0">{headerRight}</div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-center gap-1.5 pt-2">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p
            className={`text-3xl font-bold leading-none tabular-nums sm:text-4xl ${valueClassName ?? "text-green-950"}`}
          >
            {value}
          </p>
          {yoy}
        </div>
        {secondary ? <div className="min-w-0">{secondary}</div> : null}
      </div>
    </div>
  );
}

const CEI_BADGE = {
  green: "bg-green-100 text-green-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
} as const;

export function DsoKpiCard({ kpi }: { kpi: DsoKpiSummary }) {
  const { current, yoyDaysDelinquent } = kpi;

  return (
    <KpiCard
      title="Days Sales Outstanding"
      subtitle="Days delinquent · rolling 3-mo"
      value={current.daysDelinquent.toFixed(1)}
      yoy={<YoyBadge delta={yoyDaysDelinquent} />}
      secondary={
        <p className="truncate text-xs text-stone-500">
          Actual {current.dso.toFixed(1)}d · Best possible{" "}
          {current.bestPossibleDso.toFixed(1)}d
        </p>
      }
    />
  );
}

export function CeiKpiCard({
  kpi,
  mode,
  onModeChange,
}: {
  kpi: CeiKpiSummary;
  mode: CeiMode;
  onModeChange: (mode: CeiMode) => void;
}) {
  const { current, yoyCei } = kpi;
  const tone = ceiHealthTone(current.cei);

  return (
    <KpiCard
      title="Collection Effectiveness Index"
      subtitle="Higher is better"
      headerRight={
        <div
          className="inline-flex rounded-md border border-stone-200 bg-stone-50 p-0.5 text-[10px]"
          role="group"
          aria-label="CEI calculation method"
        >
          <button
            type="button"
            title="Trailing 3 months"
            onClick={() => onModeChange("trailing_3m")}
            className={`rounded px-1.5 py-0.5 font-medium transition ${
              mode === "trailing_3m"
                ? "bg-white text-green-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            3 mo
          </button>
          <button
            type="button"
            title="Annualized Month-to-Date"
            onClick={() => onModeChange("annualized_mtd")}
            className={`rounded px-1.5 py-0.5 font-medium transition ${
              mode === "annualized_mtd"
                ? "bg-white text-green-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            MTD
          </button>
        </div>
      }
      value={`${current.cei.toFixed(1)}%`}
      valueClassName={VALUE_TONE[tone]}
      yoy={<YoyBadge delta={yoyCei} higherIsBetter unit="%" />}
      secondary={
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${CEI_BADGE[tone]}`}
        >
          {tone === "green"
            ? "Healthy (>80%)"
            : tone === "amber"
              ? "Watch (60–80%)"
              : "At risk (<60%)"}
        </span>
      }
    />
  );
}

export function WaddKpiCard({ kpi }: { kpi: WaddKpiSummary }) {
  const { current, yoyWeighted } = kpi;

  return (
    <KpiCard
      title="Weighted Avg Days Delinquent"
      subtitle="Past-due $ weighted"
      value={current.weightedAvgDaysDelinquent.toFixed(1)}
      yoy={<YoyBadge delta={yoyWeighted} />}
      secondary={
        <p className="truncate text-xs text-stone-500">
          Unweighted{" "}
          <span className="font-medium text-stone-700">
            {current.unweightedAvgDaysPastDue.toFixed(1)}
          </span>
        </p>
      }
    />
  );
}

export function PctCurrentKpiCard({ kpi }: { kpi: PctCurrentKpiSummary }) {
  const { current, yoyPctCurrent } = kpi;

  return (
    <KpiCard
      title="Percent of AR Current"
      subtitle="Current bucket ÷ total AR"
      value={`${current.pctCurrent.toFixed(1)}%`}
      yoy={<YoyBadge delta={yoyPctCurrent} higherIsBetter unit="%" />}
    />
  );
}

export function ArKpiRow({
  dso,
  cei,
  wadd,
  pctCurrent,
  ceiMode,
  onCeiModeChange,
}: {
  dso: DsoKpiSummary;
  cei: CeiKpiSummary;
  wadd: WaddKpiSummary;
  pctCurrent: PctCurrentKpiSummary;
  ceiMode: CeiMode;
  onCeiModeChange: (mode: CeiMode) => void;
}) {
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <h2 className="mb-2.5 shrink-0 text-lg font-semibold text-green-950">
        Health Metrics
      </h2>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2.5 overflow-hidden sm:grid-cols-2 sm:grid-rows-2 sm:gap-3">
        <DsoKpiCard kpi={dso} />
        <CeiKpiCard kpi={cei} mode={ceiMode} onModeChange={onCeiModeChange} />
        <WaddKpiCard kpi={wadd} />
        <PctCurrentKpiCard kpi={pctCurrent} />
      </div>
    </section>
  );
}
