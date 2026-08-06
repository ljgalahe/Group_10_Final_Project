"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";

type WorkCategory = "completed" | "pending";

const WORK_COLORS = {
  completed: "#166534",
  pending: "#f59e0b",
} as const;

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

/** Donut slice from startAngle→endAngle in degrees (0 = top, clockwise). */
function donutSlicePath(
  cx: number,
  cy: number,
  rOut: number,
  rIn: number,
  startAngle: number,
  endAngle: number
) {
  const sweep = Math.min(359.999, Math.max(0, endAngle - startAngle));
  if (sweep <= 0.001) return "";
  const end = startAngle + sweep;
  const large = sweep > 180 ? 1 : 0;
  const p1 = polar(cx, cy, rOut, startAngle);
  const p2 = polar(cx, cy, rOut, end);
  const p3 = polar(cx, cy, rIn, end);
  const p4 = polar(cx, cy, rIn, startAngle);
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${rOut} ${rOut} 0 ${large} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${rIn} ${rIn} 0 ${large} 0 ${p4.x} ${p4.y}`,
    "Z",
  ].join(" ");
}

export function WorkStatusPie({
  completedCount,
  pendingCount,
  completedPay,
  pendingPay,
}: {
  completedCount: number;
  pendingCount: number;
  completedPay: number;
  pendingPay: number;
}) {
  const total = completedCount + pendingCount;
  const [selected, setSelected] = useState<WorkCategory>("completed");

  const completedPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  const pendingPct = total > 0 ? Math.round((pendingCount / total) * 100) : 0;
  const completedShare = total > 0 ? completedCount / total : 0;
  const pendingShare = total > 0 ? pendingCount / total : 0;

  const slices = useMemo(() => {
    const items: {
      key: WorkCategory;
      color: string;
      start: number;
      end: number;
    }[] = [];
    let angle = 0;
    const add = (key: WorkCategory, share: number, color: string) => {
      if (share <= 0) return;
      const sweep = share * 360;
      items.push({ key, color, start: angle, end: angle + sweep });
      angle += sweep;
    };
    add("completed", completedShare, WORK_COLORS.completed);
    add("pending", pendingShare, WORK_COLORS.pending);
    return items;
  }, [completedShare, pendingShare]);

  const center =
    selected === "completed"
      ? {
          count: completedCount,
          pct: completedPct,
          label: "Completed",
        }
      : {
          count: pendingCount,
          pct: pendingPct,
          label: "Pending",
        };

  const labels = [
    {
      key: "completed" as const,
      title: "Completed",
      hint: `${formatCurrency(completedPay)} crew pay`,
      count: completedCount,
      pct: completedPct,
      box: "border-[var(--complete)]/30 bg-[var(--complete-soft)]",
      value: "gs-complete-text",
    },
    {
      key: "pending" as const,
      title: "Pending",
      hint: `${formatCurrency(pendingPay)} crew pay planned`,
      count: pendingCount,
      pct: pendingPct,
      box: "border-amber-300 bg-amber-50",
      value: "text-amber-800",
    },
  ];

  const cx = 88;
  const cy = 88;
  const rOut = 84;
  const rIn = 52;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center sm:gap-10">
      <div className="relative h-44 w-44 shrink-0">
        <svg
          viewBox="0 0 176 176"
          className="h-full w-full drop-shadow-sm"
          role="img"
          aria-label="Work status breakdown. Click a segment to see visit counts."
        >
          <circle cx={cx} cy={cy} r={rOut} fill="#e7e5e4" />
          {slices.length === 0 ? (
            <circle
              cx={cx}
              cy={cy}
              r={(rOut + rIn) / 2}
              fill="none"
              stroke="#e7e5e4"
              strokeWidth={rOut - rIn}
            />
          ) : null}
          {slices.map((slice) => {
            const d = donutSlicePath(
              cx,
              cy,
              rOut,
              rIn,
              slice.start,
              slice.end
            );
            if (!d) return null;
            const active = selected === slice.key;
            return (
              <path
                key={slice.key}
                d={d}
                fill={slice.color}
                className="cursor-pointer transition-opacity"
                opacity={active ? 1 : 0.85}
                stroke={active ? "#fff" : "transparent"}
                strokeWidth={active ? 2 : 0}
                onClick={() => setSelected(slice.key)}
              >
                <title>
                  {slice.key === "completed" ? "Completed" : "Pending"}
                </title>
              </path>
            );
          })}
          <circle cx={cx} cy={cy} r={rIn - 1} fill="white" />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {total === 0 ? (
            <>
              <p className="gs-metric-value text-2xl text-green-950">
                0
              </p>
              <p className="text-xs text-stone-500">No Visits</p>
            </>
          ) : (
            <>
              <p className="gs-metric-value text-2xl text-green-950">
                {center.count}
              </p>
              <p className="text-xs text-stone-500">
                {center.label} · {center.pct}%
              </p>
            </>
          )}
        </div>
      </div>

      <div className="w-full max-w-xs space-y-2 text-sm">
        {labels.map((label) => {
          const active = selected === label.key;
          return (
            <button
              key={label.key}
              type="button"
              onClick={() => setSelected(label.key)}
              className={`flex w-full items-start justify-between gap-4 border px-3 py-2.5 text-left transition ${label.box} ${
                active
                  ? "ring-2 ring-[var(--complete)]/25"
                  : "hover:brightness-[0.98]"
              }`}
            >
              <div className="flex items-start gap-2">
                <span
                  className="mt-1 h-2.5 w-2.5 shrink-0"
                  style={{ backgroundColor: WORK_COLORS[label.key] }}
                  aria-hidden
                />
                <div>
                  <p className={`font-medium ${label.value}`}>{label.title}</p>
                  <p className="text-xs text-stone-500">{label.hint}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`gs-metric-value text-xl ${label.value}`}>
                  {label.count}
                </p>
                <p className="text-xs text-stone-500">{label.pct}%</p>
              </div>
            </button>
          );
        })}
        <p className="pt-1 text-xs text-stone-400">
          Click a slice or key · {total} total visits
        </p>
      </div>
    </div>
  );
}
