"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
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

function SummaryKpi({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint: string;
}) {
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
  invoices,
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

  const discounts = useMemo(
    () => openDiscountWindow(invoices, asOf),
    [invoices, asOf]
  );
  const monthDiscountTotal = useMemo(
    () => discountsAvailableThisMonth(invoices, asOf),
    [invoices, asOf]
  );

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
    };
  }, [discounts, asOf]);

  const upcoming = useMemo(
    () => upcomingPayments(invoices, asOf, 14),
    [invoices, asOf]
  );

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
    };
  }, [upcoming, asOf]);

  const openMeta = AGING_BUCKETS.find((b) => b.key === openBucket);
  const detailInvoices = openBucket ? buckets[openBucket] : [];

  const categoryDetailInvoices = useMemo(() => {
    if (!categoryDetail) return [];
    return openApInvoices(invoices)
      .filter((inv) => inv.category === categoryDetail)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [invoices, categoryDetail]);

  return (
    <div className="space-y-8">
      {/* 1. Summary KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryKpi
          title="Total Open AP"
          value={formatCurrency(dpoResult.openAp)}
          hint="Sum of unpaid vendor invoices"
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
                    className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 text-sm"
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
                    <span className="font-semibold text-green-950">
                      {formatCurrency(inv.amount)}
                    </span>
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
          onClose={() => setCategoryDetail(null)}
        />
      ) : null}

      {/* 4–5. Upcoming 14 days | Early payment discounts */}
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Card className="min-w-0">
          <h2 className="text-lg font-semibold text-green-950">
            Upcoming 14 Days
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Open invoices due within the next two weeks
          </p>

          {upcoming.length === 0 ? (
            <p className="mt-4 text-sm text-stone-600">
              No payments due in the next 14 days.
            </p>
          ) : (
            <>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
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

              <ul className="mt-4 divide-y divide-stone-100">
                {upcoming.map((inv) => {
                  const daysUntilDue = daysBetween(asOf, inv.dueDate);
                  const dueThisWeek = daysUntilDue <= 7;
                  return (
                    <li
                      key={inv.id}
                      className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 text-sm"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-stone-900">
                            {inv.vendorName}
                          </span>
                          <span className="text-stone-500">{inv.category}</span>
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
        </Card>

        <Card className="min-w-0">
          <h2 className="text-lg font-semibold text-green-950">
            Early Payment Discounts
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Open invoices still inside an early-pay window
          </p>

          {discounts.length === 0 ? (
            <p className="mt-4 text-sm text-stone-600">
              No active early-pay discounts.
            </p>
          ) : (
            <>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
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

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-500">
                      <th className="pb-2 pr-2 font-medium">Vendor</th>
                      <th className="pb-2 pr-2 font-medium">Deadline</th>
                      <th className="pb-2 pr-2 font-medium">%</th>
                      <th className="pb-2 text-right font-medium">$ Saved</th>
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
                              <span>{formatDate(inv.discountDeadline!)}</span>
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
                          <td className="py-2.5 pr-2">{inv.discountPercent}%</td>
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

          <p className="mt-4 border-t border-stone-100 pt-3 text-sm text-stone-700">
            Discounts available this month:{" "}
            <span className="font-semibold text-green-950">
              {formatCurrency(monthDiscountTotal)}
            </span>
          </p>
        </Card>
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
  onClose,
}: {
  category: ApCategory;
  invoices: ApInvoice[];
  total: number;
  asOf: string;
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
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead className="bg-stone-50 text-stone-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Vendor</th>
                    <th className="px-4 py-2.5 font-medium">Invoice</th>
                    <th className="px-4 py-2.5 font-medium">Due</th>
                    <th className="px-4 py-2.5 font-medium">Aging</th>
                    <th className="px-4 py-2.5 font-medium">Discount</th>
                    <th className="px-4 py-2.5 text-right font-medium">Amount</th>
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
