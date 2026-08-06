"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  chatHrefForApManagerReminder,
  messageManagerAboutApDuePayments,
  messageManagerAboutApPaymentApproval,
} from "@/lib/chat-demo";
import {
  bucketOpenApInvoices,
  bucketTotal,
  daysBetween,
  discountSavings,
  discountsAvailableThisMonth,
  filterByCategory,
  openApByCategory,
  openApInvoices,
  openDiscountWindow,
  upcomingPayments,
} from "./ap-aging";
import { computeCashConversionCycle, computeDpo } from "./ap-kpis";
import {
  AP_PAYMENTS_UPDATED_EVENT,
  apApprovalMarker,
  applyPaidApOverrides,
  getApPaymentGateStatus,
  markApInvoicePaid,
  payApInvoiceIfApproved,
  requestApPaymentApproval,
  type ApPaymentGateStatus,
} from "./ap-payments-store";
import {
  AP_CATEGORIES,
  type ApAgingBucketKey,
  type ApCategory,
  type ApInvoice,
} from "./ap-types";

const AGING_BUCKETS: {
  key: ApAgingBucketKey;
  title: string;
  accent: string;
  amountClass: string;
}[] = [
  {
    key: "current",
    title: "Current",
    accent: "border-stone-200 bg-white",
    amountClass: "text-stone-900",
  },
  {
    key: "1-30",
    title: "1–30 Days",
    accent: "border-amber-200 bg-amber-50/60",
    amountClass: "text-amber-900",
  },
  {
    key: "31-60",
    title: "31–60 Days",
    accent: "border-orange-200 bg-orange-50/60",
    amountClass: "text-orange-900",
  },
  {
    key: "61-90",
    title: "61–90 Days",
    accent: "border-orange-300 bg-orange-50/80",
    amountClass: "text-orange-950",
  },
  {
    key: "90+",
    title: "90+ Days",
    accent: "border-red-200 bg-red-50/70",
    amountClass: "text-red-900",
  },
];

const CATEGORY_COLORS: Record<ApCategory, string> = {
  Materials: "#166534",
  "Equipment Financing": "#854d0e",
  Fuel: "#9a3412",
  Insurance: "#1e3a5f",
  Subscriptions: "#57534e",
};

const ALL = "__all__";

function PaymentGateBadge({ status }: { status: ApPaymentGateStatus }) {
  if (status === "awaiting_approval") {
    return (
      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900">
        Awaiting approval
      </span>
    );
  }
  if (status === "approved") {
    return (
      <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800">
        Approved
      </span>
    );
  }
  return (
    <span className="rounded bg-stone-100 px-1.5 py-0.5 text-xs font-medium text-stone-600">
      Open
    </span>
  );
}

function SummaryKpi({
  title,
  value,
  hint,
  selected,
  onSelect,
}: {
  title: string;
  value: string;
  hint: string;
  selected?: boolean;
  onSelect?: () => void;
}) {
  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={`rounded-xl border border-green-200 bg-green-50/70 p-4 text-left shadow-sm transition ${
          selected
            ? "ring-2 ring-green-800 ring-offset-2"
            : "hover:brightness-[0.98]"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-stone-800">{title}</h3>
          <span className="text-xs text-stone-500">
            {selected ? "Hide" : "View"}
          </span>
        </div>
        <p className="mt-3 text-2xl font-bold tracking-tight text-green-950">
          {value}
        </p>
        <p className="mt-1 text-sm text-stone-600">{hint}</p>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-green-200 bg-green-50/70 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-stone-800">{title}</h3>
      <p className="mt-3 text-2xl font-bold tracking-tight text-green-950">
        {value}
      </p>
      <p className="mt-1 text-sm text-stone-600">{hint}</p>
    </div>
  );
}

export function ApPayableReport({
  invoices: seedInvoices,
  asOf,
  dso,
}: {
  invoices: ApInvoice[];
  asOf: string;
  dso: number;
}) {
  const [category, setCategory] = useState<ApCategory | "All">("All");
  const [openBucket, setOpenBucket] = useState<ApAgingBucketKey | null>(null);
  const [categoryDetail, setCategoryDetail] = useState<ApCategory | null>(null);
  const [invoiceDetailOpen, setInvoiceDetailOpen] = useState(false);
  const [invoices, setInvoices] = useState(seedInvoices);
  const [notifyStatus, setNotifyStatus] = useState<string | null>(null);
  const [notifyChatHref, setNotifyChatHref] = useState<string | null>(null);
  const [invoiceActionStatus, setInvoiceActionStatus] = useState<string | null>(
    null
  );
  const [gateTick, setGateTick] = useState(0);
  const [upcomingOpen, setUpcomingOpen] = useState(false);
  const [discountsOpen, setDiscountsOpen] = useState(false);
  const [upcomingCompany, setUpcomingCompany] = useState(ALL);
  const [discountVendor, setDiscountVendor] = useState(ALL);

  useEffect(() => {
    function syncPaid() {
      setInvoices(applyPaidApOverrides(seedInvoices));
      setGateTick((n) => n + 1);
    }
    syncPaid();
    window.addEventListener(AP_PAYMENTS_UPDATED_EVENT, syncPaid);
    window.addEventListener("storage", syncPaid);
    return () => {
      window.removeEventListener(AP_PAYMENTS_UPDATED_EVENT, syncPaid);
      window.removeEventListener("storage", syncPaid);
    };
  }, [seedInvoices]);

  function handleMarkPaid(invoiceId: string) {
    markApInvoicePaid(invoiceId);
    setInvoices(applyPaidApOverrides(seedInvoices));
  }

  function handleRequestInvoiceApproval(inv: ApInvoice) {
    requestApPaymentApproval(inv.id);
    messageManagerAboutApPaymentApproval({
      invoiceId: inv.id,
      vendorName: inv.vendorName,
      category: inv.category,
      dueDate: inv.dueDate,
      amount: inv.amount,
      formatCurrency,
      formatDate,
      approvalMarker: apApprovalMarker(inv.id),
    });
    setNotifyChatHref(chatHrefForApManagerReminder());
    setInvoiceActionStatus(
      `Approval requested for ${inv.vendorName} (${formatCurrency(inv.amount)}). Waiting on the manager.`
    );
    setGateTick((n) => n + 1);
    window.setTimeout(() => setInvoiceActionStatus(null), 8000);
  }

  function handlePayInvoice(inv: ApInvoice) {
    const status = getApPaymentGateStatus(inv.id);
    if (status !== "approved") {
      setInvoiceActionStatus(
        status === "awaiting_approval"
          ? `Still waiting on manager approval for ${inv.vendorName}.`
          : `Request manager approval before paying ${inv.vendorName}.`
      );
      window.setTimeout(() => setInvoiceActionStatus(null), 6000);
      return;
    }
    payApInvoiceIfApproved(inv.id);
    setInvoices(applyPaidApOverrides(seedInvoices));
    setInvoiceActionStatus(
      `Paid ${inv.vendorName} — ${formatCurrency(inv.amount)}. Open AP updated.`
    );
    setGateTick((n) => n + 1);
    window.setTimeout(() => setInvoiceActionStatus(null), 6000);
  }

  const dpoResult = useMemo(() => computeDpo(invoices, asOf), [invoices, asOf]);
  const ccc = useMemo(
    () => computeCashConversionCycle(dso, dpoResult.dpo),
    [dso, dpoResult.dpo]
  );

  const filteredOpen = useMemo(() => {
    const open = invoices.filter((inv) => inv.status === "open");
    return filterByCategory(open, category);
  }, [invoices, category]);

  const buckets = useMemo(
    () => bucketOpenApInvoices(filteredOpen, asOf),
    [filteredOpen, asOf]
  );

  const categoryTotals = useMemo(() => openApByCategory(invoices), [invoices]);
  const categoryTotalSum = useMemo(
    () => Object.values(categoryTotals).reduce((a, b) => a + b, 0),
    [categoryTotals]
  );
  const categoriesByAmount = useMemo(
    () =>
      [...AP_CATEGORIES].sort(
        (a, b) => categoryTotals[b] - categoryTotals[a]
      ),
    [categoryTotals]
  );

  const discountsAll = useMemo(
    () => openDiscountWindow(invoices, asOf),
    [invoices, asOf]
  );

  const discountVendors = useMemo(() => {
    return Array.from(
      new Set(discountsAll.map((inv) => inv.vendorName).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [discountsAll]);

  const discounts = useMemo(() => {
    if (discountVendor === ALL) return discountsAll;
    return discountsAll.filter((inv) => inv.vendorName === discountVendor);
  }, [discountsAll, discountVendor]);

  const monthDiscountTotal = useMemo(() => {
    const filtered =
      discountVendor === ALL
        ? invoices
        : invoices.filter((inv) => inv.vendorName === discountVendor);
    return discountsAvailableThisMonth(filtered, asOf);
  }, [invoices, asOf, discountVendor]);

  const discountAlerts = useMemo(() => {
    const withinOneWeek: ApInvoice[] = [];
    const withinTwoWeeks: ApInvoice[] = [];

    for (const inv of discounts) {
      if (!inv.discountDeadline) continue;
      const daysUntil = daysBetween(asOf, inv.discountDeadline);
      if (daysUntil <= 7) withinOneWeek.push(inv);
      else if (daysUntil <= 14) withinTwoWeeks.push(inv);
    }

    return {
      withinOneWeek,
      withinTwoWeeks,
      oneWeekSavings: withinOneWeek.reduce(
        (s, inv) => s + discountSavings(inv),
        0
      ),
      twoWeekSavings: withinTwoWeeks.reduce(
        (s, inv) => s + discountSavings(inv),
        0
      ),
      totalSavings: discounts.reduce((s, inv) => s + discountSavings(inv), 0),
    };
  }, [discounts, asOf]);

  const upcomingAll = useMemo(
    () => upcomingPayments(invoices, asOf, 14),
    [invoices, asOf]
  );

  const upcomingCompanies = useMemo(() => {
    return Array.from(
      new Set(upcomingAll.map((inv) => inv.vendorName).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [upcomingAll]);

  const upcoming = useMemo(() => {
    if (upcomingCompany === ALL) return upcomingAll;
    return upcomingAll.filter((inv) => inv.vendorName === upcomingCompany);
  }, [upcomingAll, upcomingCompany]);

  const upcomingAlerts = useMemo(() => {
    const withinOneWeek: ApInvoice[] = [];
    const withinTwoWeeks: ApInvoice[] = [];

    for (const inv of upcoming) {
      const daysUntilDue = daysBetween(asOf, inv.dueDate);
      if (daysUntilDue <= 7) withinOneWeek.push(inv);
      else withinTwoWeeks.push(inv);
    }

    return {
      withinOneWeek,
      withinTwoWeeks,
      oneWeekTotal: withinOneWeek.reduce((s, inv) => s + inv.amount, 0),
      twoWeekTotal: withinTwoWeeks.reduce((s, inv) => s + inv.amount, 0),
      totalAmount: upcoming.reduce((s, inv) => s + inv.amount, 0),
    };
  }, [upcoming, asOf]);

  function handleNotifyManager() {
    const dueSoon = upcomingAlerts.withinOneWeek;
    if (dueSoon.length === 0) {
      setNotifyStatus("No payments are due within one week.");
      setNotifyChatHref(null);
      return;
    }
    messageManagerAboutApDuePayments({
      payments: dueSoon.map((inv) => ({
        vendorName: inv.vendorName,
        category: inv.category,
        dueDate: inv.dueDate,
        amount: inv.amount,
      })),
      totalAmount: upcomingAlerts.oneWeekTotal,
      formatCurrency,
      formatDate,
    });
    const href = chatHrefForApManagerReminder();
    setNotifyChatHref(href);
    setNotifyStatus(
      `Message sent to the manager — ${dueSoon.length} payment${dueSoon.length === 1 ? "" : "s"} due within 1 week.`
    );
    window.setTimeout(() => setNotifyStatus(null), 8000);
  }

  const openMeta = AGING_BUCKETS.find((b) => b.key === openBucket);
  const detailInvoices = openBucket ? buckets[openBucket] : [];

  const categoryDetailInvoices = useMemo(() => {
    if (!categoryDetail) return [];
    return openApInvoices(invoices)
      .filter((inv) => inv.category === categoryDetail)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [invoices, categoryDetail]);

  const openInvoiceList = useMemo(() => {
    void gateTick;
    return openApInvoices(invoices).sort((a, b) =>
      a.dueDate.localeCompare(b.dueDate)
    );
  }, [invoices, gateTick]);

  return (
    <div className="space-y-8">
      {/* 1. Summary KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryKpi
          title="Total Open AP"
          value={formatCurrency(dpoResult.openAp)}
          hint="Sum of unpaid vendor invoices — click for invoice list"
          selected={invoiceDetailOpen}
          onSelect={() => setInvoiceDetailOpen((open) => !open)}
        />
        <SummaryKpi
          title="DPO"
          value={`${dpoResult.dpo.toFixed(1)} days`}
          hint="Days payable outstanding (~90-day window)"
        />
        <SummaryKpi
          title="Cash Conversion Cycle"
          value={`${ccc.toFixed(1)} days`}
          hint={`DSO (${dso.toFixed(1)}) − DPO (${dpoResult.dpo.toFixed(1)})`}
        />
      </div>

      {invoiceDetailOpen ? (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-green-950">
                Open AP by Invoice
              </h3>
              <p className="mt-0.5 text-sm text-stone-600">
                Request manager approval, then pay each open vendor invoice
              </p>
            </div>
            <button
              type="button"
              onClick={() => setInvoiceDetailOpen(false)}
              className="text-sm text-stone-600 hover:text-green-900"
            >
              Close
            </button>
          </div>

          {invoiceActionStatus ? (
            <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
              {invoiceActionStatus}
              {notifyChatHref &&
              invoiceActionStatus.toLowerCase().includes("approval") ? (
                <>
                  {" "}
                  <Link
                    href={notifyChatHref}
                    className="font-medium underline hover:text-green-950"
                  >
                    Open Chat
                  </Link>
                </>
              ) : null}
            </div>
          ) : null}

          {openInvoiceList.length === 0 ? (
            <p className="mt-3 text-sm text-stone-600">No open invoices.</p>
          ) : (
            <ul className="mt-3 divide-y divide-stone-100">
              {openInvoiceList.map((inv) => {
                const gate = getApPaymentGateStatus(inv.id);
                return (
                  <li
                    key={inv.id}
                    className="flex items-center gap-4 py-3 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-stone-900">
                          {inv.vendorName}
                        </span>
                        <span className="text-stone-500">{inv.category}</span>
                        <PaymentGateBadge status={gate} />
                      </div>
                      <p className="text-stone-500">
                        Due {formatDate(inv.dueDate)} · Invoice {inv.id}
                      </p>
                      <p className="mt-1 font-semibold tabular-nums text-green-950">
                        {formatCurrency(inv.amount)}
                      </p>
                    </div>
                    <div className="ml-auto flex shrink-0 items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleRequestInvoiceApproval(inv)}
                        disabled={gate === "approved" || gate === "paid"}
                        className="rounded-md border border-amber-700 px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {gate === "awaiting_approval"
                          ? "Resend approval request"
                          : gate === "approved"
                            ? "Approved"
                            : "Request approval"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePayInvoice(inv)}
                        disabled={gate !== "approved"}
                        className="rounded-md bg-green-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Pay invoice
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ) : null}

      {/* 2. AP Aging */}
      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-green-950">AP Aging</h2>
            <p className="text-sm text-stone-600">
              Open payables by days past due
            </p>
          </div>
          <label className="flex flex-col gap-1 text-sm text-stone-700">
            <span className="font-medium">Category</span>
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as ApCategory | "All")
              }
              className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-stone-900 shadow-sm focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700"
            >
              <option value="All">All categories</option>
              {AP_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {AGING_BUCKETS.map((meta) => {
            const list = buckets[meta.key];
            const total = bucketTotal(buckets, meta.key);
            const selected = openBucket === meta.key;
            return (
              <button
                key={meta.key}
                type="button"
                onClick={() =>
                  setOpenBucket((prev) =>
                    prev === meta.key ? null : meta.key
                  )
                }
                aria-pressed={selected}
                className={`rounded-xl border p-4 text-left shadow-sm transition ${meta.accent} ${
                  selected
                    ? "ring-2 ring-green-800 ring-offset-2"
                    : "hover:brightness-[0.98]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-stone-800">
                    {meta.title}
                  </h3>
                  <span className="text-xs text-stone-500">
                    {selected ? "Hide" : "View"}
                  </span>
                </div>
                <p
                  className={`mt-3 text-2xl font-bold tracking-tight ${meta.amountClass}`}
                >
                  {formatCurrency(total)}
                </p>
                <p className="mt-1 text-sm text-stone-600">
                  {list.length === 0
                    ? "No invoices"
                    : `${list.length} invoice${list.length === 1 ? "" : "s"}`}
                </p>
              </button>
            );
          })}
        </div>

        {openMeta ? (
          <Card className="mt-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-green-950">
                {openMeta.title}
                {openMeta.key === "current" ? "" : " Past Due"}
              </h3>
              <button
                type="button"
                onClick={() => setOpenBucket(null)}
                className="text-sm text-stone-600 hover:text-green-900"
              >
                Close
              </button>
            </div>
            {detailInvoices.length === 0 ? (
              <p className="mt-3 text-sm text-stone-600">No invoices in this bucket.</p>
            ) : (
              <ul className="mt-3 divide-y divide-stone-100">
                {detailInvoices.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <div>
                      <span className="font-medium text-stone-900">
                        {inv.vendorName}
                      </span>
                      <span className="ml-2 text-stone-500">{inv.category}</span>
                      <p className="text-stone-500">
                        Due {formatDate(inv.dueDate)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="font-semibold text-green-950">
                        {formatCurrency(inv.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleMarkPaid(inv.id)}
                        className="rounded-md border border-green-700 px-2.5 py-1 text-xs font-medium text-green-800 hover:bg-green-50"
                      >
                        Mark paid
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : null}
      </section>

      {/* 3. AP by category stacked bar */}
      <Card>
        <h2 className="text-lg font-semibold text-green-950">AP by Category</h2>
        <p className="mt-1 text-sm text-stone-600">
          Open payables split across spend categories — click a segment or
          category for invoice detail
        </p>

        {categoryTotalSum <= 0 ? (
          <p className="mt-4 text-sm text-stone-600">No open AP.</p>
        ) : (
          <>
            <div
              className="mt-5 flex h-10 w-full overflow-hidden rounded-lg border border-stone-200"
              role="group"
              aria-label="Open AP by category stacked bar"
            >
              {categoriesByAmount.map((c) => {
                const amount = categoryTotals[c];
                if (amount <= 0) return null;
                const pct = (amount / categoryTotalSum) * 100;
                return (
                  <button
                    key={c}
                    type="button"
                    title={`${c}: ${formatCurrency(amount)} (${pct.toFixed(1)}%) — view invoices`}
                    onClick={() => setCategoryDetail(c)}
                    style={{
                      width: `${pct}%`,
                      backgroundColor: CATEGORY_COLORS[c],
                    }}
                    className="h-full min-w-[2px] transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/80"
                  />
                );
              })}
            </div>
            <ul className="mt-4 flex flex-col gap-1">
              {categoriesByAmount.map((c) => {
                const amount = categoryTotals[c];
                if (amount <= 0) return null;
                const pct = (amount / categoryTotalSum) * 100;
                return (
                  <li key={c}>
                    <button
                      type="button"
                      onClick={() => setCategoryDetail(c)}
                      className="flex w-full items-center justify-between gap-2 rounded-md px-1.5 py-1.5 text-left text-sm text-stone-800 transition hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-700/30"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 shrink-0 rounded-sm"
                          style={{ backgroundColor: CATEGORY_COLORS[c] }}
                          aria-hidden
                        />
                        {c}
                      </span>
                      <span className="tabular-nums text-stone-600">
                        {formatCurrency(amount)}
                        <span className="ml-1 text-stone-400">
                          ({pct.toFixed(0)}%)
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>

      {categoryDetail ? (
        <CategoryPayablesModal
          category={categoryDetail}
          invoices={categoryDetailInvoices}
          total={categoryTotals[categoryDetail]}
          asOf={asOf}
          onMarkPaid={handleMarkPaid}
          onClose={() => setCategoryDetail(null)}
        />
      ) : null}

      {/* 4–5. Upcoming 14 days | Early payment discounts */}
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <section className="min-w-0 overflow-hidden rounded-xl border border-green-200 bg-white shadow-sm">
          <div className="space-y-3 border-b border-green-100 bg-green-50/90 px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setUpcomingOpen((value) => !value)}
                className="flex min-w-0 flex-1 items-start gap-3 rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-green-700/30"
                aria-expanded={upcomingOpen}
                aria-controls="upcoming-14-days-panel"
              >
                <span
                  className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-green-200 bg-white text-green-800 transition-transform ${
                    upcomingOpen ? "rotate-90" : ""
                  }`}
                  aria-hidden="true"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-4 w-4"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-green-950">
                    Upcoming 14 Days
                  </span>
                  <span className="mt-0.5 block text-xs text-green-800/80">
                    {upcoming.length} payment
                    {upcoming.length === 1 ? "" : "s"} ·{" "}
                    {formatCurrency(upcomingAlerts.totalAmount)} total ·{" "}
                    {upcomingAlerts.withinOneWeek.length} due ≤1 week (
                    {formatCurrency(upcomingAlerts.oneWeekTotal)})
                    {upcomingCompany !== ALL
                      ? ` · ${upcomingCompany}`
                      : ""}
                    {!upcomingOpen ? ". Expand to review." : ""}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={handleNotifyManager}
                disabled={upcomingAlerts.withinOneWeek.length === 0}
                className="ml-auto shrink-0 rounded-lg bg-green-800 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Notify manager
              </button>
            </div>

            <label className="flex items-center gap-2 text-sm text-green-950">
              <span className="whitespace-nowrap text-xs font-medium text-green-800">
                Company
              </span>
              <select
                value={upcomingCompany}
                onChange={(e) => {
                  setUpcomingCompany(e.target.value);
                  setUpcomingOpen(true);
                }}
                className="max-w-[14rem] rounded-md border border-green-200 bg-white px-2 py-1.5 text-sm text-stone-800 shadow-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-700/15"
              >
                <option value={ALL}>All companies</option>
                {upcomingCompanies.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {notifyStatus ? (
            <div className="border-b border-green-100 bg-green-50 px-4 py-2 text-sm text-green-900">
              {notifyStatus}
              {notifyChatHref ? (
                <>
                  {" "}
                  <Link
                    href={notifyChatHref}
                    className="font-medium underline hover:text-green-950"
                  >
                    Open Chat
                  </Link>
                </>
              ) : null}
            </div>
          ) : null}

          {upcomingOpen ? (
            <div id="upcoming-14-days-panel" className="bg-green-50/30 p-4">
              {upcoming.length === 0 ? (
                <p className="text-sm text-stone-600">
                  No payments due in the next 14 days
                  {upcomingCompany !== ALL ? " for this company" : ""}.
                </p>
              ) : (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div
                      className="rounded-lg border border-orange-200 bg-orange-50/70 px-3 py-2.5"
                      role="status"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-orange-900">
                        Due within 1 week
                      </p>
                      <p className="mt-1 text-sm font-semibold text-orange-950">
                        {upcomingAlerts.withinOneWeek.length} payment
                        {upcomingAlerts.withinOneWeek.length === 1 ? "" : "s"}
                        <span className="ml-1.5 font-bold">
                          {formatCurrency(upcomingAlerts.oneWeekTotal)}
                        </span>
                      </p>
                    </div>
                    <div
                      className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2.5"
                      role="status"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                        Due in 1–2 weeks
                      </p>
                      <p className="mt-1 text-sm font-semibold text-amber-950">
                        {upcomingAlerts.withinTwoWeeks.length} payment
                        {upcomingAlerts.withinTwoWeeks.length === 1 ? "" : "s"}
                        <span className="ml-1.5 font-bold">
                          {formatCurrency(upcomingAlerts.twoWeekTotal)}
                        </span>
                      </p>
                    </div>
                  </div>

                  <ul className="mt-4 divide-y divide-stone-100 rounded-xl border border-green-100 bg-white px-3">
                    {upcoming.map((inv) => {
                      const daysUntilDue = daysBetween(asOf, inv.dueDate);
                      const dueThisWeek = daysUntilDue <= 7;
                      return (
                        <li
                          key={inv.id}
                          className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 text-sm"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-stone-900">
                                {inv.vendorName}
                              </span>
                              <span className="text-stone-500">
                                {inv.category}
                              </span>
                              <span
                                className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                                  dueThisWeek
                                    ? "bg-orange-100 text-orange-900"
                                    : "bg-amber-100 text-amber-900"
                                }`}
                              >
                                {dueThisWeek ? "Due ≤1 week" : "Due ≤2 weeks"}
                              </span>
                            </div>
                            <p className="text-stone-500">
                              Due {formatDate(inv.dueDate)}
                              {daysUntilDue === 0
                                ? " · today"
                                : daysUntilDue === 1
                                  ? " · tomorrow"
                                  : ` · in ${daysUntilDue} days`}
                            </p>
                          </div>
                          <span className="font-semibold text-green-950">
                            {formatCurrency(inv.amount)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          ) : null}
        </section>

        <section className="min-w-0 overflow-hidden rounded-xl border border-green-200 bg-white shadow-sm">
          <div className="space-y-3 border-b border-green-100 bg-green-50/90 px-4 py-3">
            <button
              type="button"
              onClick={() => setDiscountsOpen((value) => !value)}
              className="flex w-full min-w-0 items-start gap-3 rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-green-700/30"
              aria-expanded={discountsOpen}
              aria-controls="early-discounts-panel"
            >
              <span
                className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-green-200 bg-white text-green-800 transition-transform ${
                  discountsOpen ? "rotate-90" : ""
                }`}
                aria-hidden="true"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-green-950">
                  Early Payment Discounts
                </span>
                <span className="mt-0.5 block text-xs text-green-800/80">
                  {discounts.length} discount
                  {discounts.length === 1 ? "" : "s"} ·{" "}
                  {formatCurrency(discountAlerts.totalSavings)} available ·
                  month {formatCurrency(monthDiscountTotal)}
                  {discountVendor !== ALL ? ` · ${discountVendor}` : ""}
                  {!discountsOpen ? ". Expand to review." : ""}
                </span>
              </span>
            </button>

            <label className="flex items-center gap-2 text-sm text-green-950">
              <span className="whitespace-nowrap text-xs font-medium text-green-800">
                Vendor
              </span>
              <select
                value={discountVendor}
                onChange={(e) => {
                  setDiscountVendor(e.target.value);
                  setDiscountsOpen(true);
                }}
                className="max-w-[14rem] rounded-md border border-green-200 bg-white px-2 py-1.5 text-sm text-stone-800 shadow-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-700/15"
              >
                <option value={ALL}>All vendors</option>
                {discountVendors.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {discountsOpen ? (
            <div id="early-discounts-panel" className="bg-green-50/30 p-4">
              {discounts.length === 0 ? (
                <p className="text-sm text-stone-600">
                  No active early-pay discounts
                  {discountVendor !== ALL ? " for this vendor" : ""}.
                </p>
              ) : (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div
                      className="rounded-lg border border-orange-200 bg-orange-50/70 px-3 py-2.5"
                      role="status"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-orange-900">
                        Deadline within 1 week
                      </p>
                      <p className="mt-1 text-sm font-semibold text-orange-950">
                        {discountAlerts.withinOneWeek.length} discount
                        {discountAlerts.withinOneWeek.length === 1 ? "" : "s"}
                        <span className="ml-1.5 font-bold">
                          {formatCurrency(discountAlerts.oneWeekSavings)}
                        </span>
                      </p>
                    </div>
                    <div
                      className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2.5"
                      role="status"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                        Deadline in 1–2 weeks
                      </p>
                      <p className="mt-1 text-sm font-semibold text-amber-950">
                        {discountAlerts.withinTwoWeeks.length} discount
                        {discountAlerts.withinTwoWeeks.length === 1 ? "" : "s"}
                        <span className="ml-1.5 font-bold">
                          {formatCurrency(discountAlerts.twoWeekSavings)}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto rounded-xl border border-green-100 bg-white px-3">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-stone-200 text-stone-500">
                          <th className="pb-2 pr-2 pt-3 font-medium">Vendor</th>
                          <th className="pb-2 pr-2 pt-3 font-medium">
                            Deadline
                          </th>
                          <th className="pb-2 pr-2 pt-3 font-medium">%</th>
                          <th className="pb-2 pt-3 text-right font-medium">
                            $ Saved
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {discounts.map((inv) => {
                          const daysUntil = daysBetween(
                            asOf,
                            inv.discountDeadline!
                          );
                          const dueThisWeek = daysUntil <= 7;
                          const dueTwoWeeks = daysUntil <= 14;
                          return (
                            <tr key={inv.id} className="text-stone-800">
                              <td className="py-2.5 pr-2 font-medium">
                                {inv.vendorName}
                              </td>
                              <td className="py-2.5 pr-2">
                                <div className="flex flex-wrap items-center gap-1.5 whitespace-nowrap">
                                  <span>
                                    {formatDate(inv.discountDeadline!)}
                                  </span>
                                  {dueTwoWeeks ? (
                                    <span
                                      className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                                        dueThisWeek
                                          ? "bg-orange-100 text-orange-900"
                                          : "bg-amber-100 text-amber-900"
                                      }`}
                                    >
                                      {dueThisWeek
                                        ? "Due ≤1 week"
                                        : "Due ≤2 weeks"}
                                    </span>
                                  ) : null}
                                </div>
                                <p className="text-xs text-stone-500">
                                  {daysUntil === 0
                                    ? "today"
                                    : daysUntil === 1
                                      ? "tomorrow"
                                      : `in ${daysUntil} days`}
                                </p>
                              </td>
                              <td className="py-2.5 pr-2">
                                {inv.discountPercent}%
                              </td>
                              <td className="py-2.5 text-right font-semibold text-green-900 whitespace-nowrap">
                                {formatCurrency(discountSavings(inv))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <p className="mt-4 border-t border-stone-200 pt-3 text-sm text-stone-700">
                Discounts available this month:{" "}
                <span className="font-semibold text-green-950">
                  {formatCurrency(monthDiscountTotal)}
                </span>
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function agingLabel(dueDate: string, asOf: string) {
  const daysOverdue = daysBetween(dueDate, asOf);
  if (daysOverdue <= 0) return "Current";
  if (daysOverdue <= 30) return "1–30 past due";
  if (daysOverdue <= 60) return "31–60 past due";
  if (daysOverdue <= 90) return "61–90 past due";
  return "90+ past due";
}

function CategoryPayablesModal({
  category,
  invoices,
  total,
  asOf,
  onMarkPaid,
  onClose,
}: {
  category: ApCategory;
  invoices: ApInvoice[];
  total: number;
  asOf: string;
  onMarkPaid: (invoiceId: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ap-category-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 px-6 py-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: CATEGORY_COLORS[category] }}
                aria-hidden
              />
              <h2
                id="ap-category-title"
                className="text-lg font-semibold text-green-950"
              >
                {category}
              </h2>
            </div>
            <p className="mt-1 text-sm text-stone-500">
              {invoices.length} open invoice
              {invoices.length === 1 ? "" : "s"} · {formatCurrency(total)}{" "}
              outstanding
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-stone-400 hover:bg-stone-50 hover:text-stone-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {invoices.length === 0 ? (
            <p className="rounded-lg border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
              No open payables in this category.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-stone-200">
              <table className="w-full min-w-[44rem] text-left text-sm">
                <thead className="bg-stone-50 text-stone-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Vendor</th>
                    <th className="px-4 py-2.5 font-medium">Invoice</th>
                    <th className="px-4 py-2.5 font-medium">Due</th>
                    <th className="px-4 py-2.5 font-medium">Aging</th>
                    <th className="px-4 py-2.5 font-medium">Discount</th>
                    <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      Payment
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {invoices.map((inv) => {
                    const hasOpenDiscount =
                      inv.discountPercent != null &&
                      inv.discountPercent > 0 &&
                      inv.discountDeadline != null &&
                      inv.discountDeadline >= asOf;
                    return (
                      <tr key={inv.id} className="text-stone-800">
                        <td className="px-4 py-3 font-medium">
                          {inv.vendorName}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-stone-600">
                          {formatDate(inv.invoiceDate)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-stone-600">
                          {formatDate(inv.dueDate)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-stone-600">
                          {agingLabel(inv.dueDate, asOf)}
                        </td>
                        <td className="px-4 py-3 text-stone-600">
                          {hasOpenDiscount ? (
                            <span>
                              {inv.discountPercent}% · save{" "}
                              {formatCurrency(discountSavings(inv))}
                              <span className="block text-xs text-stone-400">
                                by {formatDate(inv.discountDeadline!)}
                              </span>
                            </span>
                          ) : (
                            <span className="text-stone-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-green-950 whitespace-nowrap">
                          {formatCurrency(inv.amount)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => onMarkPaid(inv.id)}
                            className="rounded-md border border-green-700 px-2.5 py-1 text-xs font-medium text-green-800 hover:bg-green-50"
                          >
                            Mark paid
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
