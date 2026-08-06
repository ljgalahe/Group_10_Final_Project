import { formatStatusLabel, normalizeStatusKey } from "@/lib/status-labels";

export function SectionMark({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={`gs-mark ${className}`}>{children}</p>;
}

export function SectionHeading({
  mark,
  title,
  italic,
  description,
  action,
}: {
  mark?: string;
  title: string;
  /** @deprecated Prefer description for readable help text */
  italic?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  const help = description ?? italic;
  return (
    <div className="gs-section-head flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0 max-w-2xl">
        {mark ? <SectionMark className="mb-1">{mark}</SectionMark> : null}
        <h3 className="font-display text-xl font-semibold tracking-tight text-green-950 sm:text-2xl">
          {title}
        </h3>
        {help ? <p className="gs-help">{help}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  compact = false,
  valueClassName,
}: {
  label: string;
  value: string | number;
  hint?: string;
  compact?: boolean;
  valueClassName?: string;
}) {
  return (
    <div
      className={`border border-stone-200 bg-white ${
        compact ? "p-3.5" : "px-4 py-4"
      }`}
    >
      <p className="gs-mark">{label}</p>
      <p
        className={`gs-metric-value mt-1.5 text-green-950 ${
          compact ? "text-xl leading-snug" : "text-[1.65rem] leading-none"
        } ${valueClassName ?? ""}`}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1.5 text-xs leading-relaxed text-stone-600">{hint}</p>
      ) : null}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  kicker,
  action,
}: {
  title: string;
  description?: string;
  kicker?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="gs-page-header gs-reveal flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {kicker ? <SectionMark className="mb-1.5">{kicker}</SectionMark> : null}
        <h1 className="font-display text-3xl font-semibold tracking-tight text-green-950 sm:text-4xl">
          {title}
        </h1>
        {description ? <p className="gs-help mt-2">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const key = normalizeStatusKey(status);
  const colors: Record<string, string> = {
    active: "gs-complete-badge",
    retired: "border-stone-400 text-stone-600",
    draft: "border-stone-400 text-stone-600",
    upcoming: "border-sky-700/40 text-sky-950",
    sent: "border-stone-500 text-stone-800",
    due_now: "border-amber-800/40 text-amber-950",
    paid: "gs-complete-badge",
    overdue: "border-red-800/50 text-red-900",
    past_due: "border-red-800/50 text-red-900",
    partially_paid: "border-amber-800/40 text-amber-950",
    partial: "border-amber-800/40 text-amber-950",
    canceled: "border-stone-400 text-stone-600",
    voided: "border-stone-400 text-stone-600",
    applied: "gs-complete-badge",
    unapplied: "border-amber-800/40 text-amber-950",
    void: "border-stone-400 text-stone-600",
    disputed: "border-orange-800/40 text-orange-950",
    open: "border-stone-500 text-stone-800",
    "in progress": "border-amber-800/40 text-amber-950",
    in_progress: "border-amber-800/40 text-amber-950",
    resolved: "gs-complete-badge",
    scheduled: "border-amber-800/40 text-amber-950",
    on_hold: "border-red-800/50 text-red-900",
    "service hold": "border-red-800/50 text-red-900",
    completed: "gs-complete-badge",
    cancelled: "border-stone-400 text-stone-600",
    rescheduled: "border-orange-800/40 text-orange-950",
    closed: "border-stone-400 text-stone-600",
    approved: "gs-complete-badge",
    quoted: "border-champagne text-stone-800",
    routine: "border-stone-400 text-stone-600",
    high: "border-amber-800/40 text-amber-950",
    emergency: "border-red-800/50 text-red-900",
    seasonal: "border-stone-500 text-stone-800",
    pending: "border-amber-800/40 text-amber-950",
    waiting_for_approval: "border-amber-800/40 text-amber-950",
    pending_manager_approval: "border-amber-800/40 text-amber-950",
    pending_customer: "border-amber-800/40 text-amber-950",
    needs_review_and_signature: "border-amber-800/40 text-amber-950",
    needs_scheduling: "border-amber-800/40 text-amber-950",
    survey_scheduled: "border-sky-700/40 text-sky-950",
    budgeted: "border-stone-500 text-stone-800",
    new: "border-stone-500 text-stone-800",
    changes_requested: "border-orange-800/40 text-orange-950",
    current: "gs-complete-badge",
    expiring: "border-amber-800/40 text-amber-950",
    expired: "border-red-800/50 text-red-900",
    controls_breached: "border-red-800/50 text-red-900",
    unprofitable: "border-red-800/50 text-red-900",
    ready: "border-amber-800/40 text-amber-950",
    posted: "gs-complete-badge",
    ok: "gs-complete-badge",
    "low stock": "border-amber-800/40 text-amber-950",
  };

  return (
    <span
      className={`inline-flex border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] ${colors[key] ?? "border-stone-400 bg-transparent text-stone-700"}`}
    >
      {formatStatusLabel(status)}
    </span>
  );
}

export function EmptyState({
  message,
}: {
  message: React.ReactNode;
}) {
  return (
    <div className="border border-dashed border-stone-300 bg-white px-6 py-10 text-center">
      <p className="gs-help mx-auto">{message}</p>
    </div>
  );
}

export function Card({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div id={id} className={`gs-section-panel ${className}`}>
      {children}
    </div>
  );
}
