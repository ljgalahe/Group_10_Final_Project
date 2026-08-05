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
  const invoiceId = (formData.get("invoice_id") as string) || null;
  const customerId = (formData.get("customer_id") as string) || null;
  const applyMode = (formData.get("apply_mode") as string) || "invoice";
  const amount = parseFloat(formData.get("amount") as string);
  const paymentMethod = (formData.get("payment_method") as string) || "check";
  const notes = (formData.get("notes") as string) || null;
  const paymentDate =
    (formData.get("payment_date") as string) || new Date().toISOString().slice(0, 10);
  const redirectTo = (formData.get("redirect_to") as string) || "/payments";

  if (!amount || amount <= 0) {
    return { ok: false, error: "validation", message: "Enter a valid payment amount." };
  }

  const isUnapplied = applyMode === "unapplied" || !invoiceId;

  if (isUnapplied && !customerId) {
    return {
      ok: false,
      error: "validation",
      message: "Select a customer for unapplied cash receipts.",
    };
  }

  let invoice: {
    id: string;
    invoice_number: string;
    customer_id: string;
    total: number;
    amount_paid: number;
    due_date: string;
    status: string;
  } | null = null;

  if (!isUnapplied && invoiceId) {
    const { data } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .single();
    invoice = data;
    if (!invoice) {
      return { ok: false, error: "validation", message: "Invoice not found." };
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
  }

  const paymentNumber = await nextPaymentNumber(supabase);

  let appliedAmount = 0;
  let unappliedAmount = amount;
  let resolvedCustomerId = customerId;

  if (invoice) {
    resolvedCustomerId = invoice.customer_id;
    const balanceDue = getOutstandingBalance(
      Number(invoice.total),
      Number(invoice.amount_paid)
    );
    appliedAmount = Math.min(amount, balanceDue);
    unappliedAmount = Math.max(0, amount - appliedAmount);
  }

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      payment_number: paymentNumber,
      invoice_id: invoice?.id ?? null,
      customer_id: resolvedCustomerId,
      amount,
      applied_amount: appliedAmount,
      unapplied_amount: unappliedAmount,
      payment_date: paymentDate,
      payment_method: paymentMethod,
      notes,
    })
    .select()
    .single();

  if (paymentError || !payment) {
    return { ok: false, error: "validation", message: "Failed to record payment." };
  }

  if (invoice && appliedAmount > 0) {
    const newAmountPaid = Number(invoice.amount_paid) + appliedAmount;
    const newStatus = deriveStoredStatus(invoice, newAmountPaid);

    await supabase
      .from("invoices")
      .update({ amount_paid: newAmountPaid, status: newStatus })
      .eq("id", invoice.id);

    let activityDetails = `${paymentNumber}: $${appliedAmount.toFixed(2)} applied via ${paymentMethod.replace(/_/g, " ")} on ${paymentDate}`;
    if (unappliedAmount > 0) {
      activityDetails += ` ($${unappliedAmount.toFixed(2)} recorded as unapplied cash)`;
    }

    await logInvoiceActivity(
      supabase,
      invoice.id,
      "Payment recorded",
      activityDetails
    );
  }

  revalidatePath("/invoices");
  revalidatePath("/payments");
  if (invoice) revalidatePath(`/invoices/${invoice.id}`);
  revalidatePath("/reports/ar-aging");
  revalidatePath("/reports/profitability");

  if (redirectTo.startsWith("/")) {
    redirect(redirectTo);
  }

  return { ok: true };
}

export type ApplyUnappliedCashResult =
  | { ok: true }
  | { ok: false; error: "validation"; message: string };

export async function applyUnappliedCashAction(
  _prev: ApplyUnappliedCashResult | null,
  formData: FormData
): Promise<ApplyUnappliedCashResult> {
  const supabase = await createDataClient();
  const paymentId = formData.get("payment_id") as string;
  const invoiceId = formData.get("invoice_id") as string;
  const redirectTo =
    (formData.get("redirect_to") as string) || `/invoices/${invoiceId}`;

  if (!paymentId || !invoiceId) {
    return { ok: false, error: "validation", message: "Missing payment or invoice." };
  }

  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .single();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();

  if (!payment || !invoice) {
    return { ok: false, error: "validation", message: "Payment or invoice not found." };
  }

  if (Number(payment.unapplied_amount) <= 0) {
    return { ok: false, error: "validation", message: "No unapplied cash available on this payment." };
  }

  if (payment.customer_id !== invoice.customer_id) {
    return {
      ok: false,
      error: "validation",
      message: "Unapplied cash must belong to the same customer as the invoice.",
    };
  }

  const balanceDue = getOutstandingBalance(
    Number(invoice.total),
    Number(invoice.amount_paid)
  );

  if (balanceDue <= 0) {
    return { ok: false, error: "validation", message: "This invoice has no outstanding balance." };
  }

  const amountToApply = Math.min(Number(payment.unapplied_amount), balanceDue);
  const newUnapplied = Number(payment.unapplied_amount) - amountToApply;
  const newApplied = Number(payment.applied_amount ?? 0) + amountToApply;

  const { error: paymentUpdateError } = await supabase
    .from("payments")
    .update({
      unapplied_amount: newUnapplied,
      applied_amount: newApplied,
      invoice_id: payment.invoice_id ?? invoiceId,
    })
    .eq("id", paymentId);

  if (paymentUpdateError) {
    return { ok: false, error: "validation", message: "Failed to apply unapplied cash." };
  }

  const newAmountPaid = Number(invoice.amount_paid) + amountToApply;
  const newStatus = deriveStoredStatus(invoice, newAmountPaid);

  await supabase
    .from("invoices")
    .update({ amount_paid: newAmountPaid, status: newStatus })
    .eq("id", invoiceId);

  await logInvoiceActivity(
    supabase,
    invoiceId,
    "Unapplied cash applied",
    `${payment.payment_number}: ${amountToApply.toFixed(2)} applied to ${invoice.invoice_number}${
      newUnapplied > 0 ? ` (${newUnapplied.toFixed(2)} still unapplied)` : ""
    }`
  );

  revalidatePath("/invoices");
  revalidatePath("/payments");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath(`/payments/${paymentId}`);
  revalidatePath("/reports/ar-aging");

  if (redirectTo.startsWith("/")) {
    redirect(redirectTo);
  }

  return { ok: true };
}
