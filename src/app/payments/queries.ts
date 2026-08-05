import { createDataClient } from "@/lib/auth-access";

export async function fetchPayment(id: string) {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("payments")
    .select(
      "*, customers(name), invoices(id, invoice_number, total, amount_paid, due_date, status, customers(name), contracts(title))"
    )
    .eq("id", id)
    .single();
  return { data, error };
}

export async function fetchPaymentAuditTrail(paymentId: string) {
  const supabase = await createDataClient();
  const { data: payment } = await supabase
    .from("payments")
    .select("invoice_id, payment_number, created_at, amount, applied_amount, unapplied_amount, payment_method, payment_date, notes")
    .eq("id", paymentId)
    .single();

  if (!payment) return { activity: [], payment: null };

  if (!payment.invoice_id) {
    return { activity: [], payment };
  }

  const { data: activity } = await supabase
    .from("invoice_activity")
    .select("*")
    .eq("invoice_id", payment.invoice_id)
    .order("created_at", { ascending: false });

  return { activity: activity ?? [], payment };
}

export async function fetchPaymentsForAccountant() {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*, customers(name), invoices(invoice_number, customers(name))")
    .order("payment_date", { ascending: false });
  return { data: data ?? [], error };
}

export async function fetchUnappliedCashPayments() {
  const supabase = await createDataClient();
  const { data } = await supabase
    .from("payments")
    .select("*, customers(name), invoices(invoice_number)")
    .or("unapplied_amount.gt.0,invoice_id.is.null")
    .order("payment_date", { ascending: false });
  return data ?? [];
}

export async function fetchCustomersForPayment() {
  const supabase = await createDataClient();
  const { data } = await supabase.from("customers").select("id, name").order("name");
  return data ?? [];
}
