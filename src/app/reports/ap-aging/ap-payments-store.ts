import type { ApInvoice } from "./ap-types";

const AP_PAID_KEY = "greenscape-ap-paid-ids";
const AP_PENDING_KEY = "greenscape-ap-pending-approval-ids";
const AP_APPROVED_KEY = "greenscape-ap-approved-ids";
export const AP_PAYMENTS_UPDATED_EVENT = "greenscape-ap-payments-updated";

function readIdList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

function writeIdList(key: string, ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(ids));
  window.dispatchEvent(new Event(AP_PAYMENTS_UPDATED_EVENT));
}

export function loadPaidApInvoiceIds(): string[] {
  return readIdList(AP_PAID_KEY);
}

export function loadPendingApApprovalIds(): string[] {
  return readIdList(AP_PENDING_KEY);
}

export function loadApprovedApInvoiceIds(): string[] {
  return readIdList(AP_APPROVED_KEY);
}

export type ApPaymentGateStatus =
  | "open"
  | "awaiting_approval"
  | "approved"
  | "paid";

export function getApPaymentGateStatus(invoiceId: string): ApPaymentGateStatus {
  if (readIdList(AP_PAID_KEY).includes(invoiceId)) return "paid";
  if (readIdList(AP_APPROVED_KEY).includes(invoiceId)) return "approved";
  if (readIdList(AP_PENDING_KEY).includes(invoiceId)) return "awaiting_approval";
  return "open";
}

/** Accountant requested manager approval for this invoice payment. */
export function requestApPaymentApproval(invoiceId: string) {
  const pending = new Set(readIdList(AP_PENDING_KEY));
  pending.add(invoiceId);
  const approved = new Set(readIdList(AP_APPROVED_KEY));
  approved.delete(invoiceId);
  writeIdList(AP_APPROVED_KEY, [...approved]);
  writeIdList(AP_PENDING_KEY, [...pending]);
}

/** Manager approved the vendor payment. */
export function approveApPayment(invoiceId: string) {
  const pending = new Set(readIdList(AP_PENDING_KEY));
  pending.delete(invoiceId);
  const approved = new Set(readIdList(AP_APPROVED_KEY));
  approved.add(invoiceId);
  writeIdList(AP_PENDING_KEY, [...pending]);
  writeIdList(AP_APPROVED_KEY, [...approved]);
}

/** Mark a vendor invoice paid so AP KPIs and upcoming lists refresh. */
export function markApInvoicePaid(invoiceId: string) {
  const paid = new Set(readIdList(AP_PAID_KEY));
  paid.add(invoiceId);
  const pending = new Set(readIdList(AP_PENDING_KEY));
  pending.delete(invoiceId);
  const approved = new Set(readIdList(AP_APPROVED_KEY));
  approved.delete(invoiceId);
  writeIdList(AP_PENDING_KEY, [...pending]);
  writeIdList(AP_APPROVED_KEY, [...approved]);
  writeIdList(AP_PAID_KEY, [...paid]);
}

/**
 * Pay an invoice only after manager approval.
 * Returns false if approval is still required.
 */
export function payApInvoiceIfApproved(invoiceId: string): boolean {
  if (getApPaymentGateStatus(invoiceId) !== "approved") return false;
  markApInvoicePaid(invoiceId);
  return true;
}

export function applyPaidApOverrides(invoices: ApInvoice[]): ApInvoice[] {
  const paid = new Set(readIdList(AP_PAID_KEY));
  if (paid.size === 0) return invoices;
  return invoices.map((inv) =>
    paid.has(inv.id) ? { ...inv, status: "paid" as const } : inv
  );
}

/** Marker embedded in chat so the manager UI can approve the invoice. */
export function apApprovalMarker(invoiceId: string) {
  return `[AP-APPROVE:${invoiceId}]`;
}

export function parseApApprovalMarker(body: string): string | null {
  const match = body.match(/\[AP-APPROVE:([^\]]+)\]/);
  return match?.[1] ?? null;
}
