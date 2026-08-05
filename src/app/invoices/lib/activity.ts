import { createDataClient } from "@/lib/auth-access";
import { getDisplayInvoiceStatus } from "@/app/invoices/lib/accounting";

export async function logInvoiceActivity(
  supabase: Awaited<ReturnType<typeof createDataClient>>,
  invoiceId: string,
  action: string,
  details?: string
) {
  await supabase.from("invoice_activity").insert({
    invoice_id: invoiceId,
    action,
    details: details ?? null,
  });
}

export function deriveStoredStatus(
  invoice: { total: number; amount_paid: number; due_date: string; status: string },
  amountPaid: number
) {
  const display = getDisplayInvoiceStatus({ ...invoice, amount_paid: amountPaid });
  if (display === "paid") return "paid";
  if (display === "partially_paid") return "partially_paid";
  if (display === "past_due") return "past_due";
  return invoice.status;
}
