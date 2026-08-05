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
