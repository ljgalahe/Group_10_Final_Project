export function StatCard({
  label,
  value,
  hint,
  compact = false,
}: {
  label: string;
  value: string | number;
  hint?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-stone-200 bg-white shadow-sm ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <p className="text-sm font-medium text-stone-500">{label}</p>
      <p
        className={`mt-1 font-bold text-green-900 ${
          compact ? "text-xl leading-snug" : "mt-2 text-3xl"
        }`}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-stone-400">{hint}</p> : null}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-green-950">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-stone-600">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    draft: "bg-gray-100 text-gray-800",
    sent: "bg-blue-100 text-blue-800",
    paid: "bg-green-100 text-green-800",
    overdue: "bg-red-100 text-red-800",
    disputed: "bg-orange-100 text-orange-900",
    partial: "bg-amber-100 text-amber-900",
    open: "bg-blue-100 text-blue-800",
    "in progress": "bg-yellow-100 text-yellow-800",
    resolved: "bg-green-100 text-green-800",
    scheduled: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-800",
    rescheduled: "bg-orange-100 text-orange-800",
    approved: "bg-green-100 text-green-800",
    quoted: "bg-purple-100 text-purple-800",
    routine: "bg-stone-100 text-stone-700",
    high: "bg-amber-100 text-amber-900",
    emergency: "bg-red-100 text-red-800",
    seasonal: "bg-blue-100 text-blue-800",
    pending: "bg-amber-100 text-amber-900",
    current: "bg-green-100 text-green-800",
    expiring: "bg-amber-100 text-amber-900",
    expired: "bg-red-100 text-red-800",
    controls_breached: "bg-red-100 text-red-800",
    unprofitable: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-800",
    ready: "bg-amber-100 text-amber-900",
    posted: "bg-green-100 text-green-800",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-800"}`}
    >
      {status
        .replaceAll("_", " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())}
    </span>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center text-stone-500">
      {message}
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
    <div
      id={id}
      className={`rounded-xl border border-stone-200 bg-white p-6 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}
