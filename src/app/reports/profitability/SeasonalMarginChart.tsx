"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/format";

export type MonthlyMargin = {
  monthKey: string;
  label: string;
  revenue: number;
  costs: number;
  margin: number;
  marginPct: number;
  laborHours: number;
};

function formatAxisDollars(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}

type Props = {
  months: MonthlyMargin[];
};

/** Dual-series chart: revenue/cost bars with margin % line — last 12 months. */
export function SeasonalMarginChart({ months }: Props) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const width = 720;
  const height = 280;
  const padL = 52;
  const padR = 48;
  const padT = 28;
  const padB = 40;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const maxDollar = Math.max(
    ...months.map((m) => Math.max(m.revenue, m.costs, Math.abs(m.margin))),
    1
  );
  const maxPct = Math.max(...months.map((m) => Math.abs(m.marginPct)), 10);
  const pctCeiling = Math.ceil(maxPct / 10) * 10;

  const n = months.length || 1;
  const groupGap = 10;
  const groupW = (plotW - groupGap * (n + 1)) / n;
  const barW = groupW * 0.38;

  const dollarTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * maxDollar);
  const pctTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * pctCeiling);

  function xCenter(i: number) {
    return padL + groupGap + i * (groupW + groupGap) + groupW / 2;
  }

  function yDollar(v: number) {
    return padT + plotH - (v / maxDollar) * plotH;
  }

  function yPct(v: number) {
    return padT + plotH - (v / pctCeiling) * plotH;
  }

  const linePoints = months
    .map((m, i) => `${xCenter(i)},${yPct(Math.max(0, m.marginPct))}`)
    .join(" ");

  const totalMargin = months.reduce((s, m) => s + m.margin, 0);
  const peak = months.reduce(
    (best, m) => (m.marginPct > best.marginPct ? m : best),
    months[0] ?? { label: "—", marginPct: 0 }
  );

  const hovered = hoverIndex != null ? months[hoverIndex] : null;
  const tooltipLeftPct =
    hoverIndex != null ? (xCenter(hoverIndex) / width) * 100 : 50;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-green-950">
            Seasonal Margin by Month
          </h2>
          <p className="mt-0.5 text-sm text-stone-500">
            Last 12 months — revenue billed vs direct visit costs
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-stone-600">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm bg-green-600"
              aria-hidden
            />
            Gross revenue
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm bg-stone-400"
              aria-hidden
            />
            Direct costs
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-0.5 w-3 rounded-full bg-emerald-800"
              aria-hidden
            />
            Gross margin %
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div
          className="relative h-[280px] w-full"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-full w-full"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Seasonal gross margin by month for the last 12 months"
          >
            {dollarTicks.map((tick) => {
              const y = yDollar(tick);
              return (
                <g key={`d-${tick}`}>
                  <line
                    x1={padL}
                    x2={width - padR}
                    y1={y}
                    y2={y}
                    className="stroke-stone-200"
                    strokeWidth={1}
                  />
                  <text
                    x={padL - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-stone-400"
                    style={{ fontSize: 10 }}
                  >
                    {formatAxisDollars(tick)}
                  </text>
                </g>
              );
            })}

            {pctTicks.map((tick) => {
              const y = yPct(tick);
              return (
                <text
                  key={`p-${tick}`}
                  x={width - padR + 8}
                  y={y + 3}
                  textAnchor="start"
                  className="fill-stone-400"
                  style={{ fontSize: 10 }}
                >
                  {Math.round(tick)}%
                </text>
              );
            })}

            {months.map((m, i) => {
              const cx = xCenter(i);
              const revH = (m.revenue / maxDollar) * plotH;
              const costH = (m.costs / maxDollar) * plotH;
              const revX = cx - barW - 2;
              const costX = cx + 2;
              const active = hoverIndex === i;

              return (
                <g key={m.monthKey}>
                  {active ? (
                    <rect
                      x={cx - groupW / 2}
                      y={padT}
                      width={groupW}
                      height={plotH}
                      className="fill-stone-100"
                      opacity={0.7}
                    />
                  ) : null}
                  <rect
                    x={revX}
                    y={padT + plotH - revH}
                    width={barW}
                    height={Math.max(revH, m.revenue > 0 ? 2 : 0)}
                    rx={3}
                    className={active ? "fill-green-700" : "fill-green-600"}
                  />
                  <rect
                    x={costX}
                    y={padT + plotH - costH}
                    width={barW}
                    height={Math.max(costH, m.costs > 0 ? 2 : 0)}
                    rx={3}
                    className={active ? "fill-stone-500" : "fill-stone-400"}
                  />
                  <text
                    x={cx}
                    y={height - 14}
                    textAnchor="middle"
                    className={active ? "fill-stone-800" : "fill-stone-500"}
                    style={{ fontSize: 11, fontWeight: active ? 600 : 400 }}
                  >
                    {m.label}
                  </text>
                </g>
              );
            })}

            <polyline
              points={linePoints}
              fill="none"
              stroke="#065f46"
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              pointerEvents="none"
            />
            {months.map((m, i) => (
              <circle
                key={`pt-${m.monthKey}`}
                cx={xCenter(i)}
                cy={yPct(Math.max(0, m.marginPct))}
                r={hoverIndex === i ? 5 : 3.5}
                className="fill-emerald-800 stroke-white"
                strokeWidth={1.5}
                pointerEvents="none"
              />
            ))}

            {/* Full-column hit targets so short bars are still easy to hover */}
            {months.map((m, i) => {
              const cx = xCenter(i);
              return (
                <rect
                  key={`hit-${m.monthKey}`}
                  x={cx - groupW / 2}
                  y={padT}
                  width={groupW}
                  height={plotH}
                  className="fill-transparent"
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHoverIndex(i)}
                />
              );
            })}
          </svg>

          {hovered && hoverIndex != null ? (
            <div
              className="pointer-events-none absolute top-2 z-10 min-w-[160px] -translate-x-1/2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs shadow-lg"
              style={{
                left: `${Math.min(88, Math.max(12, tooltipLeftPct))}%`,
              }}
              role="tooltip"
            >
              <p className="mb-1.5 font-semibold text-stone-900">
                {hovered.label}
              </p>
              <dl className="space-y-1 text-stone-600">
                <div className="flex justify-between gap-4">
                  <dt>Gross revenue</dt>
                  <dd className="font-medium text-green-800">
                    {formatCurrency(hovered.revenue)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Direct costs</dt>
                  <dd className="font-medium text-stone-800">
                    {formatCurrency(hovered.costs)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Gross profit</dt>
                  <dd
                    className={`font-medium ${
                      hovered.margin >= 0 ? "text-green-800" : "text-red-700"
                    }`}
                  >
                    {formatCurrency(hovered.margin)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-stone-100 pt-1">
                  <dt>Gross margin %</dt>
                  <dd className="font-semibold text-emerald-900">
                    {hovered.marginPct.toFixed(1)}%
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-stone-100 pt-3 text-sm text-stone-600">
          <span>
            12-mo gross profit:{" "}
            <span
              className={`font-semibold ${
                totalMargin >= 0 ? "text-green-800" : "text-red-700"
              }`}
            >
              {formatCurrency(totalMargin)}
            </span>
          </span>
          {peak ? (
            <span>
              Peak margin month:{" "}
              <span className="font-semibold text-stone-800">
                {peak.label} ({peak.marginPct.toFixed(1)}%)
              </span>
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
