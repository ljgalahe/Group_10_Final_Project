"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  CategoryLeaderboard,
  PerformanceBadge,
  PerformanceCategory,
  PerformanceEntry,
} from "@/lib/company-performance";
import { PERFORMANCE_BADGE_GUIDE } from "@/lib/company-performance";

const CATEGORY_ORDER: PerformanceCategory[] = [
  "crew",
  "equipment",
  "customer",
  "contract",
];

function CategoryIcon({ category }: { category: PerformanceCategory }) {
  const common = "h-5 w-5";
  switch (category) {
    case "crew":
      return (
        <svg className={common} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM2.5 16.5a5.5 5.5 0 0111 0 .75.75 0 01-.75.75h-9.5a.75.75 0 01-.75-.75zM14.5 8a2 2 0 100-4 2 2 0 000 4zM13 16.5c0-.53.07-1.04.2-1.53a4.001 4.001 0 014.55 2.28.75.75 0 01-.69 1h-3.31A.75.75 0 0113 16.5z" />
        </svg>
      );
    case "equipment":
      return (
        <svg className={common} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M11.49 3.17a.75.75 0 01.64.28l5 6.5a.75.75 0 01-.1 1.02l-7.5 6.5a.75.75 0 01-1.12-.18l-3-5.5A.75.75 0 015.9 11h2.56l1.5-2.5H7.4a.75.75 0 01-.64-1.12l3.5-5.5a.75.75 0 011.23-.01z"
            clipRule="evenodd"
          />
        </svg>
      );
    case "customer":
      return (
        <svg className={common} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M10 2a6 6 0 00-6 6c0 4.5 6 10 6 10s6-5.5 6-10a6 6 0 00-6-6zm0 8.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"
            clipRule="evenodd"
          />
        </svg>
      );
    case "contract":
    default:
      return (
        <svg className={common} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M4.5 2.75A.75.75 0 015.25 2h9.5a.75.75 0 01.75.75v14.5a.75.75 0 01-1.14.64L12 16.56l-2.36 1.33a.75.75 0 01-.64 0L6.64 16.56 4.14 17.9A.75.75 0 013.75 17.25V2.75z" />
        </svg>
      );
  }
}

export function CompanyPerformanceLeaderboard({
  categories,
  initialCategory,
}: {
  categories: CategoryLeaderboard[];
  initialCategory?: PerformanceCategory;
}) {
  const byKey = useMemo(() => {
    return new Map(categories.map((c) => [c.category, c]));
  }, [categories]);

  const available = useMemo(
    () =>
      CATEGORY_ORDER.filter((key) => {
        const cat = byKey.get(key);
        return cat && cat.entries.length > 0;
      }),
    [byKey]
  );

  const [selectedCategory, setSelectedCategory] =
    useState<PerformanceCategory | null>(() =>
      initialCategory && available.includes(initialCategory)
        ? initialCategory
        : null
    );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<"score" | "name">("score");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialCategory && available.includes(initialCategory)) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory, available]);

  useEffect(() => {
    setSelectedId(null);
    setSortMode("score");
  }, [selectedCategory]);

  useEffect(() => {
    if (!selectedCategory || !panelRef.current) return;
    panelRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedCategory]);

  const current =
    selectedCategory != null ? byKey.get(selectedCategory) ?? null : null;

  const rankedEntries = useMemo(() => {
    if (!current) return [];
    const list = [...current.entries];
    if (sortMode === "name") {
      return list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.name.localeCompare(b.name);
    });
  }, [current, sortMode]);

  if (available.length === 0) {
    return (
      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-green-950">
          Company Performance Overview
        </h2>
        <p className="mt-2 text-sm text-stone-500">
          Not enough operational data yet to rank crew, equipment, customers, or
          contracts.
        </p>
      </section>
    );
  }

  function toggleCategory(key: PerformanceCategory) {
    setSelectedCategory((currentKey) => (currentKey === key ? null : key));
  }

  return (
    <section id="company-performance" className="scroll-mt-24 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-green-950">
            Company Performance Overview
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Spot highs and lows at a glance. Open one category for full analysis.
          </p>
        </div>
        <p
          className="max-w-xs text-right text-[11px] leading-snug text-stone-400"
          title={PERFORMANCE_BADGE_GUIDE}
        >
          Labels: Excellent · Strong · Monitor · Needs Attention
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {available.map((key) => {
          const cat = byKey.get(key)!;
          const isSelected = selectedCategory === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleCategory(key)}
              aria-pressed={isSelected}
              className={`rounded-xl border bg-white p-4 text-left shadow-sm transition ${
                isSelected
                  ? "border-green-700 ring-2 ring-green-700/20"
                  : "border-stone-200 hover:border-green-300 hover:bg-green-50/30"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-green-800 text-white">
                    <CategoryIcon category={key} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-green-950">
                      {cat.title}
                    </p>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {cat.description}
                    </p>
                  </div>
                </div>
                <ScoreInfo tip={cat.scoreGuide} />
              </div>

              <div className="mt-4 space-y-3">
                <PerformerLine
                  label="Highest"
                  entry={cat.top}
                  tone="good"
                />
                <PerformerLine
                  label="Lowest"
                  entry={
                    cat.needsAttention &&
                    cat.needsAttention.id !== cat.top?.id
                      ? cat.needsAttention
                      : null
                  }
                  tone="warn"
                />
              </div>

              <p className="mt-4 text-xs font-semibold text-green-800">
                {isSelected ? "Hide analysis" : "View full analysis"} →
              </p>
            </button>
          );
        })}
      </div>

      <div
        ref={panelRef}
        className={`grid transition-all duration-300 ease-out ${
          current
            ? "grid-rows-[1fr] opacity-100"
            : "pointer-events-none grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          {current ? (
            <CategoryDetailPanel
              category={current}
              entries={rankedEntries}
              selectedId={selectedId}
              sortMode={sortMode}
              onSortModeChange={setSortMode}
              onSelectEntry={(id) =>
                setSelectedId((currentId) => (currentId === id ? null : id))
              }
              onClose={() => {
                setSelectedCategory(null);
                setSelectedId(null);
              }}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

function PerformerLine({
  label,
  entry,
  tone,
}: {
  label: string;
  entry: PerformanceEntry | null;
  tone: "good" | "warn";
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        tone === "good"
          ? "border-green-100 bg-green-50/50"
          : "border-amber-100 bg-amber-50/40"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
        {label}
      </p>
      {entry ? (
        <>
          <p className="mt-1 truncate text-sm font-semibold text-green-950">
            {entry.name}
          </p>
          <p className="mt-0.5 text-xs text-stone-600">
            Score {entry.score.toFixed(0)} — {entry.badge}
            {entry.estimated ? " · Estimated" : ""}
          </p>
        </>
      ) : (
        <p className="mt-1 text-xs text-stone-500">No clear standout yet.</p>
      )}
    </div>
  );
}

function ScoreInfo({ tip }: { tip: string }) {
  return (
    <span
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-stone-200 text-[11px] font-semibold text-stone-500"
      title={tip}
      aria-label={tip}
    >
      i
    </span>
  );
}

function CategoryDetailPanel({
  category,
  entries,
  selectedId,
  sortMode,
  onSortModeChange,
  onSelectEntry,
  onClose,
}: {
  category: CategoryLeaderboard;
  entries: PerformanceEntry[];
  selectedId: string | null;
  sortMode: "score" | "name";
  onSortModeChange: (mode: "score" | "name") => void;
  onSelectEntry: (id: string) => void;
  onClose: () => void;
}) {
  const selected =
    entries.find((entry) => entry.id === selectedId) ?? null;

  return (
    <div className="mt-1 rounded-xl border border-green-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-green-950">
              {category.title}
            </h3>
            <ScoreInfo tip={category.scoreGuide} />
          </div>
          <p className="mt-1 text-sm text-stone-500">{category.description}</p>
          <p className="mt-2 text-xs text-stone-400" title={PERFORMANCE_BADGE_GUIDE}>
            {PERFORMANCE_BADGE_GUIDE}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-stone-500">
            Sort
            <select
              value={sortMode}
              onChange={(e) =>
                onSortModeChange(e.target.value as "score" | "name")
              }
              className="rounded-md border border-stone-300 bg-white px-2 py-1 text-sm text-stone-800"
            >
              <option value="score">Score</option>
              <option value="name">Name</option>
            </select>
          </label>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Close analysis
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <PerformerLine label="Highest" entry={category.top} tone="good" />
        <PerformerLine
          label="Lowest"
          entry={
            category.needsAttention &&
            category.needsAttention.id !== category.top?.id
              ? category.needsAttention
              : null
          }
          tone="warn"
        />
      </div>

      <ul className="mt-5 max-h-[28rem] space-y-2 overflow-y-auto pr-1" role="list">
        {entries.map((entry, index) => {
          const isSelected = entry.id === selectedId;
          return (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onSelectEntry(entry.id)}
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
                          Estimated
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {entry.headlineMetric}
                    </p>
                    <p className="mt-1 line-clamp-1 text-xs text-stone-500">
                      {entry.why}
                    </p>
                  </div>
                </div>
                <div className="w-full sm:w-40">
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

      <div
        className={`grid transition-all duration-300 ease-out ${
          selected
            ? "mt-4 grid-rows-[1fr] opacity-100"
            : "pointer-events-none grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          {selected ? (
            <EntryMetricsPanel
              entry={selected}
              onClose={() => onSelectEntry(selected.id)}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function EntryMetricsPanel({
  entry,
  onClose,
}: {
  entry: PerformanceEntry;
  onClose: () => void;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-green-950">{entry.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge badge={entry.badge} />
            <span className="text-xs text-stone-600">
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
          className="text-xs font-medium text-stone-600 hover:underline"
        >
          Clear selection
        </button>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-stone-700">{entry.why}</p>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {entry.metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-lg border border-stone-200 bg-white px-3 py-2"
          >
            <dt className="text-[11px] font-medium uppercase tracking-wide text-stone-500">
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
  );
}

function Badge({ badge }: { badge: PerformanceBadge }) {
  const styles: Record<PerformanceBadge, string> = {
    Excellent: "bg-green-100 text-green-800",
    Strong: "bg-emerald-100 text-emerald-900",
    Monitor: "bg-amber-100 text-amber-900",
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
