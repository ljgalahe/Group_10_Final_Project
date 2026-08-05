import { createDataClient } from "@/lib/auth-access";

export async function fetchContractsForInvoice() {
  const supabase = await createDataClient();
  const { data } = await supabase
    .from("contracts")
    .select("id, title, customers(name)")
    .eq("status", "active")
    .order("title");
  return (data ?? []).map((c) => ({
    id: c.id as string,
    title: c.title as string,
    customers: (c.customers as unknown as { name: string } | null) ?? null,
  }));
}

export async function fetchInvoiceActivity(invoiceId: string) {
  const supabase = await createDataClient();
  const { data } = await supabase
    .from("invoice_activity")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function fetchUnappliedCashForCustomer(customerId: string) {
  const supabase = await createDataClient();
  const { data } = await supabase
    .from("payments")
    .select("id, payment_number, unapplied_amount, payment_date, payment_method")
    .eq("customer_id", customerId)
    .gt("unapplied_amount", 0)
    .order("payment_date", { ascending: false });
  return (data ?? []).map((p) => ({
    id: p.id as string,
    payment_number: p.payment_number as string,
    unapplied_amount: Number(p.unapplied_amount),
    payment_date: p.payment_date as string,
    payment_method: p.payment_method as string,
  }));
}

export async function fetchOpenInvoicesForPayment() {
  const supabase = await createDataClient();
  const { data } = await supabase
    .from("invoices")
    .select("id, invoice_number, total, amount_paid, due_date, status, customers(name)")
    .not("status", "eq", "voided")
    .order("invoice_number");
  return (data ?? [])
    .filter((inv) => Number(inv.amount_paid) < Number(inv.total))
    .map((inv) => ({
      id: inv.id as string,
      invoice_number: inv.invoice_number as string,
      total: Number(inv.total),
      amount_paid: Number(inv.amount_paid),
      due_date: inv.due_date as string,
      status: inv.status as string,
      customers: (inv.customers as unknown as { name: string } | null) ?? null,
    }));
}
