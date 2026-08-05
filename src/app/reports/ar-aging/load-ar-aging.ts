import { createDataClient } from "@/lib/auth-access";
import type {
  AgingBucketKey,
  ArExceptionStatus,
  ArInvoice,
  ArPaymentEvent,
  ServiceType,
} from "./ar-types";

function toIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysBetween(startIso: string, endIso: string) {
  const a = new Date(startIso + "T00:00:00").getTime();
  const b = new Date(endIso + "T00:00:00").getTime();
  return Math.round((b - a) / 86_400_000);
}

function inferServiceType(contractTitle: string | null | undefined): ServiceType {
  const t = (contractTitle ?? "").toLowerCase();
  if (t.includes("irrigat")) return "Irrigation";
  if (t.includes("snow")) return "Snow Removal";
  if (t.includes("tree")) return "Tree Care";
  if (t.includes("enhanc") || t.includes("mulch") || t.includes("install")) {
    return "Enhancement";
  }
  return "Maintenance";
}

function mapExceptionStatus(params: {
  status: string;
  total: number;
  amountPaid: number;
}): ArExceptionStatus {
  if (params.status === "disputed") return "Disputed";
  const balance = Math.max(0, params.total - params.amountPaid);
  if (params.amountPaid > 0.01 && balance > 0.01) return "Short-Paid";
  return "Clean";
}

function customerName(
  customers: { name: string } | { name: string }[] | null | undefined
) {
  if (!customers) return "Unknown customer";
  if (Array.isArray(customers)) return customers[0]?.name ?? "Unknown customer";
  return customers.name;
}

function contractTitle(
  contracts: { title: string } | { title: string }[] | null | undefined
) {
  if (!contracts) return null;
  if (Array.isArray(contracts)) return contracts[0]?.title ?? null;
  return contracts.title;
}

type RawPayment = {
  payment_date: string | null;
  amount: number | null;
  applied_amount?: number | null;
  invoice_id?: string | null;
};

type RawInvoice = {
  id: string;
  customer_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: string;
  total: number;
  amount_paid: number;
  customers?: { name: string } | { name: string }[] | null;
  contracts?: { title: string } | { title: string }[] | null;
  payments?: RawPayment[] | null;
};

function paymentEvents(raw: RawPayment[] | null | undefined): ArPaymentEvent[] {
  const events: ArPaymentEvent[] = [];
  for (const p of raw ?? []) {
    if (!p.payment_date) continue;
    const amount = Number(p.applied_amount ?? p.amount ?? 0);
    if (amount <= 0) continue;
    events.push({ payment_date: p.payment_date, amount });
  }
  events.sort((a, b) => a.payment_date.localeCompare(b.payment_date));
  return events;
}

function mapInvoice(row: RawInvoice): ArInvoice {
  const name = customerName(row.customers);
  const title = contractTitle(row.contracts);
  const payments = paymentEvents(row.payments);
  const billed = Number(row.total);
  const paidFromColumn = Number(row.amount_paid);
  const paidFromEvents = payments.reduce((s, p) => s + p.amount, 0);
  const amountPaid = Math.max(paidFromColumn, paidFromEvents);
  const lastPayment =
    payments.length > 0 ? payments[payments.length - 1]!.payment_date : null;

  return {
    id: row.id,
    invoice_number: row.invoice_number,
    customer_id: row.customer_id,
    customer: name,
    property: title ?? name,
    service_type: inferServiceType(title),
    invoice_date: row.issue_date,
    due_date: row.due_date,
    terms: "Net 30",
    amount_billed: billed,
    amount_paid: amountPaid,
    paid_date: lastPayment,
    status: mapExceptionStatus({
      status: row.status,
      total: billed,
      amountPaid,
    }),
    dispute_reason_code: row.status === "disputed" ? "SCOPE_DISPUTE" : null,
    total: billed,
    customers: { name },
    payments,
  };
}

export function bucketOpenInvoices(
  openInvoices: ArInvoice[],
  asOf: string
): Record<AgingBucketKey, ArInvoice[]> {
  const buckets: Record<AgingBucketKey, ArInvoice[]> = {
    current: [],
    "1-30": [],
    "31-60": [],
    "61-90": [],
    "90+": [],
  };

  for (const invoice of openInvoices) {
    const balance = invoice.amount_billed - invoice.amount_paid;
    if (balance <= 0.01) continue;

    const daysOverdue = daysBetween(invoice.due_date, asOf);

    if (daysOverdue <= 0) buckets.current.push(invoice);
    else if (daysOverdue <= 30) buckets["1-30"].push(invoice);
    else if (daysOverdue <= 60) buckets["31-60"].push(invoice);
    else if (daysOverdue <= 90) buckets["61-90"].push(invoice);
    else buckets["90+"].push(invoice);
  }

  return buckets;
}

/**
 * Load AR Aging from live Contracts / Invoices / Payments (Supabase).
 * Excludes draft and voided invoices from the portfolio.
 */
export async function loadAccountantArAgingData(asOfDate: Date = new Date()) {
  const supabase = await createDataClient();
  const asOf = toIsoDate(asOfDate);

  const [{ data, error }, { data: contractRows }] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id, customer_id, invoice_number, issue_date, due_date, status, total, amount_paid, customers(name), contracts(title), payments(payment_date, amount, applied_amount, invoice_id)"
      )
      .not("status", "in", "(draft,voided)")
      .order("issue_date", { ascending: true }),
    supabase
      .from("contracts")
      .select("customers(name)")
      .eq("status", "active"),
  ]);

  if (error) {
    console.error("loadAccountantArAgingData", error);
  }

  const invoices = ((data ?? []) as RawInvoice[]).map(mapInvoice);
  const openInvoices = invoices.filter(
    (inv) => inv.amount_billed - inv.amount_paid > 0.01
  );

  const customerNames = new Set<string>();
  for (const inv of invoices) {
    if (inv.customer) customerNames.add(inv.customer);
  }
  for (const row of contractRows ?? []) {
    const name = customerName(
      (row as { customers?: { name: string } | { name: string }[] | null })
        .customers
    );
    if (name && name !== "Unknown customer") customerNames.add(name);
  }

  return {
    asOf,
    invoices,
    openInvoices,
    buckets: bucketOpenInvoices(openInvoices, asOf),
    customerNames: Array.from(customerNames).sort((a, b) =>
      a.localeCompare(b)
    ),
    error: error?.message ?? null,
  };
}
