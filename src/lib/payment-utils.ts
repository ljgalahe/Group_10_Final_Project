import type { InvoiceStatus, PaymentMethod } from "@/lib/types";

export function normalizePaymentMethod(method: string): string {
  const map: Record<string, string> = {
    simulated_check: "check",
    simulated_ach: "ach",
    simulated_card: "card",
    check: "check",
    ach: "ach",
    card: "card",
    bank_transfer: "bank_transfer",
  };
  return map[method] ?? method;
}

export function paymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    check: "Check",
    ach: "ACH",
    card: "Card",
    bank_transfer: "Bank Transfer",
    simulated_check: "Check",
    simulated_ach: "ACH",
    simulated_card: "Card",
  };
  const key = normalizePaymentMethod(method);
  return labels[key] ?? method.replaceAll("_", " ");
}

export function isOpenInvoiceStatus(status: InvoiceStatus | string): boolean {
  return (
    status === "sent" ||
    status === "overdue" ||
    status === "past_due" ||
    status === "partially_paid"
  );
}

export function nextInvoiceStatusAfterPayment(
  currentStatus: InvoiceStatus | string,
  newAmountPaid: number,
  total: number
): InvoiceStatus {
  if (newAmountPaid <= 0) {
    if (
      currentStatus === "sent" ||
      currentStatus === "overdue" ||
      currentStatus === "past_due" ||
      currentStatus === "draft"
    ) {
      return currentStatus as InvoiceStatus;
    }
    return "sent";
  }
  if (newAmountPaid >= total) return "paid";
  return "partially_paid";
}

export function isValidPaymentMethod(method: string): method is PaymentMethod {
  return ["check", "ach", "card", "bank_transfer"].includes(method);
}

export function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}
