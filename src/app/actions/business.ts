"use server";

import { revalidatePath } from "next/cache";
import { createDataClient } from "@/lib/auth-access";
import { buildPaymentMethodDisplayLabel } from "@/lib/customer-payment-methods";
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

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();

  if (!invoice) return;

  const { error: paymentError } = await supabase.from("payments").insert({
    invoice_id: invoiceId,
    amount,
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: paymentMethod,
    notes: notes || null,
  });

  if (paymentError) return;

  const newAmountPaid = Number(invoice.amount_paid) + amount;
  const newStatus =
    newAmountPaid >= Number(invoice.total) ? "paid" : invoice.status;

  await supabase
    .from("invoices")
    .update({ amount_paid: newAmountPaid, status: newStatus })
    .eq("id", invoiceId);

  revalidatePath("/invoices");
  revalidatePath("/payments");
  revalidatePath("/reports/ar-aging");
  revalidatePath("/reports/profitability");
}

export async function customerPayInvoice(formData: FormData): Promise<void> {
  const invoiceId = formData.get("invoice_id") as string;
  const methodId = ((formData.get("payment_method_id") as string) || "").trim();
  const isNew = formData.get("is_new_method") === "1";
  const newNickname = ((formData.get("new_method_nickname") as string) || "").trim();
  const newDetails = ((formData.get("new_method_details") as string) || "").trim();

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

  const balance = Number(invoice.total) - Number(invoice.amount_paid);
  if (balance <= 0) return;

  let paymentMethodLabel = "Card ending in 4242";

  if (isNew && customerId) {
    const displayLabel = buildPaymentMethodDisplayLabel(
      newNickname,
      newDetails
    );
    if (!displayLabel) return;

    const { data: saved, error } = await supabase
      .from("customer_payment_methods")
      .insert({
        customer_id: customerId,
        nickname: newNickname || null,
        display_label: displayLabel,
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
    // Fallback if role missing customer id but method selected by id
    const { data: method } = await supabase
      .from("customer_payment_methods")
      .select("display_label")
      .eq("id", methodId)
      .single();
    if (method) paymentMethodLabel = method.display_label;
  }

  const paymentFormData = new FormData();
  paymentFormData.set("invoice_id", invoiceId);
  paymentFormData.set("amount", balance.toString());
  paymentFormData.set("payment_method", paymentMethodLabel);
  paymentFormData.set("notes", "Customer portal payment");

  await recordPayment(paymentFormData);
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
}
