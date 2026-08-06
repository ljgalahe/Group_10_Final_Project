"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createDataClient } from "@/lib/auth-access";
import {
  deriveStoredStatus,
  logInvoiceActivity,
} from "@/app/invoices/lib/activity";
import {
  formatDuplicatePaymentMessage,
  getOutstandingBalance,
} from "@/app/invoices/lib/accounting";
import { nextPaymentNumber } from "@/app/payments/lib/payment-id";

export type RecordPaymentResult =
  | { ok: true }
  | { ok: false; error: "duplicate" | "validation"; message: string };

export async function recordPaymentAction(
  _prev: RecordPaymentResult | null,
  formData: FormData
): Promise<RecordPaymentResult> {
  const supabase = await createDataClient();
  const invoiceId = formData.get("invoice_id") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const paymentMethod = (formData.get("payment_method") as string) || "check";
  const notes = (formData.get("notes") as string) || null;
  const paymentDate =
    (formData.get("payment_date") as string) || new Date().toISOString().slice(0, 10);
  const redirectTo = (formData.get("redirect_to") as string) || "/payments";

  if (!invoiceId) {
    return {
      ok: false,
      error: "validation",
      message: "Select an invoice for this payment.",
    };
  }

  if (!amount || amount <= 0) {
    return { ok: false, error: "validation", message: "Enter a valid payment amount." };
  }

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();

  if (!invoice) {
    return { ok: false, error: "validation", message: "Invoice not found." };
  }

  const balanceDue = getOutstandingBalance(
    Number(invoice.total),
    Number(invoice.amount_paid)
  );

  if (balanceDue <= 0) {
    return {
      ok: false,
      error: "validation",
      message: "This invoice has no outstanding balance.",
    };
  }

  if (amount > balanceDue) {
    return {
      ok: false,
      error: "validation",
      message: `Payment amount cannot exceed the outstanding balance of $${balanceDue.toFixed(2)}.`,
    };
  }

  const { data: existingPayments } = await supabase
    .from("payments")
    .select("id, amount, payment_date, payment_number")
    .eq("invoice_id", invoiceId)
    .eq("amount", amount)
    .eq("payment_date", paymentDate);

  if (existingPayments && existingPayments.length > 0) {
    return {
      ok: false,
      error: "duplicate",
      message: formatDuplicatePaymentMessage(
        invoice.invoice_number,
        amount,
        existingPayments[0].payment_date
      ),
    };
  }

  const paymentNumber = await nextPaymentNumber(supabase);

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      payment_number: paymentNumber,
      invoice_id: invoice.id,
      customer_id: invoice.customer_id,
      amount,
      applied_amount: amount,
      unapplied_amount: 0,
      payment_date: paymentDate,
      payment_method: paymentMethod,
      notes,
    })
    .select()
    .single();

  if (paymentError || !payment) {
    return { ok: false, error: "validation", message: "Failed to record payment." };
  }

  const newAmountPaid = Number(invoice.amount_paid) + amount;
  const newStatus = deriveStoredStatus(invoice, newAmountPaid);

  await supabase
    .from("invoices")
    .update({ amount_paid: newAmountPaid, status: newStatus })
    .eq("id", invoice.id);

  await logInvoiceActivity(
    supabase,
    invoice.id,
    "Payment recorded",
    `${paymentNumber}: $${amount.toFixed(2)} applied via ${paymentMethod.replace(/_/g, " ")} on ${paymentDate}`
  );

  revalidatePath("/invoices");
  revalidatePath("/payments");
  revalidatePath(`/invoices/${invoice.id}`);
  revalidatePath("/reports/ar-aging");
  revalidatePath("/reports/profitability");

  if (redirectTo.startsWith("/")) {
    redirect(redirectTo);
  }

  return { ok: true };
}
