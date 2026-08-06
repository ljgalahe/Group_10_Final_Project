"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";
import type {
  RevenueSeasonMonth,
  ServiceLineMarginRow,
} from "@/app/reports/profitability/queries";

function formatAxisDollars(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}

export function AccountantTotalRevenueButton({
  amount,
  serviceLines,
  seasonality,
}: {
  amount: number;
  serviceLines: ServiceLineMarginRow[];
  seasonality: RevenueSeasonMonth[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-stone-200 bg-stone-50 p-5 text-left shadow-sm transition hover:border-green-700 hover:ring-2 hover:ring-green-700/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-700/30"
      >
        <p className="text-sm font-medium text-stone-500">Total Revenue</p>
        <p className="mt-2 text-3xl font-bold text-green-900">
          {formatCurrency(amount)}
        </p>
        <p className="mt-1 text-xs text-green-800">
          Click for service-line mix and seasonality
        </p>
      </button>

      {open ? (
        <RevenueInsightModal
          totalRevenue={amount}
          serviceLines={serviceLines}
          seasonality={seasonality}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function RevenueInsightModal({
  totalRevenue,
  serviceLines,
  seasonality,
  onClose,
}: {
  totalRevenue: number;
  serviceLines: ServiceLineMarginRow[];
  seasonality: RevenueSeasonMonth[];
  onClose: () => void;
}) {
  const serviceRevenue = useMemo(() => {
    return [...serviceLines]
      .map((s) => ({
        name: s.serviceName,
        revenue: s.revenue,
        pct: totalRevenue > 0 ? (s.revenue / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [serviceLines, totalRevenue]);

  const seasonReport = useMemo(() => {
    const withRevenue = seasonality.filter((m) => m.revenue > 0);
    if (withRevenue.length === 0) {
      return {
        peak: null as RevenueSeasonMonth | null,
        trough: null as RevenueSeasonMonth | null,
        total: 0,
        peakShare: 0,
        avg: 0,
        narrative: "No billed revenue in the last 12 months yet.",
      };
    }
    const peak = withRevenue.reduce((best, m) =>
      m.revenue > best.revenue ? m : best
    );
    const trough = withRevenue.reduce((best, m) =>
      m.revenue < best.revenue ? m : best
    );
    const total = seasonality.reduce((s, m) => s + m.revenue, 0);
    const avg = total / Math.max(withRevenue.length, 1);
    const peakShare = total > 0 ? (peak.revenue / total) * 100 : 0;
    const swing =
      trough.revenue > 0
        ? ((peak.revenue - trough.revenue) / trough.revenue) * 100
        : null;

    const narrative =
      swing == null
        ? `${peak.label} is the strongest billing month at ${formatCurrency(peak.revenue)} (${peakShare.toFixed(0)}% of trailing-year revenue).`
        : `Revenue peaks in ${peak.label} (${formatCurrency(peak.revenue)}) and dips in ${trough.label} (${formatCurrency(trough.revenue)}). Peak month is ${swing.toFixed(0)}% above the softest month and accounts for ${peakShare.toFixed(0)}% of trailing-year billings.`;

    return { peak, trough, total, peakShare, avg, narrative };
  }, [seasonality]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="revenue-insight-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Revenue Insight
            </p>
            <h2
              id="revenue-insight-title"
              className="mt-1 text-lg font-semibold text-green-950"
            >
              Total Revenue — {formatCurrency(totalRevenue)}
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Service-line mix from allocated contract billings, plus trailing
              12-month seasonality.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-stone-400 hover:bg-stone-50 hover:text-stone-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-8 overflow-y-auto px-6 py-5">
          <section className="space-y-3">
            <div>
              <h3 className="text-base font-semibold text-green-950">
                Revenue by Service Line
              </h3>
              <p className="text-sm text-stone-500">
                Active-contract revenue shared evenly across each contract’s
                included services.
              </p>
            </div>
            <ServiceLineRevenueChart
              rows={serviceRevenue}
              totalRevenue={totalRevenue}
            />
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="text-base font-semibold text-green-950">
                Seasonality Report
              </h3>
              <p className="text-sm text-stone-500">
                Invoice billings and visit costs by month for the last 12
                months.
              </p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-4">
              <p className="text-sm leading-relaxed text-stone-700">
                {seasonReport.narrative}
              </p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-stone-200 bg-white px-3 py-2">
                  <dt className="text-xs text-stone-500">Peak month</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-green-950">
                    {seasonReport.peak
                      ? `${seasonReport.peak.label} · ${formatCurrency(seasonReport.peak.revenue)}`
                      : "—"}
                  </dd>
                </div>
                <div className="rounded-lg border border-stone-200 bg-white px-3 py-2">
                  <dt className="text-xs text-stone-500">Softest month</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-green-950">
                    {seasonReport.trough
                      ? `${seasonReport.trough.label} · ${formatCurrency(seasonReport.trough.revenue)}`
                      : "—"}
                  </dd>
                </div>
                <div className="rounded-lg border border-stone-200 bg-white px-3 py-2">
                  <dt className="text-xs text-stone-500">Avg active month</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-green-950">
                    {formatCurrency(seasonReport.avg)}
                  </dd>
                </div>
              </dl>
            </div>

            <SeasonalityRevenueChart months={seasonality} />
          </section>

          <div className="flex justify-end border-t border-stone-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ServiceLineRevenueChart({
  rows,
  totalRevenue,
}: {
  rows: Array<{ name: string; revenue: number; pct: number }>;
  totalRevenue: number;
}) {
  const maxRevenue = Math.max(...rows.map((r) => r.revenue), 1);

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
        No service-line revenue to chart yet.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <ul className="space-y-3">
        {rows.map((row) => {
          const widthPct = Math.max((row.revenue / maxRevenue) * 100, 2);
          return (
            <li key={row.name}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium text-stone-800">{row.name}</span>
                <span className="shrink-0 tabular-nums text-stone-600">
                  {formatCurrency(row.revenue)}
                  <span className="ml-2 text-xs text-stone-400">
                    {totalRevenue > 0 ? `${row.pct.toFixed(0)}%` : ""}
                  </span>
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full bg-green-700"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SeasonalityRevenueChart({
  months,
}: {
  months: RevenueSeasonMonth[];
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const width = 720;
  const height = 260;
  const padL = 48;
  const padR = 16;
  const padT = 24;
  const padB = 36;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const maxDollar = Math.max(
    ...months.map((m) => Math.max(m.revenue, m.costs)),
    1
  );
  const n = months.length || 1;
  const groupGap = 8;
  const groupW = (plotW - groupGap * (n + 1)) / n;
  const barW = groupW * 0.38;

  function xCenter(i: number) {
    return padL + groupGap + i * (groupW + groupGap) + groupW / 2;
  }
  function yDollar(v: number) {
    return padT + plotH - (v / maxDollar) * plotH;
  }

  const ticks = [0, 0.5, 1].map((t) => t * maxDollar);
  const hovered = hoverIndex != null ? months[hoverIndex] : null;

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-stone-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-600" />
          Revenue billed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-stone-400" />
          Direct Costs
        </span>
      </div>
      <div
        className="relative h-[260px] w-full"
        onMouseLeave={() => setHoverIndex(null)}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Monthly revenue and costs for the last 12 months"
        >
          {ticks.map((tick) => {
            const y = yDollar(tick);
            return (
              <g key={tick}>
                <line
                  x1={padL}
                  x2={width - padR}
                  y1={y}
                  y2={y}
                  stroke="#e7e5e4"
                  strokeWidth={1}
                />
                <text
                  x={padL - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-stone-400"
                  fontSize={10}
                >
                  {formatAxisDollars(tick)}
                </text>
              </g>
            );
          })}

          {months.map((m, i) => {
            const cx = xCenter(i);
            const revH = (m.revenue / maxDollar) * plotH;
            const costH = (m.costs / maxDollar) * plotH;
            return (
              <g key={m.monthKey}>
                <rect
                  x={cx - barW - 2}
                  y={padT + plotH - revH}
                  width={barW}
                  height={Math.max(revH, 0)}
                  className="fill-green-600"
                  rx={2}
                />
                <rect
                  x={cx + 2}
                  y={padT + plotH - costH}
                  width={barW}
                  height={Math.max(costH, 0)}
                  className="fill-stone-400"
                  rx={2}
                />
                <text
                  x={cx}
                  y={height - 12}
                  textAnchor="middle"
                  className="fill-stone-500"
                  fontSize={10}
                >
                  {m.label}
                </text>
                <rect
                  x={cx - groupW / 2}
                  y={padT}
                  width={groupW}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setHoverIndex(i)}
                />
              </g>
            );
          })}
        </svg>

        {hovered ? (
          <div
            className="pointer-events-none absolute top-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs shadow-md"
            style={{
              left: `${(xCenter(hoverIndex!) / width) * 100}%`,
              transform: "translateX(-50%)",
            }}
          >
            <p className="font-semibold text-stone-800">{hovered.label}</p>
            <p className="text-stone-600">
              Revenue {formatCurrency(hovered.revenue)}
            </p>
            <p className="text-stone-600">
              Costs {formatCurrency(hovered.costs)}
            </p>
            <p className="text-stone-500">
              {hovered.invoiceCount} invoice
              {hovered.invoiceCount === 1 ? "" : "s"}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
