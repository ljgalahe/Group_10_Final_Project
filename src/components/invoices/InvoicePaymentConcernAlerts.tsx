"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/format";
import type { InvoiceListItem } from "@/lib/invoice-list";
import {
  buildCompanyPaymentConcerns,
  paymentConcernFlagLabel,
  type CompanyPaymentConcern,
  type PaymentConcernFlag,
} from "@/lib/invoice-payment-concerns";
import {
  chatHrefForOpsReschedule,
  notifyOpsToReschedule,
} from "@/lib/chat-demo";

function FlagBadge({ flag }: { flag: PaymentConcernFlag }) {
  const styles =
    flag === "consider_hold"
      ? "bg-rose-100 text-rose-900"
      : flag === "frequently_overdue"
        ? "bg-amber-100 text-amber-950"
        : "bg-orange-100 text-orange-900";
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${styles}`}
    >
      {paymentConcernFlagLabel(flag)}
    </span>
  );
}

function ConcernRow({
  concern,
  onSelectCompany,
}: {
  concern: CompanyPaymentConcern;
  onSelectCompany?: (companyName: string) => void;
}) {
  const router = useRouter();
  const [notifying, setNotifying] = useState(false);

  function notifyOps() {
    setNotifying(true);
    notifyOpsToReschedule({
      companyName: concern.companyName,
      overdueCount: concern.overdueCount,
      overdueBalance: concern.overdueBalance,
      maxDaysOverdue: concern.maxDaysOverdue,
    });
    router.push(chatHrefForOpsReschedule(concern.companyName));
  }

  return (
    <li className="rounded-lg border border-rose-200/80 bg-white px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-green-950">{concern.companyName}</p>
          <p className="mt-0.5 text-xs text-stone-500">
            {formatCurrency(concern.overdueBalance)} past due ·{" "}
            {concern.maxDaysOverdue} days late
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-1.5">
          {onSelectCompany ? (
            <button
              type="button"
              onClick={() => onSelectCompany(concern.companyName)}
              className="rounded-md border border-green-800 px-2.5 py-1 text-xs font-medium text-green-900 hover:bg-green-50"
            >
              Filter invoices
            </button>
          ) : null}
          <button
            type="button"
            onClick={notifyOps}
            disabled={notifying}
            className="rounded-md border border-rose-700 bg-rose-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-60"
          >
            {notifying ? "Sending…" : "Ask ops to reschedule"}
          </button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {concern.flags.map((flag) => (
          <FlagBadge key={flag} flag={flag} />
        ))}
      </div>
      {concern.reasons.length > 0 ? (
        <p className="mt-2 text-xs text-stone-600">{concern.reasons[0]}</p>
      ) : null}
    </li>
  );
}

export function InvoicePaymentConcernAlerts({
  invoices,
  asOfDate,
  onSelectCompany,
}: {
  invoices: InvoiceListItem[];
  asOfDate: string;
  onSelectCompany?: (companyName: string) => void;
}) {
  const concerns = useMemo(
    () => buildCompanyPaymentConcerns(invoices, asOfDate),
    [invoices, asOfDate]
  );
  const [open, setOpen] = useState(false);

  if (concerns.length === 0) return null;

  const holdCount = concerns.filter((c) =>
    c.flags.includes("consider_hold")
  ).length;

  const summary =
    concerns.length === 1
      ? "1 payment concern"
      : `${concerns.length} payment concerns`;

  const blurb =
    holdCount > 0
      ? "Some accounts may need visits paused until payment clears."
      : "Open past-due accounts that need a closer look.";

  return (
    <section className="rounded-xl border border-rose-200 bg-rose-50/90 shadow-sm">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left transition hover:bg-rose-100/50"
      >
        <div className="min-w-0">
          <h3 className="font-display text-2xl font-semibold tracking-tight text-rose-950 sm:text-3xl">
            {summary}
          </h3>
          <p className="mt-1.5 text-sm text-rose-900/80">{blurb}</p>
        </div>
        <span
          className={`mt-1 shrink-0 text-rose-800 transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open ? (
        <ul className="max-h-[28rem] space-y-3 overflow-y-auto border-t border-rose-200/80 px-4 py-4">
          {concerns.map((concern) => (
            <ConcernRow
              key={concern.companyName}
              concern={concern}
              onSelectCompany={onSelectCompany}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}
