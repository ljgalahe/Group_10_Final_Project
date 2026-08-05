"use server";

import { revalidatePath } from "next/cache";
import { createDataClient } from "@/lib/auth-access";
import {
  buildPaymentMethodDisplayLabel,
  extractLastFour,
} from "@/lib/customer-payment-methods";
import { getViewCustomerId, getViewRole } from "@/lib/demo-role";
import type { CostType } from "@/lib/types";

export async function completeVisit(formData: FormData): Promise<void> {
  const visitId = formData.get("visit_id") as string;
  const notes = (formData.get("notes") as string) || undefined;
  const supabase = await createDataClient();
  const { error } = await supabase
    .from("service_visits")
    .update({
      status: "completed",
      crew_notes: notes ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", visitId);

  if (error) return;
  revalidatePath("/visits");
  revalidatePath("/dashboard");
}

export async function addVisitCost(formData: FormData): Promise<void> {
  const supabase = await createDataClient();
  const visitId = formData.get("visit_id") as string;
  const costType = formData.get("cost_type") as CostType;
  const description = formData.get("description") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const quantity = formData.get("quantity")
    ? parseFloat(formData.get("quantity") as string)
    : null;

  const { error } = await supabase.from("visit_costs").insert({
    visit_id: visitId,
    cost_type: costType,
    description,
    amount,
    quantity,
  });

  if (error) return;
  revalidatePath("/visits");
  revalidatePath("/reports/profitability");
}

export async function approveExtraWork(formData: FormData): Promise<void> {
  const extraWorkId = formData.get("extra_work_id") as string;
  const supabase = await createDataClient();
  const { error } = await supabase
    .from("extra_work_orders")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .eq("id", extraWorkId);

  if (error) return;
  revalidatePath("/contracts");
}

export async function generateInvoice(formData: FormData): Promise<void> {
  const contractId = formData.get("contract_id") as string;
  const supabase = await createDataClient();

  const { data: contract } = await supabase
    .from("contracts")
    .select("*, customers(*)")
    .eq("id", contractId)
    .single();

  if (!contract) return;

  const { data: extraWork } = await supabase
    .from("extra_work_orders")
    .select("*")
    .eq("contract_id", contractId)
    .eq("status", "approved");

  const { count } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true });

  const invoiceNumber = `INV-${String((count ?? 0) + 1).padStart(4, "0")}`;
  const issueDate = new Date();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const lines: { description: string; amount: number; line_type: string }[] = [];

  if (contract.monthly_fee) {
    lines.push({
      description: `Monthly maintenance — ${contract.title}`,
      amount: Number(contract.monthly_fee),
      line_type: "recurring",
    });
  }

  for (const work of extraWork ?? []) {
    lines.push({
      description: `Extra work: ${work.title}`,
      amount: Number(work.quoted_amount),
      line_type: "extra_work",
    });
  }

  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      contract_id: contractId,
      customer_id: contract.customer_id,
      invoice_number: invoiceNumber,
      issue_date: issueDate.toISOString().slice(0, 10),
      due_date: dueDate.toISOString().slice(0, 10),
      status: "sent",
      subtotal,
      total: subtotal,
      amount_paid: 0,
    })
    .select()
    .single();

  if (invoiceError || !invoice) return;

  if (lines.length > 0) {
    await supabase.from("invoice_lines").insert(
      lines.map((line) => ({
        invoice_id: invoice.id,
        ...line,
      }))
    );
  }

  revalidatePath("/invoices");
  revalidatePath("/reports/ar-aging");
}

export async function recordPayment(formData: FormData): Promise<void> {
  const supabase = await createDataClient();
  const invoiceId = formData.get("invoice_id") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const paymentMethod = (formData.get("payment_method") as string) || "simulated";
  const notes = formData.get("notes") as string;

  if (!Number.isFinite(amount) || amount <= 0) return;

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();

  if (!invoice) return;

  const balance = Number(invoice.total) - Number(invoice.amount_paid);
  if (balance <= 0) return;

  // Cap at remaining balance (supports partial payments)
  const payAmount =
    Math.round(Math.min(amount, balance) * 100) / 100;

  const { error: paymentError } = await supabase.from("payments").insert({
    invoice_id: invoiceId,
    amount: payAmount,
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: paymentMethod,
    notes: notes || null,
  });

  if (paymentError) return;

  const newAmountPaid =
    Math.round((Number(invoice.amount_paid) + payAmount) * 100) / 100;
  const newStatus =
    newAmountPaid + 0.001 >= Number(invoice.total)
      ? "paid"
      : invoice.status === "paid"
        ? "sent"
        : invoice.status;

  await supabase
    .from("invoices")
    .update({ amount_paid: newAmountPaid, status: newStatus })
    .eq("id", invoiceId);

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/payments");
  revalidatePath("/dashboard");
  revalidatePath("/reports/ar-aging");
  revalidatePath("/reports/profitability");
}

export async function customerPayInvoice(formData: FormData): Promise<void> {
  const invoiceId = formData.get("invoice_id") as string;
  const methodId = ((formData.get("payment_method_id") as string) || "").trim();
  const isNew = formData.get("is_new_method") === "1";
  const newNickname = ((formData.get("new_method_nickname") as string) || "").trim();
  const newDetails = ((formData.get("new_method_details") as string) || "").trim();
  const requestedAmount = parseFloat(
    (formData.get("amount") as string) || ""
  );

  const supabase = await createDataClient();
  const role = await getViewRole();
  const customerId =
    role === "customer" ? await getViewCustomerId() : null;

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();

  if (!invoice) return;

  // Customers may only pay their own invoices
  if (customerId && invoice.customer_id !== customerId) return;

  const balance = Number(invoice.total) - Number(invoice.amount_paid);
  if (balance <= 0) return;

  // Default to full balance if amount missing; allow any amount up to balance
  let payAmount = Number.isFinite(requestedAmount)
    ? requestedAmount
    : balance;
  payAmount = Math.round(payAmount * 100) / 100;
  if (payAmount <= 0 || payAmount > balance + 0.001) return;
  payAmount = Math.min(payAmount, balance);

  let paymentMethodLabel = "Card ending in 4242";

  if (isNew && customerId) {
    const methodTypeRaw = (
      (formData.get("new_method_type") as string) || "card"
    ).trim();
    const methodType = methodTypeRaw === "bank" ? "bank" : "card";
    const billingName = (
      (formData.get("new_method_billing_name") as string) || ""
    ).trim();
    const expMonth = parseInt(
      ((formData.get("new_method_exp_month") as string) || "").trim(),
      10
    );
    const expYear = parseInt(
      ((formData.get("new_method_exp_year") as string) || "").trim(),
      10
    );
    const makeDefault = formData.get("new_method_is_default") === "1";

    const displayLabel = buildPaymentMethodDisplayLabel(
      newNickname,
      newDetails,
      methodType
    );
    const lastFour = extractLastFour(newDetails);
    if (!displayLabel || !lastFour) return;

    const validExpMonth =
      Number.isFinite(expMonth) && expMonth >= 1 && expMonth <= 12;
    const validExpYear = Number.isFinite(expYear) && expYear >= 2024;

    if (makeDefault) {
      await supabase
        .from("customer_payment_methods")
        .update({ is_default: false })
        .eq("customer_id", customerId);
    }

    const { count } = await supabase
      .from("customer_payment_methods")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId);
    const isFirst = (count ?? 0) === 0;

    const { data: saved, error } = await supabase
      .from("customer_payment_methods")
      .insert({
        customer_id: customerId,
        nickname: newNickname || null,
        display_label: displayLabel,
        method_type: methodType,
        last_four: lastFour,
        billing_name: billingName || null,
        expires_month:
          methodType === "card" && validExpMonth ? expMonth : null,
        expires_year: methodType === "card" && validExpYear ? expYear : null,
        is_default: makeDefault || isFirst,
      })
      .select("display_label")
      .single();

    if (error || !saved) return;
    paymentMethodLabel = saved.display_label;
  } else if (methodId && customerId) {
    const { data: method } = await supabase
      .from("customer_payment_methods")
      .select("display_label")
      .eq("id", methodId)
      .eq("customer_id", customerId)
      .single();

    if (!method) return;
    paymentMethodLabel = method.display_label;
  } else if (methodId) {
    const { data: method } = await supabase
      .from("customer_payment_methods")
      .select("display_label")
      .eq("id", methodId)
      .single();
    if (method) paymentMethodLabel = method.display_label;
  }

  const paymentFormData = new FormData();
  paymentFormData.set("invoice_id", invoiceId);
  paymentFormData.set("amount", payAmount.toFixed(2));
  paymentFormData.set("payment_method", paymentMethodLabel);
  paymentFormData.set(
    "notes",
    payAmount + 0.001 >= balance
      ? "Customer portal payment (full)"
      : "Customer portal payment (partial)"
  );

  await recordPayment(paymentFormData);
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
}
