"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createDataClient } from "@/lib/auth-access";
import { logInvoiceActivity } from "@/app/invoices/lib/activity";

export async function createInvoice(formData: FormData): Promise<void> {
  const supabase = await createDataClient();
  const contractId = formData.get("contract_id") as string;
  const description = (formData.get("description") as string) || "Manual invoice line";
  const amount = parseFloat(formData.get("amount") as string);
  const issueDate = (formData.get("issue_date") as string) || new Date().toISOString().slice(0, 10);
  const dueDate = (formData.get("due_date") as string) || issueDate;

  const { data: contract } = await supabase
    .from("contracts")
    .select("customer_id, title")
    .eq("id", contractId)
    .single();

  if (!contract || !amount || amount <= 0) return;

  const { count } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true });

  const invoiceNumber = `INV-${String((count ?? 0) + 1).padStart(4, "0")}`;

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      contract_id: contractId,
      customer_id: contract.customer_id,
      invoice_number: invoiceNumber,
      issue_date: issueDate,
      due_date: dueDate,
      status: "draft",
      subtotal: amount,
      total: amount,
      amount_paid: 0,
    })
    .select()
    .single();

  if (error || !invoice) return;

  await supabase.from("invoice_lines").insert({
    invoice_id: invoice.id,
    description,
    amount,
    line_type: "manual",
  });

  await logInvoiceActivity(
    supabase,
    invoice.id,
    "Invoice created",
    `${invoiceNumber} created as Draft for ${contract.title}`
  );

  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}`);
}

export async function updateInvoiceStatus(formData: FormData): Promise<void> {
  const supabase = await createDataClient();
  const invoiceId = formData.get("invoice_id") as string;
  const newStatus = formData.get("status") as string;

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();

  if (!invoice) return;

  const labels: Record<string, string> = {
    approved: "Approved",
    sent: "Sent",
    voided: "Voided",
  };

  const { error } = await supabase
    .from("invoices")
    .update({ status: newStatus })
    .eq("id", invoiceId);

  if (error) return;

  await logInvoiceActivity(
    supabase,
    invoiceId,
    `Status changed to ${labels[newStatus] ?? newStatus}`,
    `Invoice ${invoice.invoice_number} updated by accountant`
  );

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/reports/ar-aging");
}

export async function sendPaymentReminder(formData: FormData): Promise<void> {
  const supabase = await createDataClient();
  const invoiceId = formData.get("invoice_id") as string;

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, customers(name, contact_email)")
    .eq("id", invoiceId)
    .single();

  if (!invoice) return;

  const customer = invoice.customers as {
    name: string;
    contact_email: string | null;
  } | null;

  const balance =
    Number(invoice.total) - Number(invoice.amount_paid);
  const email = customer?.contact_email ?? "customer on file";

  await logInvoiceActivity(
    supabase,
    invoiceId,
    "Payment reminder sent",
    `Overdue balance of $${balance.toFixed(2)} — reminder emailed to ${email} (${customer?.name ?? "customer"})`
  );

  revalidatePath(`/invoices/${invoiceId}`);
}
