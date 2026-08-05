"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  summarizeCeiKpi,
  summarizeDsoKpi,
  summarizePctCurrentKpi,
  summarizeWaddKpi,
  type CeiMode,
} from "./ar-kpis";
import { ArKpiRow } from "./ArKpiRow";
import { scoreAllCustomers } from "./customer-risk";
import { RiskiestCustomers } from "./RiskiestCustomers";
import type { AgingBucketKey, ArInvoice } from "./ar-types";

const PAST_DUE_BUCKETS = [
  {
    key: "1-30" as const,
    title: "1–30 Days",
    accent: "border-amber-200 bg-amber-50/60",
    amountClass: "text-amber-900",
  },
  {
    key: "31-60" as const,
    title: "31–60 Days",
    accent: "border-orange-200 bg-orange-50/60",
    amountClass: "text-orange-900",
  },
  {
    key: "61-90" as const,
    title: "61–90 Days",
    accent: "border-orange-300 bg-orange-50/80",
    amountClass: "text-orange-950",
  },
  {
    key: "90+" as const,
    title: "90+ Days",
    accent: "border-red-200 bg-red-50/70",
    amountClass: "text-red-900",
  },
];

function SummaryMetricTile({
  title,
  amount,
  hint,
  accent,
  amountClass,
}: {
  title: string;
  amount: number;
  hint: string;
  accent: string;
  amountClass: string;
}) {
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${accent}`}>
      <h3 className="text-sm font-semibold text-stone-800">{title}</h3>
      <p className={`mt-3 text-2xl font-bold tracking-tight ${amountClass}`}>
        {formatCurrency(amount)}
      </p>
      <p className="mt-1 text-sm text-stone-600">{hint}</p>
    </div>
  );
}

function PastDueBucketTile({
  title,
  invoices,
  accent,
  amountClass,
  selected,
  onSelect,
}: {
  title: string;
  invoices: ArInvoice[];
  accent: string;
  amountClass: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const total = invoices.reduce(
    (sum, inv) => sum + (Number(inv.total) - Number(inv.amount_paid)),
    0
  );
  const count = invoices.length;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`rounded-xl border p-4 text-left shadow-sm transition ${accent} ${
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
      <p className={`mt-3 text-2xl font-bold tracking-tight ${amountClass}`}>
        {formatCurrency(total)}
      </p>
      <p className="mt-1 text-sm text-stone-600">
        {count === 0
          ? "No invoices"
          : `${count} invoice${count === 1 ? "" : "s"}`}
      </p>
    </button>
  );
}

type Buckets = Record<AgingBucketKey, ArInvoice[]>;

export function ArAgingReport({
  buckets,
  invoices,
  asOf,
  customerNames,
}: {
  buckets: Buckets;
  invoices: ArInvoice[];
  asOf: string;
  /** Active contract + invoice customers (includes $0 open AR). */
  customerNames?: string[];
}) {
  const customers = useMemo(() => {
    const names = new Set<string>(customerNames ?? []);
    // Include anyone with invoice history (paid or open), not only open AR.
    for (const inv of invoices) {
      const name = inv.customers?.name ?? inv.customer;
      if (name) names.add(name);
    }
    for (const list of Object.values(buckets)) {
      for (const inv of list) {
        const name = inv.customers?.name ?? inv.customer;
        if (name) names.add(name);
      }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [invoices, buckets, customerNames]);

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(customers)
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const [ceiMode, setCeiMode] = useState<CeiMode>("trailing_3m");
  const [openBucket, setOpenBucket] = useState<AgingBucketKey | null>(null);

  function toggleCustomer(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(customers));
  }

  function clearAll() {
    setSelected(new Set());
  }

  const filteredBuckets = useMemo(() => {
    const filterList = (list: ArInvoice[]) =>
      list.filter((inv) => selected.has(inv.customers?.name ?? inv.customer));

    return {
      current: filterList(buckets.current ?? []),
      "1-30": filterList(buckets["1-30"] ?? []),
      "31-60": filterList(buckets["31-60"] ?? []),
      "61-90": filterList(buckets["61-90"] ?? []),
      "90+": filterList(buckets["90+"] ?? []),
    } satisfies Buckets;
  }, [buckets, selected]);

  const bucketTotals = Object.fromEntries(
    Object.entries(filteredBuckets).map(([key, invoiceList]) => [
      key,
      invoiceList.reduce(
        (sum, inv) => sum + (Number(inv.total) - Number(inv.amount_paid)),
        0
      ),
    ])
  );

  const totalOutstanding = Object.values(bucketTotals).reduce((a, b) => a + b, 0);

  const filteredInvoices = useMemo(() => {
    // When every listed customer is selected, use full history (includes
    // customers with no open AR, needed for accurate credit sales / DSO).
    if (selected.size === customers.length) return invoices;
    return invoices.filter((inv) =>
      selected.has(inv.customers?.name ?? inv.customer)
    );
  }, [invoices, selected, customers.length]);

  const dsoKpi = useMemo(
    () => summarizeDsoKpi(filteredInvoices, asOf),
    [filteredInvoices, asOf]
  );

  const ceiKpi = useMemo(
    () => summarizeCeiKpi(filteredInvoices, asOf, ceiMode),
    [filteredInvoices, asOf, ceiMode]
  );

  const waddKpi = useMemo(
    () => summarizeWaddKpi(filteredInvoices, asOf),
    [filteredInvoices, asOf]
  );

  const pctCurrentKpi = useMemo(
    () => summarizePctCurrentKpi(filteredInvoices, asOf),
    [filteredInvoices, asOf]
  );

  const openMeta = PAST_DUE_BUCKETS.find((b) => b.key === openBucket);
  const openInvoices = openBucket ? filteredBuckets[openBucket] : [];

  const riskRows = useMemo(
    () => scoreAllCustomers(filteredInvoices, asOf),
    [filteredInvoices, asOf]
  );

  return (
    <>
      <Card className="mb-6">
        <button
          type="button"
          onClick={() => setFilterOpen((open) => !open)}
          aria-expanded={filterOpen}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <h2 className="text-lg font-semibold text-green-950">Customers</h2>
          <span className="flex items-center gap-2 text-sm text-stone-500">
            {selected.size} of {customers.length} selected
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`h-4 w-4 transition-transform ${filterOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </button>

        {filterOpen ? (
          <>
            <div className="mt-3 flex justify-end gap-2 text-sm">
              <button
                type="button"
                onClick={selectAll}
                className="rounded-md px-2 py-1 text-green-800 hover:bg-green-50"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="rounded-md px-2 py-1 text-stone-600 hover:bg-stone-50"
              >
                Clear all
              </button>
            </div>
            <div className="mt-3 grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
              {customers.map((name) => {
                const checked = selected.has(name);
                const id = `ar-customer-${name.replace(/\s+/g, "-").toLowerCase()}`;
                return (
                  <label
                    key={name}
                    htmlFor={id}
                    className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 text-sm text-stone-800 hover:bg-stone-50"
                  >
                    <input
                      id={id}
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCustomer(name)}
                      className="mt-0.5 h-4 w-4 rounded border-stone-300 text-green-800 focus:ring-green-700"
                    />
                    <span>{name}</span>
                  </label>
                );
              })}
            </div>
          </>
        ) : null}
      </Card>

      <div className="mb-8">
        {/* 2×3: Outstanding over Current | four past-due buckets */}
        <div className="grid grid-cols-3 gap-4">
          <SummaryMetricTile
            title="Total Outstanding"
            amount={totalOutstanding}
            hint="All open AR"
            accent="border-green-200 bg-green-50/70"
            amountClass="text-green-950"
          />
          <PastDueBucketTile
            title={PAST_DUE_BUCKETS[0]!.title}
            invoices={filteredBuckets[PAST_DUE_BUCKETS[0]!.key]}
            accent={PAST_DUE_BUCKETS[0]!.accent}
            amountClass={PAST_DUE_BUCKETS[0]!.amountClass}
            selected={openBucket === PAST_DUE_BUCKETS[0]!.key}
            onSelect={() =>
              setOpenBucket((prev) =>
                prev === PAST_DUE_BUCKETS[0]!.key ? null : PAST_DUE_BUCKETS[0]!.key
              )
            }
          />
          <PastDueBucketTile
            title={PAST_DUE_BUCKETS[1]!.title}
            invoices={filteredBuckets[PAST_DUE_BUCKETS[1]!.key]}
            accent={PAST_DUE_BUCKETS[1]!.accent}
            amountClass={PAST_DUE_BUCKETS[1]!.amountClass}
            selected={openBucket === PAST_DUE_BUCKETS[1]!.key}
            onSelect={() =>
              setOpenBucket((prev) =>
                prev === PAST_DUE_BUCKETS[1]!.key ? null : PAST_DUE_BUCKETS[1]!.key
              )
            }
          />
          <SummaryMetricTile
            title="Current"
            amount={bucketTotals.current ?? 0}
            hint={`${filteredBuckets.current.length} invoice${filteredBuckets.current.length === 1 ? "" : "s"} not yet due`}
            accent="border-stone-200 bg-white"
            amountClass="text-stone-900"
          />
          <PastDueBucketTile
            title={PAST_DUE_BUCKETS[2]!.title}
            invoices={filteredBuckets[PAST_DUE_BUCKETS[2]!.key]}
            accent={PAST_DUE_BUCKETS[2]!.accent}
            amountClass={PAST_DUE_BUCKETS[2]!.amountClass}
            selected={openBucket === PAST_DUE_BUCKETS[2]!.key}
            onSelect={() =>
              setOpenBucket((prev) =>
                prev === PAST_DUE_BUCKETS[2]!.key ? null : PAST_DUE_BUCKETS[2]!.key
              )
            }
          />
          <PastDueBucketTile
            title={PAST_DUE_BUCKETS[3]!.title}
            invoices={filteredBuckets[PAST_DUE_BUCKETS[3]!.key]}
            accent={PAST_DUE_BUCKETS[3]!.accent}
            amountClass={PAST_DUE_BUCKETS[3]!.amountClass}
            selected={openBucket === PAST_DUE_BUCKETS[3]!.key}
            onSelect={() =>
              setOpenBucket((prev) =>
                prev === PAST_DUE_BUCKETS[3]!.key ? null : PAST_DUE_BUCKETS[3]!.key
              )
            }
          />
        </div>

        {openMeta ? (
          <Card className="mt-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-green-950">
                {openMeta.title} Past Due
              </h3>
              <button
                type="button"
                onClick={() => setOpenBucket(null)}
                className="text-sm text-stone-500 hover:text-stone-800"
              >
                Close
              </button>
            </div>
            {openInvoices.length === 0 ? (
              <p className="mt-3 text-sm text-stone-500">
                No balances in this bucket.
              </p>
            ) : (
              <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto text-sm">
                {openInvoices.map((invoice) => (
                  <li
                    key={invoice.id}
                    className="flex justify-between gap-3 rounded-lg bg-stone-50 px-3 py-2"
                  >
                    <span className="min-w-0">
                      <span className="block">
                        {invoice.invoice_number} · {invoice.customers?.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-stone-500">
                        {invoice.service_type} · {invoice.status}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      {formatCurrency(
                        Number(invoice.total) - Number(invoice.amount_paid)
                      )}{" "}
                      <span className="text-stone-400">
                        due {formatDate(invoice.due_date)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : null}
      </div>

      <Card className="mb-8">
        <div className="grid h-[32rem] items-stretch gap-6 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)] lg:gap-8">
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <RiskiestCustomers allRows={riskRows} />
          </div>
          <div className="flex h-full min-h-0 flex-col overflow-hidden lg:border-l lg:border-stone-200 lg:pl-8">
            <ArKpiRow
              dso={dsoKpi}
              cei={ceiKpi}
              wadd={waddKpi}
              pctCurrent={pctCurrentKpi}
              ceiMode={ceiMode}
              onCeiModeChange={setCeiMode}
            />
          </div>
        </div>
      </Card>
    </>
  );
}
