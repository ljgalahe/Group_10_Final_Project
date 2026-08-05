"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  CategoryLeaderboard,
  PerformanceBadge,
  PerformanceCategory,
  PerformanceEntry,
} from "@/lib/company-performance";

const CATEGORY_ORDER: PerformanceCategory[] = [
  "crew",
  "equipment",
  "customer",
  "contract",
];

export function CompanyPerformanceLeaderboard({
  categories,
  initialCategory,
}: {
  categories: CategoryLeaderboard[];
  initialCategory?: PerformanceCategory;
}) {
  const byKey = useMemo(() => {
    const map = new Map(categories.map((c) => [c.category, c]));
    return map;
  }, [categories]);

  const available = useMemo(
    () =>
      CATEGORY_ORDER.filter((key) => {
        const cat = byKey.get(key);
        return cat && cat.entries.length > 0;
      }),
    [byKey]
  );

  const [active, setActive] = useState<PerformanceCategory>(() => {
    if (initialCategory && available.includes(initialCategory)) {
      return initialCategory;
    }
    return available[0] ?? "crew";
  });

  useEffect(() => {
    if (initialCategory && available.includes(initialCategory)) {
      setActive(initialCategory);
    }
  }, [initialCategory, available]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const current = byKey.get(active) ?? null;
  const selected =
    current?.entries.find((entry) => entry.id === selectedId) ?? null;

  useEffect(() => {
    setSelectedId(null);
  }, [active]);

  useEffect(() => {
    if (!selectedId || !panelRef.current) return;
    panelRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

  if (available.length === 0) {
    return (
      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-green-950">
          Company Performance Leaderboard
        </h2>
        <p className="mt-2 text-sm text-stone-500">
          Not enough operational data yet to rank crew, equipment, customers, or
          contracts.
        </p>
      </section>
    );
  }

  return (
    <section id="company-performance" className="scroll-mt-24 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-green-950">
          Company Performance Leaderboard
        </h2>
        <p className="text-sm text-stone-500">
          Where the company is thriving — and where it needs attention. Click a
          performer for underlying metrics. Some insights are estimated from
          available visit and cost data.
        </p>
      </div>

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Performance categories"
      >
        {available.map((key) => {
          const cat = byKey.get(key)!;
          const isActive = key === active;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(key)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-green-800 text-white"
                  : "border border-stone-200 bg-white text-stone-700 hover:border-green-300 hover:bg-green-50"
              }`}
            >
              {cat.title}
            </button>
          );
        })}
      </div>

      {current ? (
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-sm text-stone-500">{current.description}</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <HighlightCard
              label="Top performer"
              entry={current.top}
              tone="good"
              selected={selectedId === current.top?.id}
              onSelect={() =>
                setSelectedId((id) =>
                  id === current.top?.id ? null : current.top?.id ?? null
                )
              }
            />
            <HighlightCard
              label="Needs attention"
              entry={
                current.needsAttention &&
                current.needsAttention.id !== current.top?.id
                  ? current.needsAttention
                  : null
              }
              tone="warn"
              selected={selectedId === current.needsAttention?.id}
              onSelect={() =>
                setSelectedId((id) =>
                  id === current.needsAttention?.id
                    ? null
                    : current.needsAttention?.id ?? null
                )
              }
            />
          </div>

          <ul className="mt-5 space-y-2" role="list">
            {current.entries.map((entry, index) => {
              const isSelected = entry.id === selectedId;
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedId((id) =>
                        id === entry.id ? null : entry.id
                      )
                    }
                    aria-pressed={isSelected}
                    className={`flex w-full flex-col gap-2 rounded-lg border px-3 py-3 text-left transition sm:flex-row sm:items-center ${
                      isSelected
                        ? "border-green-700 bg-green-50 ring-2 ring-green-700/15"
                        : "border-stone-100 hover:border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <span className="mt-0.5 w-6 shrink-0 text-sm font-semibold text-stone-400">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-green-950">
                            {entry.name}
                          </p>
                          <Badge badge={entry.badge} />
                          {entry.estimated ? (
                            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-600">
                              Estimated insight
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-xs text-stone-500">
                          {entry.headlineMetric}
                        </p>
                      </div>
                    </div>
                    <div className="w-full sm:w-44">
                      <div className="mb-1 flex justify-between text-xs text-stone-500">
                        <span>Score</span>
                        <span className="font-semibold text-stone-800">
                          {entry.score.toFixed(0)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                        <div
                          className={`h-full rounded-full transition-all ${barColor(entry.badge)}`}
                          style={{ width: `${Math.max(entry.score, 4)}%` }}
                        />
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div
        ref={panelRef}
        className={`grid transition-all duration-300 ease-out ${
          selected
            ? "grid-rows-[1fr] opacity-100"
            : "pointer-events-none grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          {selected && current ? (
            <DetailPanel
              categoryTitle={current.title}
              entry={selected}
              onClose={() => setSelectedId(null)}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

function HighlightCard({
  label,
  entry,
  tone,
  selected,
  onSelect,
}: {
  label: string;
  entry: PerformanceEntry | null;
  tone: "good" | "warn";
  selected: boolean;
  onSelect: () => void;
}) {
  if (!entry) {
    return (
      <div className="rounded-lg border border-dashed border-stone-200 bg-stone-50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          {label}
        </p>
        <p className="mt-2 text-sm text-stone-500">
          No clear standout from current data.
        </p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-lg border px-4 py-3 text-left transition ${
        selected
          ? "border-green-700 bg-green-50 ring-2 ring-green-700/15"
          : tone === "good"
            ? "border-green-200 bg-green-50/50 hover:border-green-300"
            : "border-amber-200 bg-amber-50/50 hover:border-amber-300"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        {label}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-green-950">{entry.name}</p>
        <Badge badge={entry.badge} />
      </div>
      <p className="mt-1 text-xs text-stone-600">{entry.headlineMetric}</p>
    </button>
  );
}

function DetailPanel({
  categoryTitle,
  entry,
  onClose,
}: {
  categoryTitle: string;
  entry: PerformanceEntry;
  onClose: () => void;
}) {
  return (
    <div className="mt-1 space-y-4 rounded-xl border border-green-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            {categoryTitle}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-green-950">
            {entry.name}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge badge={entry.badge} />
            <span className="text-sm font-medium text-stone-700">
              Score {entry.score.toFixed(0)} / 100
            </span>
            {entry.estimated ? (
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-600">
                Includes estimated insights
              </span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Clear selection
        </button>
      </div>

      <div className="rounded-lg border border-stone-200 bg-stone-50/80 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Why this ranking
        </p>
        <p className="mt-2 text-sm leading-relaxed text-stone-700">
          {entry.why}
        </p>
      </div>

      <div>
        <p className="text-sm font-semibold text-green-950">
          Underlying metrics
        </p>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entry.metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-lg border border-stone-200 bg-stone-50/60 px-3 py-2.5"
            >
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                {metric.label}
                {metric.estimated ? " · estimated" : ""}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-stone-900">
                {metric.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function Badge({ badge }: { badge: PerformanceBadge }) {
  const styles: Record<PerformanceBadge, string> = {
    Excellent: "bg-green-100 text-green-800",
    Strong: "bg-emerald-100 text-emerald-900",
    Monitor: "bg-yellow-100 text-yellow-900",
    "Needs Attention": "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[badge]}`}
    >
      {badge}
    </span>
  );
}

function barColor(badge: PerformanceBadge) {
  if (badge === "Excellent") return "bg-green-700";
  if (badge === "Strong") return "bg-green-600";
  if (badge === "Monitor") return "bg-amber-500";
  return "bg-red-500";
}
