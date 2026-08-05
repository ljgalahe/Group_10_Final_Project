import { formatCurrency } from "@/lib/format";
import type {
  PerformanceBadge,
  ProfitTrend,
  RankedContract,
} from "@/lib/contract-rankings";

export function ContractRankings({
  mostProfitable,
  leastProfitable,
}: {
  mostProfitable: RankedContract[];
  leastProfitable: RankedContract[];
}) {
  return (
    <section className="mt-10 space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-green-950">
          Contract Rankings
        </h2>
        <p className="text-sm text-stone-500">
          Most and least profitable active contracts, with performance badges
          and margin trends from billed history.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RankingList
          title="Most Profitable Contracts"
          emptyMessage="No profitable contracts to rank yet."
          rows={mostProfitable}
          accent="best"
        />
        <RankingList
          title="Least Profitable Contracts"
          emptyMessage="No contracts available to rank."
          rows={leastProfitable}
          accent="worst"
        />
      </div>
    </section>
  );
}

function RankingList({
  title,
  emptyMessage,
  rows,
  accent,
}: {
  title: string;
  emptyMessage: string;
  rows: RankedContract[];
  accent: "best" | "worst";
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-200 bg-stone-50 px-4 py-3">
        <h3 className="text-base font-semibold text-green-950">{title}</h3>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-stone-500">{emptyMessage}</p>
      ) : (
        <ol className="divide-y divide-stone-100">
          {rows.map((row, index) => {
            const highlighted =
              (accent === "best" && row.isBest) ||
              (accent === "worst" && row.isWorst);

            return (
              <li
                key={`${accent}-${row.contractId}`}
                className={`px-4 py-4 ${
                  highlighted
                    ? accent === "best"
                      ? "bg-green-50/80 ring-1 ring-inset ring-green-200"
                      : "bg-red-50/70 ring-1 ring-inset ring-red-200"
                    : ""
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-600">
                        {index + 1}
                      </span>
                      <p className="font-medium text-stone-900">{row.title}</p>
                      {row.isBest ? (
                        <span className="rounded-full bg-green-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                          Best
                        </span>
                      ) : null}
                      {row.isWorst ? (
                        <span className="rounded-full bg-red-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                          Worst
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-stone-500">
                      {row.customerName}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <TrendIndicator trend={row.trend} />
                    <PerformanceBadgePill badge={row.badge} />
                  </div>
                </div>

                <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-stone-400">Revenue</dt>
                    <dd className="font-medium text-stone-800">
                      {formatCurrency(row.revenue)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-stone-400">Margin %</dt>
                    <dd className="font-medium text-stone-800">
                      {row.marginPct.toFixed(1)}%
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-stone-400">Total Profit</dt>
                    <dd
                      className={`font-semibold ${
                        row.margin >= 0 ? "text-green-900" : "text-red-700"
                      }`}
                    >
                      {formatCurrency(row.margin)}
                    </dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function TrendIndicator({ trend }: { trend: ProfitTrend }) {
  const styles: Record<ProfitTrend, string> = {
    up: "bg-green-100 text-green-800",
    down: "bg-red-100 text-red-800",
    stable: "bg-stone-100 text-stone-700",
  };
  const labels: Record<ProfitTrend, string> = {
    up: "Up",
    down: "Down",
    stable: "Stable",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[trend]}`}
    >
      <TrendIcon trend={trend} />
      {labels[trend]}
    </span>
  );
}

function TrendIcon({ trend }: { trend: ProfitTrend }) {
  if (trend === "up") {
    return (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
        <path d="M8 3.2 12.8 9H9.5v3.8H6.5V9H3.2L8 3.2Z" />
      </svg>
    );
  }
  if (trend === "down") {
    return (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
        <path d="M8 12.8 3.2 7h3.3V3.2h3V7h3.3L8 12.8Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M3 7.25h10v1.5H3v-1.5Z" />
    </svg>
  );
}

function PerformanceBadgePill({ badge }: { badge: PerformanceBadge }) {
  const styles: Record<PerformanceBadge, string> = {
    top_performer: "bg-green-100 text-green-800",
    strong: "bg-emerald-100 text-emerald-900",
    fair: "bg-yellow-100 text-yellow-900",
    needs_attention: "bg-red-100 text-red-800",
  };
  const labels: Record<PerformanceBadge, string> = {
    top_performer: "Top Performer",
    strong: "Strong",
    fair: "Fair",
    needs_attention: "Needs Attention",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[badge]}`}
    >
      {labels[badge]}
    </span>
  );
}
