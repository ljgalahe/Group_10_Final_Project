import { SERVICE_HOLD_THRESHOLD_DAYS } from "@/lib/service-hold";

export function ServiceHoldBanner({
  customerName,
  reason,
  daysOverdue,
  oldestInvoiceNumber,
}: {
  customerName?: string;
  reason?: string;
  daysOverdue?: number;
  oldestInvoiceNumber?: string;
}) {
  const detail =
    reason ??
    (oldestInvoiceNumber && daysOverdue != null
      ? `${customerName ? `${customerName}: ` : ""}Invoice ${oldestInvoiceNumber} is ${daysOverdue} days overdue (threshold ${SERVICE_HOLD_THRESHOLD_DAYS} days). New service is blocked until the past-due balance is cleared.`
      : `This account is on Service Hold because one or more invoices are ${SERVICE_HOLD_THRESHOLD_DAYS}+ days overdue. Future visits are On Hold and new crew assignments are blocked until payment brings the account current.`);

  return (
    <div
      role="alert"
      className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900"
    >
      <div className="flex flex-wrap items-start gap-2">
        <span
          className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-[11px] font-bold text-white"
          aria-hidden
        >
          !
        </span>
        <div className="min-w-0">
          <p className="font-semibold">Service Hold — automatic credit hold</p>
          <p className="mt-1 leading-relaxed text-red-800">{detail}</p>
        </div>
      </div>
    </div>
  );
}

export function ServiceHoldBadge({
  onHold,
}: {
  onHold: boolean;
}) {
  if (onHold) {
    return (
      <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
        Service Hold
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
      Active
    </span>
  );
}
