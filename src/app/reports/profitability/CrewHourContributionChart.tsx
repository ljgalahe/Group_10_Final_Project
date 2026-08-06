"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/format";
import type { MonthlyMargin } from "./SeasonalMarginChart";

function formatAxisDollars(n: number) {
  if (Math.abs(n) >= 1_000) return `$${Math.round(n)}`;
  return `$${n.toFixed(0)}`;
}

type Props = {
  months: MonthlyMargin[];
};

/**
 * Contribution margin per crew hour by month.
 * CM = gross revenue − direct costs; ÷ labor person-hours.
 */
export function CrewHourContributionChart({ months }: Props) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const width = 720;
  const height = 280;
  const padL = 48;
  const padR = 16;
  const padT = 28;
  const padB = 40;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const series = months.map((m) => ({
    ...m,
    cmPerHour: m.laborHours > 0 ? m.margin / m.laborHours : 0,
  }));

  const maxVal = Math.max(...series.map((s) => Math.abs(s.cmPerHour)), 1);
  const n = series.length || 1;
  const groupGap = 8;
  const barW = (plotW - groupGap * (n + 1)) / n;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * maxVal);

  function xCenter(i: number) {
    return padL + groupGap + i * (barW + groupGap) + barW / 2;
  }

  function yVal(v: number) {
    return padT + plotH - (Math.max(0, v) / maxVal) * plotH;
  }

  const avg =
    series.reduce((s, m) => s + m.cmPerHour * m.laborHours, 0) /
    Math.max(
      1,
      series.reduce((s, m) => s + m.laborHours, 0)
    );
  const best = series.reduce(
    (a, b) => (b.cmPerHour > a.cmPerHour ? b : a),
    series[0] ?? { label: "—", cmPerHour: 0, laborHours: 0 }
  );

  const hovered = hoverIndex != null ? series[hoverIndex] : null;
  const tooltipLeftPct =
    hoverIndex != null ? (xCenter(hoverIndex) / width) * 100 : 50;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-green-950">
            CM per Crew Hour
          </h2>
          <p className="mt-0.5 text-sm text-stone-500">
            Contribution margin ÷ labor person-hours
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-stone-600">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm bg-teal-700"
              aria-hidden
            />
            $/crew hour
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
            aria-label="Contribution margin per crew hour by month"
          >
            {ticks.map((tick) => {
              const y = yVal(tick);
              return (
                <g key={tick}>
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

            {series.map((m, i) => {
              const cx = xCenter(i);
              const barH = (Math.max(0, m.cmPerHour) / maxVal) * plotH;
              const active = hoverIndex === i;
              return (
                <g key={m.monthKey}>
                  {active ? (
                    <rect
                      x={cx - barW / 2 - 2}
                      y={padT}
                      width={barW + 4}
                      height={plotH}
                      className="fill-stone-100"
                      opacity={0.7}
                    />
                  ) : null}
                  <rect
                    x={cx - barW / 2}
                    y={padT + plotH - barH}
                    width={barW}
                    height={Math.max(barH, m.cmPerHour > 0 ? 2 : 0)}
                    rx={3}
                    className={active ? "fill-teal-800" : "fill-teal-700"}
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

            {series.map((m, i) => {
              const cx = xCenter(i);
              return (
                <rect
                  key={`hit-${m.monthKey}`}
                  x={cx - barW / 2 - groupGap / 2}
                  y={padT}
                  width={barW + groupGap}
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
              className="pointer-events-none absolute top-2 z-10 min-w-[150px] -translate-x-1/2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs shadow-lg"
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
                  <dt>CM / crew hour</dt>
                  <dd className="font-semibold text-teal-900">
                    {formatCurrency(hovered.cmPerHour)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Contribution</dt>
                  <dd className="font-medium text-stone-800">
                    {formatCurrency(hovered.margin)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Crew hours</dt>
                  <dd className="font-medium text-stone-800">
                    {hovered.laborHours.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-stone-100 pt-3 text-sm text-stone-600">
          <span>
            Weighted avg:{" "}
            <span className="font-semibold text-teal-900">
              {formatCurrency(avg)}/hr
            </span>
          </span>
          {best ? (
            <span>
              Best month:{" "}
              <span className="font-semibold text-stone-800">
                {best.label} ({formatCurrency(best.cmPerHour)}/hr)
              </span>
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
