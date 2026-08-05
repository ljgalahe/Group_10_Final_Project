import { formatCurrency } from "@/lib/format";
import type {
  ContractRecommendations,
  RecommendationIcon,
  RecommendationPriority,
} from "@/lib/manager-recommendations";

export function ManagerRecommendations({
  rows,
}: {
  rows: ContractRecommendations[];
}) {
  return (
    <section className="mt-10 space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-green-950">
          Manager Recommendations
        </h2>
        <p className="text-sm text-stone-500">
          Practical next steps for each contract based on margin, cost mix, and
          detected profit leaks.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white p-6 text-sm text-stone-500 shadow-sm">
          No contract recommendations available yet.
        </div>
      ) : (
        <div className="space-y-5">
          {rows.map((row) => (
            <article
              key={row.contractId}
              className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-green-950">
                    {row.title}
                  </h3>
                  <p className="text-sm text-stone-500">{row.customerName}</p>
                </div>
                <p className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
                  Margin {row.marginPct.toFixed(1)}% · Profit{" "}
                  {formatCurrency(row.margin)}
                </p>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {row.recommendations.map((rec) => (
                  <RecommendationCard key={rec.id} {...rec} />
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function RecommendationCard({
  title,
  detail,
  priority,
  icon,
}: {
  title: string;
  detail: string;
  priority: RecommendationPriority;
  icon: RecommendationIcon;
}) {
  const priorityStyles: Record<RecommendationPriority, string> = {
    high: "border-red-200 bg-red-50/70",
    medium: "border-yellow-200 bg-yellow-50/70",
    low: "border-green-200 bg-green-50/60",
  };
  const badgeStyles: Record<RecommendationPriority, string> = {
    high: "bg-red-100 text-red-800",
    medium: "bg-yellow-100 text-yellow-900",
    low: "bg-green-100 text-green-800",
  };
  const labels: Record<RecommendationPriority, string> = {
    high: "High priority",
    medium: "Medium priority",
    low: "Low priority",
  };

  return (
    <div
      className={`flex gap-3 rounded-xl border p-4 ${priorityStyles[priority]}`}
    >
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-green-900 shadow-sm">
        <RecommendationIconGlyph icon={icon} />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-semibold text-stone-900">{title}</h4>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeStyles[priority]}`}
          >
            {labels[priority]}
          </span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-stone-600">{detail}</p>
      </div>
    </div>
  );
}

function RecommendationIconGlyph({ icon }: { icon: RecommendationIcon }) {
  const common = "h-4 w-4";

  if (icon === "labor") {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" className={common} aria-hidden>
        <path d="M10 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM4.5 18a5.5 5.5 0 1 1 11 0H4.5Z" />
      </svg>
    );
  }
  if (icon === "visits") {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" className={common} aria-hidden>
        <path d="M6 2a1 1 0 0 0-1 1v1H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1V3a1 1 0 1 0-2 0v1H7V3a1 1 0 0 0-1-1Zm-2 7h12v7H4V9Z" />
      </svg>
    );
  }
  if (icon === "price" || icon === "renewal") {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" className={common} aria-hidden>
        <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm.75 4.5a.75.75 0 0 0-1.5 0V7H8a.75.75 0 0 0 0 1.5h2.5V10H9A1.75 1.75 0 0 0 9 13.5h.25v.75a.75.75 0 0 0 1.5 0V13.5H12a.75.75 0 0 0 0-1.5h-2.5V10H11A1.75 1.75 0 0 0 11 6.5h-.25V6.5Z" />
      </svg>
    );
  }
  if (icon === "materials") {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" className={common} aria-hidden>
        <path d="M3 5.5 10 2l7 3.5v9L10 18l-7-3.5v-9Zm2 1.2v6.5l5 2.5 5-2.5V6.7L10 4.2 5 6.7Z" />
      </svg>
    );
  }
  if (icon === "scope") {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" className={common} aria-hidden>
        <path d="M4 3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H4Zm2 3h8v1.5H6V6Zm0 3.5h8V11H6V9.5Zm0 3.5h5V14H6v-1Z" />
      </svg>
    );
  }
  if (icon === "equipment") {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" className={common} aria-hidden>
        <path d="M11.5 2a1 1 0 0 1 .8.4l1.2 1.6H16a1 1 0 0 1 1 1V7h-1.5l-1.2 7.2A2 2 0 0 1 12.3 16H7.7a2 2 0 0 1-2-1.8L4.5 7H3V5a1 1 0 0 1 1-1h2.5L7.7 2.4A1 1 0 0 1 8.5 2h3ZM8 9.5A2 2 0 1 0 12 9.5 2 2 0 0 0 8 9.5Z" />
      </svg>
    );
  }
  if (icon === "star") {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" className={common} aria-hidden>
        <path d="M10 2.5 12.4 7l5 .7-3.6 3.5.9 4.9L10 13.8 5.3 16.1l.9-4.9L2.6 7.7l5-.7L10 2.5Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={common} aria-hidden>
      <path d="M10 2a6 6 0 0 1 6 6v1.1c0 .5.2 1 .5 1.4l.8 1.1A1.5 1.5 0 0 1 16.1 14H3.9a1.5 1.5 0 0 1-1.2-2.4l.8-1.1c.3-.4.5-.9.5-1.4V8a6 6 0 0 1 6-6Zm-2 14a2 2 0 1 0 4 0H8Z" />
    </svg>
  );
}
