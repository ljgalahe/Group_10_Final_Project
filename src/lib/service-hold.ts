/**
 * Automatic Credit Hold / Service Hold.
 * Derived from open invoices that are 30+ days past due — no hard-coded customer list.
 */

import { isOpenInvoiceStatus } from "@/lib/payment-utils";

export const SERVICE_HOLD_THRESHOLD_DAYS = 30;

export type HoldInvoice = {
  id: string;
  invoice_number?: string | null;
  customer_id: string;
  total: number;
  amount_paid: number;
  status: string;
  due_date: string;
  customers?: { name: string } | null;
};

export type HoldVisit = {
  id: string;
  customer_id?: string | null;
  contract_id?: string | null;
  status: string;
  scheduled_date: string;
};

export type CustomerServiceHold = {
  customerId: string;
  customerName: string;
  oldestInvoiceId: string;
  oldestInvoiceNumber: string;
  oldestDueDate: string;
  daysOverdue: number;
  overdueBalance: number;
  overdueInvoiceCount: number;
  futureVisitsOnHold: number;
  reason: string;
};

export type ServiceHoldAuditEntry = {
  id: string;
  customerId: string;
  customerName: string;
  event: "applied" | "released";
  at: string;
  reason: string;
};

const AUDIT_KEY = "greenscape-service-hold-audit";
const STATE_KEY = "greenscape-service-hold-active-ids";

function todayIso(today?: string) {
  return today ?? new Date().toISOString().slice(0, 10);
}

export function invoiceOpenBalance(invoice: HoldInvoice): number {
  return (
    Math.round((Number(invoice.total) - Number(invoice.amount_paid)) * 100) /
    100
  );
}

export function daysPastDue(dueDate: string, today?: string): number {
  const end = todayIso(today);
  const start = new Date(dueDate + "T00:00:00");
  const finish = new Date(end + "T00:00:00");
  return Math.floor(
    (finish.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
}

/** Open invoice with balance that is 30+ days past due. */
export function isInvoiceTriggeringServiceHold(
  invoice: HoldInvoice,
  today?: string
): boolean {
  if (
    invoice.status === "canceled" ||
    invoice.status === "voided" ||
    invoice.status === "paid" ||
    invoice.status === "draft"
  ) {
    return false;
  }
  if (!isOpenInvoiceStatus(invoice.status) && invoice.status !== "overdue") {
    // still allow past_due / overdue / sent with balance
    if (invoiceOpenBalance(invoice) <= 0) return false;
  }
  const balance = invoiceOpenBalance(invoice);
  if (balance <= 0) return false;
  return daysPastDue(invoice.due_date, today) >= SERVICE_HOLD_THRESHOLD_DAYS;
}

function visitCustomerId(
  visit: HoldVisit,
  contractCustomerById?: Map<string, string>
): string | undefined {
  if (visit.customer_id) return visit.customer_id;
  if (visit.contract_id && contractCustomerById) {
    return contractCustomerById.get(visit.contract_id);
  }
  return undefined;
}

/**
 * Build Service Hold rows for every customer with at least one 30+ day overdue
 * open invoice. Optionally attach counts of future scheduled visits that will
 * display as On Hold.
 */
export function buildCustomerServiceHolds(
  invoices: HoldInvoice[],
  visits: HoldVisit[] = [],
  options?: {
    today?: string;
    contractCustomerById?: Map<string, string>;
  }
): CustomerServiceHold[] {
  const today = todayIso(options?.today);
  const byCustomer = new Map<
    string,
    {
      customerName: string;
      triggers: Array<{
        id: string;
        number: string;
        due: string;
        days: number;
        balance: number;
      }>;
    }
  >();

  for (const invoice of invoices) {
    if (!isInvoiceTriggeringServiceHold(invoice, today)) continue;
    const balance = invoiceOpenBalance(invoice);
    const days = daysPastDue(invoice.due_date, today);
    const customerId = invoice.customer_id;
    let row = byCustomer.get(customerId);
    if (!row) {
      row = {
        customerName: invoice.customers?.name ?? "Unknown customer",
        triggers: [],
      };
      byCustomer.set(customerId, row);
    } else if (
      invoice.customers?.name &&
      row.customerName === "Unknown customer"
    ) {
      row.customerName = invoice.customers.name;
    }
    row.triggers.push({
      id: invoice.id,
      number: invoice.invoice_number ?? invoice.id.slice(0, 8),
      due: invoice.due_date,
      days,
      balance,
    });
  }

  const heldIds = new Set(byCustomer.keys());
  const futureOnHoldByCustomer = new Map<string, number>();
  for (const visit of visits) {
    if (visit.status !== "scheduled") continue;
    if (visit.scheduled_date < today) continue;
    const customerId = visitCustomerId(visit, options?.contractCustomerById);
    if (!customerId || !heldIds.has(customerId)) continue;
    futureOnHoldByCustomer.set(
      customerId,
      (futureOnHoldByCustomer.get(customerId) ?? 0) + 1
    );
  }

  return Array.from(byCustomer.entries())
    .map(([customerId, row]) => {
      const oldest = [...row.triggers].sort((a, b) => {
        if (b.days !== a.days) return b.days - a.days;
        return a.due.localeCompare(b.due);
      })[0];
      const overdueBalance =
        Math.round(
          row.triggers.reduce((sum, item) => sum + item.balance, 0) * 100
        ) / 100;

      return {
        customerId,
        customerName: row.customerName,
        oldestInvoiceId: oldest.id,
        oldestInvoiceNumber: oldest.number,
        oldestDueDate: oldest.due,
        daysOverdue: oldest.days,
        overdueBalance,
        overdueInvoiceCount: row.triggers.length,
        futureVisitsOnHold: futureOnHoldByCustomer.get(customerId) ?? 0,
        reason: `Automatic credit hold: ${row.triggers.length} invoice(s) are ${SERVICE_HOLD_THRESHOLD_DAYS}+ days overdue (oldest ${oldest.number}, ${oldest.days} days past due).`,
      };
    })
    .sort((a, b) => {
      if (b.daysOverdue !== a.daysOverdue) return b.daysOverdue - a.daysOverdue;
      return b.overdueBalance - a.overdueBalance;
    });
}

export function heldCustomerIdSet(
  holds: CustomerServiceHold[]
): Set<string> {
  return new Set(holds.map((row) => row.customerId));
}

export function isCustomerOnServiceHold(
  holds: CustomerServiceHold[] | Set<string>,
  customerId: string | null | undefined
): boolean {
  if (!customerId) return false;
  if (holds instanceof Set) return holds.has(customerId);
  return holds.some((row) => row.customerId === customerId);
}

export type CustomerAccountStatus = "Active" | "Service Hold";

export function customerAccountStatus(
  onHold: boolean
): CustomerAccountStatus {
  return onHold ? "Service Hold" : "Active";
}

/**
 * Display status for visits. Future scheduled visits for held customers show
 * as On Hold without deleting the underlying scheduled visit record.
 */
export function effectiveVisitDisplayStatus(
  status: string,
  scheduledDate: string,
  customerOnHold: boolean,
  today?: string
): string {
  if (!customerOnHold) return status;
  if (status !== "scheduled") return status;
  const day = todayIso(today);
  if (scheduledDate < day) return status;
  return "on_hold";
}

export function formatVisitStatusLabel(status: string): string {
  if (status === "on_hold") return "On Hold";
  if (status === "scheduled") return "Scheduled";
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  return status.replaceAll("_", " ");
}

/** Client-only: load audit history. */
export function loadServiceHoldAudit(): ServiceHoldAuditEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(AUDIT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ServiceHoldAuditEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Client-only: compare current holds to last-known set and append applied /
 * released audit events. Returns the full audit log.
 */
export function syncServiceHoldAudit(
  holds: CustomerServiceHold[]
): ServiceHoldAuditEntry[] {
  if (typeof window === "undefined") return [];

  const previousRaw = window.localStorage.getItem(STATE_KEY);
  let previousIds: string[] = [];
  try {
    previousIds = previousRaw ? (JSON.parse(previousRaw) as string[]) : [];
  } catch {
    previousIds = [];
  }

  const previous = new Set(previousIds);
  const currentIds = holds.map((row) => row.customerId);
  const current = new Set(currentIds);
  const audit = loadServiceHoldAudit();
  const now = new Date().toISOString();
  const byId = new Map(holds.map((row) => [row.customerId, row]));

  for (const hold of holds) {
    if (!previous.has(hold.customerId)) {
      audit.unshift({
        id: `${hold.customerId}-applied-${now}`,
        customerId: hold.customerId,
        customerName: hold.customerName,
        event: "applied",
        at: now,
        reason: hold.reason,
      });
    }
  }

  for (const customerId of previous) {
    if (!current.has(customerId)) {
      const priorName =
        audit.find((entry) => entry.customerId === customerId)?.customerName ??
        "Customer";
      audit.unshift({
        id: `${customerId}-released-${now}`,
        customerId,
        customerName: byId.get(customerId)?.customerName ?? priorName,
        event: "released",
        at: now,
        reason:
          "Automatic release: no invoices remain 30 or more days overdue after payment or balance update.",
      });
    }
  }

  const trimmed = audit.slice(0, 200);
  window.localStorage.setItem(AUDIT_KEY, JSON.stringify(trimmed));
  window.localStorage.setItem(STATE_KEY, JSON.stringify(currentIds));
  return trimmed;
}

export function auditForCustomer(
  audit: ServiceHoldAuditEntry[],
  customerId: string
): ServiceHoldAuditEntry[] {
  return audit.filter((entry) => entry.customerId === customerId);
}

/** Overlay On Hold display status onto schedule jobs for held customers. */
export function applyServiceHoldToScheduleJobs<
  T extends {
    customerId: string;
    status: string;
    scheduledDate: string;
  },
>(jobs: T[], heldCustomerIds: Set<string>, today?: string): (T & {
  serviceHold: boolean;
})[] {
  return jobs.map((job) => {
    const onHold = heldCustomerIds.has(job.customerId);
    return {
      ...job,
      serviceHold: onHold,
      status: effectiveVisitDisplayStatus(
        job.status,
        job.scheduledDate,
        onHold,
        today
      ),
    };
  });
}
