"use client";

import { useState } from "react";
import { Card, StatCard } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import type { AccountantCompanyPerformance } from "@/app/dashboard/accountant-company-performance";

const PIE_COLORS: Record<string, string> = {
  labor: "#166534",
  materials: "#ca8a04",
  equipment: "#0369a1",
};

function CostDistributionPie({
  slices,
}: {
  slices: AccountantCompanyPerformance["costDistribution"];
}) {
  const total = slices.reduce((sum, s) => sum + s.amount, 0);
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = 72;
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  if (total <= 0) {
    return (
      <p className="py-8 text-center text-sm text-stone-500">
        No visit costs to chart yet.
      </p>
    );
  }

  let angle = -Math.PI / 2;
  const arcs = slices
    .filter((s) => s.amount > 0)
    .map((slice) => {
      const portion = slice.amount / total;
      const start = angle;
      const sweep = portion * Math.PI * 2;
      angle += sweep;
      const end = angle;
      const x1 = cx + r * Math.cos(start);
      const y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(end);
      const y2 = cy + r * Math.sin(end);
      const large = sweep > Math.PI ? 1 : 0;
      const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
      return { ...slice, d, portion, color: PIE_COLORS[slice.key] ?? "#78716c" };
    });

  const hovered = arcs.find((a) => a.key === hoverKey) ?? null;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-center sm:gap-8">
      <div className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
          {arcs.map((arc) => (
            <path
              key={arc.key}
              d={arc.d}
              fill={arc.color}
              opacity={hoverKey && hoverKey !== arc.key ? 0.55 : 1}
              className="cursor-pointer transition-opacity"
              onMouseEnter={() => setHoverKey(arc.key)}
              onMouseLeave={() => setHoverKey(null)}
            />
          ))}
          <circle cx={cx} cy={cy} r={38} fill="white" />
          <text
            x={cx}
            y={cy - 4}
            textAnchor="middle"
            className="fill-stone-500"
            style={{ fontSize: 10 }}
          >
            Visit costs
          </text>
          <text
            x={cx}
            y={cy + 12}
            textAnchor="middle"
            className="fill-green-950 font-semibold"
            style={{ fontSize: 11 }}
          >
            {hovered
              ? `${(hovered.portion * 100).toFixed(0)}%`
              : formatCurrency(total).replace(/\.00$/, "")}
          </text>
        </svg>
      </div>
      <ul className="w-full max-w-xs space-y-2 text-sm">
        {arcs.map((arc) => (
          <li
            key={arc.key}
            className={`flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 ${
              hoverKey === arc.key ? "bg-stone-100" : ""
            }`}
            onMouseEnter={() => setHoverKey(arc.key)}
            onMouseLeave={() => setHoverKey(null)}
          >
            <span className="flex items-center gap-2 text-stone-700">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: arc.color }}
                aria-hidden
              />
              {arc.label}
            </span>
            <span className="font-medium text-green-950">
              {formatCurrency(arc.amount)}
              <span className="ml-1 text-xs font-normal text-stone-500">
                ({(arc.portion * 100).toFixed(1)}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Horizontal bars: best fit for ranked named categories with readable labels. */
function ProfitByServiceBars({
  rows,
}: {
  rows: AccountantCompanyPerformance["profitByService"];
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const top = rows.slice(0, 8);
  if (top.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-stone-500">
        No service-line profit data yet.
      </p>
    );
  }

  const maxAbs = Math.max(...top.map((r) => Math.abs(r.profit)), 1);
  const hovered = hoverIndex != null ? top[hoverIndex] : null;

  return (
    <div className="space-y-3">
      <ul className="space-y-2.5">
        {top.map((row, i) => {
          const widthPct = (Math.abs(row.profit) / maxAbs) * 100;
          const positive = row.profit >= 0;
          return (
            <li
              key={row.serviceName}
              className="cursor-pointer"
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
            >
              <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <span
                  className={`font-medium ${
                    hoverIndex === i ? "text-green-900" : "text-stone-800"
                  }`}
                >
                  {row.serviceName}
                </span>
                <span
                  className={`shrink-0 tabular-nums font-semibold ${
                    positive ? "text-green-900" : "text-red-800"
                  }`}
                >
                  {formatCurrency(row.profit)}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-stone-100">
                <div
                  className={`h-full rounded-full transition-[width,opacity] ${
                    positive ? "bg-green-800" : "bg-red-700"
                  }`}
                  style={{
                    width: `${Math.max(widthPct, 2)}%`,
                    opacity: hoverIndex != null && hoverIndex !== i ? 0.45 : 1,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      {hovered ? (
        <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-600">
          <span className="font-semibold text-green-950">{hovered.serviceName}</span>
          {" · "}
          Revenue {formatCurrency(hovered.revenue)}
          {" · "}
          Cost {formatCurrency(hovered.cost)}
          {" · "}
          ~{hovered.visitShare.toFixed(0)} visit share
        </p>
      ) : (
        <p className="text-xs text-stone-500">
          Hover a bar for revenue and cost detail. Sorted by profit (highest first).
        </p>
      )}
    </div>
  );
}

const TREND_COLORS = {
  revenue: "#166534",
  cost: "#b45309",
  profit: "#0369a1",
} as const;

function ProfitTrendChart({
  points,
}: {
  points: AccountantCompanyPerformance["profitTrend"];
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const width = 560;
  const height = 220;
  const pad = { top: 20, right: 16, bottom: 32, left: 52 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const maxVal = Math.max(
    ...points.flatMap((p) => [p.revenue, p.cost, Math.abs(p.profit)]),
    1
  );

  const xAt = (i: number) =>
    pad.left + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const yAt = (v: number) => pad.top + innerH - (v / maxVal) * innerH;

  function pathFor(key: "revenue" | "cost" | "profit") {
    return points
      .map((p, i) => {
        const cmd = i === 0 ? "M" : "L";
        return `${cmd} ${xAt(i).toFixed(1)} ${yAt(p[key]).toFixed(1)}`;
      })
      .join(" ");
  }

  const hovered = hoverIndex != null ? points[hoverIndex] : null;

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="Monthly profit trend for revenue, cost, and profit"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = pad.top + innerH * (1 - t);
          const label = formatCurrency(maxVal * t).replace(/\.00$/, "");
          return (
            <g key={t}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={y}
                y2={y}
                stroke="#e7e5e4"
                strokeWidth={1}
              />
              <text
                x={pad.left - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-stone-400"
                style={{ fontSize: 9 }}
              >
                {label}
              </text>
            </g>
          );
        })}
        <path
          d={pathFor("revenue")}
          fill="none"
          stroke={TREND_COLORS.revenue}
          strokeWidth={2.5}
        />
        <path
          d={pathFor("cost")}
          fill="none"
          stroke={TREND_COLORS.cost}
          strokeWidth={2.5}
        />
        <path
          d={pathFor("profit")}
          fill="none"
          stroke={TREND_COLORS.profit}
          strokeWidth={2.5}
        />
        {points.map((p, i) => (
          <g key={p.month}>
            {(["revenue", "cost", "profit"] as const).map((key) => (
              <circle
                key={key}
                cx={xAt(i)}
                cy={yAt(p[key])}
                r={hoverIndex === i ? 4.5 : 3}
                fill={TREND_COLORS[key]}
              />
            ))}
            <text
              x={xAt(i)}
              y={height - 10}
              textAnchor="middle"
              className="fill-stone-600"
              style={{ fontSize: 11 }}
            >
              {p.month}
            </text>
            <rect
              x={xAt(i) - innerW / points.length / 2}
              y={pad.top}
              width={innerW / points.length}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
            />
          </g>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-stone-600">
        {(
          [
            ["revenue", "Revenue"],
            ["cost", "Cost"],
            ["profit", "Profit"],
          ] as const
        ).map(([key, label]) => (
          <span key={key} className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: TREND_COLORS[key] }}
              aria-hidden
            />
            {label}
          </span>
        ))}
      </div>
      {hovered ? (
        <p className="mt-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-600">
          <span className="font-semibold text-green-950">{hovered.month}</span>
          {" · "}
          Revenue {formatCurrency(hovered.revenue)}
          {" · "}
          Cost {formatCurrency(hovered.cost)}
          {" · "}
          Profit {formatCurrency(hovered.profit)}
        </p>
      ) : (
        <p className="mt-2 text-xs text-stone-500">
          Hover a month for revenue, cost, and profit detail.
        </p>
      )}
    </div>
  );
}

export function AccountantCompanyPerformanceSection({
  data,
}: {
  data: AccountantCompanyPerformance;
}) {
  const billing = data.billingEligibility;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-green-950">
        Company Performance
      </h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Average Revenue / Visit"
          value={formatCurrency(data.averageRevenuePerVisit)}
          hint="Allocated monthly fee across visit frequency"
        />
        <StatCard
          label="Average Cost / Visit"
          value={formatCurrency(data.averageCostPerVisit)}
          hint="Labor + materials + equipment on completed visits"
        />
        <StatCard
          label="Average Profit / Visit"
          value={formatCurrency(data.averageProfitPerVisit)}
          hint="Allocated contract revenue minus visit costs"
          valueClassName={
            data.averageProfitPerVisit >= 0 ? "text-green-900" : "text-red-800"
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="text-base font-semibold text-green-950">
            Visit Cost Distribution
          </h3>
          <div className="mt-4">
            <CostDistributionPie slices={data.costDistribution} />
          </div>
        </Card>

        <Card>
          <h3 className="text-base font-semibold text-green-950">
            Profit by Visit Type
          </h3>
          <div className="mt-4">
            <ProfitByServiceBars rows={data.profitByService} />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Average Days to Invoice"
          value={
            data.averageDaysToInvoice != null
              ? `${data.averageDaysToInvoice.toLocaleString("en-US", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })} Days`
              : "—"
          }
          hint="Invoice turnaround · lower is better"
        />
        <StatCard
          label="Average Crew Hours"
          value={
            data.averageCrewHours != null
              ? `${data.averageCrewHours.toLocaleString("en-US", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })} hours`
              : "—"
          }
          hint="Average job duration on completed visits"
        />
        <Card>
          <h3 className="text-sm font-medium text-stone-500">
            Billing Eligibility
          </h3>
          <ul className="mt-3 space-y-1.5 text-sm text-green-950">
            <li className="flex items-baseline justify-between gap-3">
              <span className="text-stone-600">Completed</span>
              <span className="font-semibold tabular-nums">
                {billing.completed.toLocaleString("en-US")}
              </span>
            </li>
            <li className="flex items-baseline justify-between gap-3">
              <span className="text-stone-600">Ready</span>
              <span className="font-semibold tabular-nums">
                {billing.readyToInvoice.toLocaleString("en-US")}
              </span>
            </li>
            <li className="flex items-baseline justify-between gap-3">
              <span className="text-stone-600">Pending Approval</span>
              <span className="font-semibold tabular-nums">
                {billing.pendingApproval.toLocaleString("en-US")}
              </span>
            </li>
            <li className="flex items-baseline justify-between gap-3">
              <span className="text-stone-600">Already Invoiced</span>
              <span className="font-semibold tabular-nums">
                {billing.alreadyInvoiced.toLocaleString("en-US")}
              </span>
            </li>
          </ul>
          <p className="mt-2 text-xs text-stone-500">
            Completed visits by invoice readiness on the contract.
          </p>
        </Card>
      </div>

      <Card>
        <h3 className="text-base font-semibold text-green-950">Profit Trend</h3>
        <div className="mt-4">
          <ProfitTrendChart points={data.profitTrend} />
        </div>
      </Card>
    </section>
  );
}
