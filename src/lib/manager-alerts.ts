/**
 * Manager Alerts Center — prioritized operational/financial issues
 * derived from live invoices, contracts, visits, equipment, and risk data.
 */

import type { CustomerCollectionRisk } from "@/lib/collection-risk";
import type { CategoryLeaderboard } from "@/lib/company-performance";
import { isOpenInvoiceStatus } from "@/lib/payment-utils";
import {
  daysPastDue,
  invoiceOpenBalance,
  SERVICE_HOLD_THRESHOLD_DAYS,
  type CustomerServiceHold,
  type HoldInvoice,
} from "@/lib/service-hold";

export type AlertPriority = "critical" | "high" | "medium" | "low";

export type ManagerAlert = {
  id: string;
  title: string;
  explanation: string;
  priority: AlertPriority;
  count: number;
  href: string;
  icon: "hold" | "warning" | "profit" | "risk" | "crew" | "equipment" | "invoice" | "contract";
};

const PRIORITY_RANK: Record<AlertPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/** Days past due band that is approaching the automatic Service Hold threshold. */
export const APPROACHING_HOLD_MIN_DAYS = 21;

type AlertInvoice = HoldInvoice & {
  issue_date?: string | null;
  contract_id?: string | null;
};

type AlertContract = {
  id: string;
  title: string;
  status: string;
  season_end?: string | null;
  customer_id: string;
};

type AlertEquipment = {
  id: string;
  name: string;
  status: string;
  estimated_total_hours: number;
  hours_used: number;
};

type ProfitRow = {
  contractId: string;
  title: string;
  margin: number;
  marginPct: number;
};

type PendingChange = {
  id: string;
  contract_id: string;
  status: string;
};

export type ManagerAlertsInput = {
  today: string;
  serviceHolds: CustomerServiceHold[];
  invoices: AlertInvoice[];
  contracts: AlertContract[];
  profitability: ProfitRow[];
  customerRisk: CustomerCollectionRisk[];
  performanceCategories: CategoryLeaderboard[];
  equipment: AlertEquipment[];
  pendingChangeRequests: PendingChange[];
};

function daysUntilDue(dueDate: string, today: string): number {
  const start = new Date(today + "T00:00:00");
  const end = new Date(dueDate + "T00:00:00");
  return Math.floor(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function openInvoices(invoices: AlertInvoice[]): AlertInvoice[] {
  return invoices.filter((invoice) => {
    if (
      invoice.status === "canceled" ||
      invoice.status === "voided" ||
      invoice.status === "paid" ||
      invoice.status === "draft"
    ) {
      return false;
    }
    if (!isOpenInvoiceStatus(invoice.status) && invoice.status !== "overdue") {
      if (invoiceOpenBalance(invoice) <= 0) return false;
    }
    return invoiceOpenBalance(invoice) > 0;
  });
}

/**
 * Build prioritized manager alerts from current application data.
 * Returns only alerts with count > 0, sorted critical → low.
 */
export function buildManagerAlerts(input: ManagerAlertsInput): ManagerAlert[] {
  const {
    today,
    serviceHolds,
    invoices,
    contracts,
    profitability,
    customerRisk,
    performanceCategories,
    equipment,
    pendingChangeRequests,
  } = input;

  const alerts: ManagerAlert[] = [];
  const open = openInvoices(invoices);
  const heldIds = new Set(serviceHolds.map((hold) => hold.customerId));

  // 1. Customers on Service Hold
  if (serviceHolds.length > 0) {
    alerts.push({
      id: "service-hold",
      title: "Customers on Service Hold",
      explanation: `${serviceHolds.length} customer${serviceHolds.length === 1 ? "" : "s"} blocked from new service due to invoices ${SERVICE_HOLD_THRESHOLD_DAYS}+ days overdue.`,
      priority: "critical",
      count: serviceHolds.length,
      href: "/reports/ar-aging?hold=1",
      icon: "hold",
    });
  }

  // 2. Approaching Service Hold (21–29 days past due, not already held)
  const approachingCustomerIds = new Set<string>();
  for (const invoice of open) {
    if (heldIds.has(invoice.customer_id)) continue;
    const days = daysPastDue(invoice.due_date, today);
    if (
      days >= APPROACHING_HOLD_MIN_DAYS &&
      days < SERVICE_HOLD_THRESHOLD_DAYS
    ) {
      approachingCustomerIds.add(invoice.customer_id);
    }
  }
  if (approachingCustomerIds.size > 0) {
    alerts.push({
      id: "approaching-hold",
      title: "Customers approaching Service Hold",
      explanation: `${approachingCustomerIds.size} customer${approachingCustomerIds.size === 1 ? "" : "s"} have invoices ${APPROACHING_HOLD_MIN_DAYS}–${SERVICE_HOLD_THRESHOLD_DAYS - 1} days overdue and are nearing automatic credit hold.`,
      priority: "high",
      count: approachingCustomerIds.size,
      href: "/reports/ar-aging?approaching=1",
      icon: "warning",
    });
  }

  // 3. Low profitability contracts
  const lowProfit = profitability.filter(
    (row) => row.margin < 0 || row.marginPct < 15
  );
  if (lowProfit.length > 0) {
    alerts.push({
      id: "low-profit",
      title: "Contracts with low profitability",
      explanation: `${lowProfit.length} contract${lowProfit.length === 1 ? "" : "s"} are below a healthy margin target or currently unprofitable.`,
      priority: lowProfit.some((row) => row.margin < 0) ? "high" : "medium",
      count: lowProfit.length,
      href: "/reports/profitability?low=1",
      icon: "profit",
    });
  }

  // 4. High collection risk
  const highRisk = customerRisk.filter((row) => row.risk === "high");
  if (highRisk.length > 0) {
    alerts.push({
      id: "high-risk",
      title: "Customers with high collection risk",
      explanation: `${highRisk.length} customer${highRisk.length === 1 ? "" : "s"} show elevated overdue exposure and collection pressure.`,
      priority: "high",
      count: highRisk.length,
      href: "/payments?risk=high#collection-risk",
      icon: "risk",
    });
  }

  // 5. Crews below efficiency targets
  const crewCategory = performanceCategories.find((c) => c.category === "crew");
  const weakCrews =
    crewCategory?.entries.filter(
      (entry) =>
        entry.badge === "Needs Attention" ||
        entry.badge === "Monitor" ||
        entry.score < 50
    ) ?? [];
  if (weakCrews.length > 0) {
    alerts.push({
      id: "crew-efficiency",
      title: "Crews below efficiency targets",
      explanation: `${weakCrews.length} crew${weakCrews.length === 1 ? "" : "s"} need attention on completion rate, labor intensity, or rework signals.`,
      priority: weakCrews.some((c) => c.badge === "Needs Attention")
        ? "medium"
        : "low",
      count: weakCrews.length,
      href: "/dashboard?perf=crew#company-performance",
      icon: "crew",
    });
  }

  // 6. Equipment due for maintenance / replacement planning
  const maintenanceEquipment = equipment.filter((asset) => {
    if (asset.status === "maintenance") return true;
    if (asset.status === "retired") return false;
    const lifePct =
      asset.estimated_total_hours > 0
        ? (Number(asset.hours_used) / asset.estimated_total_hours) * 100
        : 0;
    return lifePct >= 85;
  });
  if (maintenanceEquipment.length > 0) {
    alerts.push({
      id: "equipment-maintenance",
      title: "Equipment due for maintenance",
      explanation: `${maintenanceEquipment.length} asset${maintenanceEquipment.length === 1 ? "" : "s"} are in maintenance or near end of estimated service life.`,
      priority: "medium",
      count: maintenanceEquipment.length,
      href: "/dashboard?perf=equipment#company-performance",
      icon: "equipment",
    });
  }

  // 7. Invoices becoming overdue soon (due within 7 days, still current)
  const dueSoon = open.filter((invoice) => {
    const until = daysUntilDue(invoice.due_date, today);
    return until >= 0 && until <= 7;
  });
  if (dueSoon.length > 0) {
    alerts.push({
      id: "invoices-due-soon",
      title: "Invoices becoming overdue soon",
      explanation: `${dueSoon.length} open invoice${dueSoon.length === 1 ? "" : "s"} ${dueSoon.length === 1 ? "is" : "are"} due within the next 7 days.`,
      priority: "medium",
      count: dueSoon.length,
      href: "/invoices?due=soon",
      icon: "invoice",
    });
  }

  // 8. Contracts requiring manager review
  const pendingReviews = pendingChangeRequests.filter(
    (row) => row.status === "pending"
  );
  const expiringContracts = contracts.filter((contract) => {
    if (contract.status !== "active" || !contract.season_end) return false;
    const until = daysUntilDue(contract.season_end, today);
    return until >= 0 && until <= 45;
  });
  const reviewCount = pendingReviews.length + expiringContracts.length;
  if (reviewCount > 0) {
    const parts: string[] = [];
    if (pendingReviews.length > 0) {
      parts.push(
        `${pendingReviews.length} pending change request${pendingReviews.length === 1 ? "" : "s"}`
      );
    }
    if (expiringContracts.length > 0) {
      parts.push(
        `${expiringContracts.length} contract${expiringContracts.length === 1 ? "" : "s"} ending within 45 days`
      );
    }
    alerts.push({
      id: "contract-review",
      title: "Contracts requiring manager review",
      explanation: `${parts.join(" and ")}.`,
      priority: pendingReviews.length > 0 ? "medium" : "low",
      count: reviewCount,
      href: "/contracts",
      icon: "contract",
    });
  }

  return alerts.sort((a, b) => {
    const rank = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (rank !== 0) return rank;
    return b.count - a.count;
  });
}
