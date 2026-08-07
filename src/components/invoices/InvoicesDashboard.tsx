"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { InvoiceStatusBadge } from "@/app/invoices/components/InvoiceStatusBadge";
import { InvoicePaymentConcernAlerts } from "@/components/invoices/InvoicePaymentConcernAlerts";
import { PostJournalEntryButton } from "@/components/PostJournalEntryButton";
import { SectionHeading, StatusBadge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import type { InvoiceListItem } from "@/lib/invoice-list";
import type { JournalStatus } from "@/lib/journal";
import { invoiceJournalReadyReason } from "@/lib/journal";

type StatusFilter =
  | "all"
  | "paid"
  | "overdue"
  | "sent"
  | "not_sent";

function matchesStatus(invoice: InvoiceListItem, filter: StatusFilter) {
  if (filter === "all") return true;
  if (filter === "paid") return invoice.paid;
  if (filter === "overdue") return invoice.overdue;
  if (filter === "sent") return invoice.sent;
  if (filter === "not_sent") return invoice.notSent;
  return true;
}

type TrackerCategory = "paid" | "not_paid" | "overdue";

const TRACKER_COLORS = {
  paid: "#166534",
  not_paid: "#d97706",
  overdue: "#dc2626",
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

function InvoicePaidTracker({ invoices }: { invoices: InvoiceListItem[] }) {
  const [selected, setSelected] = useState<TrackerCategory>("paid");

  const stats = useMemo(() => {
    let paid = 0;
    let overdue = 0;
    let notPaid = 0;
    let sent = 0;
    let notSent = 0;
    for (const invoice of invoices) {
      if (invoice.paid) paid += 1;
      if (invoice.overdue) overdue += 1;
      if (invoice.notPaid) notPaid += 1;
      if (invoice.sent) sent += 1;
      if (invoice.notSent) notSent += 1;
    }
    const total = invoices.length;
    const pct = (n: number) =>
      total === 0 ? 0 : Math.round((n / total) * 100);
    // Mutually exclusive wedges for the circle (sum ≈ 100%).
    const openCurrent = Math.max(0, notPaid - overdue);
    return {
      paid,
      overdue,
      notPaid,
      sent,
      notSent,
      total,
      paidPct: pct(paid),
      notPaidPct: pct(notPaid),
      overduePct: pct(overdue),
      sentPct: pct(sent),
      notSentPct: pct(notSent),
      paidShare: total === 0 ? 0 : paid / total,
      overdueShare: total === 0 ? 0 : overdue / total,
      openShare: total === 0 ? 0 : openCurrent / total,
    };
  }, [invoices]);

  const center =
    selected === "paid"
      ? { pct: stats.paidPct, label: "paid" }
      : selected === "not_paid"
        ? { pct: stats.notPaidPct, label: "not paid" }
        : { pct: stats.overduePct, label: "overdue" };

  const slices = useMemo(() => {
    const items: {
      key: TrackerCategory;
      color: string;
      start: number;
      end: number;
    }[] = [];
    let angle = 0;
    const add = (key: TrackerCategory, share: number, color: string) => {
      if (share <= 0) return;
      const sweep = share * 360;
      items.push({ key, color, start: angle, end: angle + sweep });
      angle += sweep;
    };
    add("paid", stats.paidShare, TRACKER_COLORS.paid);
    add("not_paid", stats.openShare, TRACKER_COLORS.not_paid);
    add("overdue", stats.overdueShare, TRACKER_COLORS.overdue);
    return items;
  }, [stats.paidShare, stats.openShare, stats.overdueShare]);

  const labels = [
    {
      key: "paid" as const,
      title: "Paid",
      hint: "Fully settled",
      count: stats.paid,
      pct: stats.paidPct,
      box: "border-green-200 bg-green-50",
      value: "text-green-900",
    },
    {
      key: "not_paid" as const,
      title: "Not Paid",
      hint: "Open balance",
      count: stats.notPaid,
      pct: stats.notPaidPct,
      box: "border-amber-200 bg-amber-50",
      value: "text-amber-900",
    },
    {
      key: "overdue" as const,
      title: "Past Due",
      hint: "Past due with balance",
      count: stats.overdue,
      pct: stats.overduePct,
      box: "border-red-200 bg-red-50",
      value: "text-red-800",
    },
  ];

  const sliceTitle = (key: TrackerCategory) => {
    if (key === "paid") return "Paid";
    if (key === "not_paid") return "Not Paid";
    return "Past Due";
  };

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
          aria-label="Invoice status breakdown. Click a segment to see its percentage."
        >
          <circle cx={cx} cy={cy} r={rOut} fill="#e7e5e4" />
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
                <title>{sliceTitle(slice.key)}</title>
              </path>
            );
          })}
          <circle cx={cx} cy={cy} r={rIn - 1} fill="white" />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="gs-metric-value text-2xl text-green-950">{center.pct}%</p>
          <p className="text-xs text-stone-500">{center.label}</p>
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
              className={`flex w-full items-start justify-between gap-4 rounded-lg border px-3 py-2 text-left transition ${label.box} ${
                active ? "ring-2 ring-green-800/30" : "hover:brightness-[0.98]"
              }`}
            >
              <div className="flex items-start gap-2">
                <span
                  className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: TRACKER_COLORS[label.key] }}
                  aria-hidden
                />
                <div>
                  <p className="font-medium text-stone-800">{label.title}</p>
                  <p className="text-xs text-stone-500">
                    {label.hint} · {label.pct}%
                  </p>
                </div>
              </div>
              <p className={`font-semibold ${label.value}`}>{label.count}</p>
            </button>
          );
        })}

        <div className="mt-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Invoice status
          </p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div>
              <p className="text-lg font-semibold text-stone-900">
                {stats.sentPct}%
              </p>
              <p className="text-xs text-stone-500">sent</p>
              <p className="mt-0.5 text-xs text-stone-600">
                {stats.sent}/{stats.total}
              </p>
            </div>
            <div>
              <p className="text-lg font-semibold text-stone-900">
                {stats.notSentPct}%
              </p>
              <p className="text-xs text-stone-500">drafted / not sent</p>
              <p className="mt-0.5 text-xs text-stone-600">
                {stats.notSent}/{stats.total}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function InvoicesDashboard({
  invoices,
  asOfDate,
  journalStates = {},
  showJournal = false,
  isAccountant = false,
  initialCompany = "overall",
  initialStatus = "all",
}: {
  invoices: InvoiceListItem[];
  asOfDate: string;
  journalStates?: Record<string, JournalStatus | null>;
  showJournal?: boolean;
  isAccountant?: boolean;
  initialCompany?: string;
  initialStatus?: StatusFilter;
}) {
  const [company, setCompany] = useState(initialCompany);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus);

  const companies = useMemo(
    () =>
      [...new Set(invoices.map((i) => i.customerName).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b)
      ),
    [invoices]
  );

  const companyFiltered = useMemo(() => {
    if (company === "overall") return invoices;
    return invoices.filter((i) => i.customerName === company);
  }, [invoices, company]);

  const listFiltered = useMemo(() => {
    return [...companyFiltered]
      .filter((invoice) => matchesStatus(invoice, statusFilter))
      .sort((a, b) => {
        if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
        if (a.notPaid || b.notPaid) {
          return a.due_date.localeCompare(b.due_date);
        }
        return b.issue_date.localeCompare(a.issue_date);
      });
  }, [companyFiltered, statusFilter]);

  return (
    <div className="gs-stack">
      <div className="gs-index-bar">
        <label className="gs-index-field max-w-md flex-1">
          <span>Filter by customer</span>
          <select
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          >
            <option value="overall">Overall — all customers</option>
            {companies.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section className="gs-section">
        <SectionHeading
          mark="Collections"
          title="Invoice Tracker"
          description={
            company === "overall"
              ? "Paid rate and collection status across all customers. Click a slice for counts."
              : `Paid rate and collection status for ${company}. Click a slice for counts.`
          }
        />
        {companyFiltered.length === 0 ? (
          <p className="gs-help">No invoices for this customer.</p>
        ) : (
          <InvoicePaidTracker invoices={companyFiltered} />
        )}
      </section>

      <InvoicePaymentConcernAlerts
        invoices={invoices}
        asOfDate={asOfDate}
        onSelectCompany={(name) => {
          setCompany(name);
          setStatusFilter("overdue");
        }}
      />

      <section className="gs-section">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            mark="Ledger"
            title="Invoices"
            description="Filter by payment and send status for the selected customer."
          />
          <label className="gs-index-field sm:w-56">
            <span>Status</span>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as StatusFilter)
              }
            >
              <option value="all">All statuses</option>
              <option value="paid">Paid</option>
              <option value="overdue">Past Due</option>
              <option value="sent">Sent</option>
              <option value="not_sent">Not sent</option>
            </select>
          </label>
        </div>

        {listFiltered.length === 0 ? (
          <p className="gs-help">
            No invoices match this customer and status filter.
          </p>
        ) : (
          <div className="mt-2 max-h-[32rem] overflow-auto border-t border-stone-200">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--cream)] text-left">
                <tr className="border-b border-stone-200">
                  <th className="px-3 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-stone-500">
                    Invoice #
                  </th>
                  <th className="px-3 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-stone-500">
                    Customer
                  </th>
                  <th className="px-3 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-stone-500">
                    Contract
                  </th>
                  <th className="px-3 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-stone-500">
                    Issue Date
                  </th>
                  <th className="px-3 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-stone-500">
                    Due Date
                  </th>
                  <th className="px-3 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-stone-500">
                    Total
                  </th>
                  <th className="px-3 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-stone-500">
                    {showJournal ? "Outstanding Balance" : "Balance"}
                  </th>
                  <th className="px-3 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-stone-500">
                    Status
                  </th>
                  {showJournal ? (
                    <th className="px-3 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-stone-500">
                      Journal
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {listFiltered.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="gs-list-row border-t border-stone-200/80"
                  >
                    <td className="px-3 py-3">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="gs-text-link font-medium"
                      >
                        {invoice.invoice_number}
                      </Link>
                    </td>
                    <td className="px-3 py-3">{invoice.customerName}</td>
                    <td className="px-3 py-3">{invoice.contractTitle}</td>
                    <td className="px-3 py-3">
                      {formatDate(invoice.issue_date)}
                    </td>
                    <td className="px-3 py-3">
                      {formatDate(invoice.due_date)}
                    </td>
                    <td className="px-3 py-3">
                      {formatCurrency(invoice.total)}
                    </td>
                    <td className="px-3 py-3">
                      {formatCurrency(invoice.balance)}
                    </td>
                    <td className="px-3 py-3">
                      {showJournal ? (
                        <InvoiceStatusBadge
                          invoice={invoice}
                          asOfDate={asOfDate}
                          displayStatus={invoice.displayStatus}
                        />
                      ) : (
                        <StatusBadge status={invoice.displayStatus} />
                      )}
                    </td>
                    {showJournal ? (
                      <td className="px-3 py-3">
                        <PostJournalEntryButton
                          source="invoice"
                          sourceId={invoice.id}
                          journalStatus={journalStates[invoice.id] ?? null}
                          disabledReason={
                            invoiceJournalReadyReason(invoice.status) ??
                            undefined
                          }
                          readOnly={!isAccountant}
                        />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
