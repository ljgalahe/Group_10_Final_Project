import { createDataClient } from "@/lib/auth-access";
import { getViewCustomerId, getViewRole } from "@/lib/demo-role";
import type { UserRole } from "@/lib/types";

export async function getScopedCustomerId(role: UserRole) {
  if (role === "customer") {
    return await getViewCustomerId();
  }
  return null;
}

export async function fetchContracts() {
  const supabase = await createDataClient();
  const role = await getViewRole();
  const customerId = await getScopedCustomerId(role);

  let query = supabase
    .from("contracts")
    .select("*, customers(name, property_type, address)")
    .order("created_at", { ascending: false });

  if (customerId) {
    query = query.eq("customer_id", customerId);
  }

  const { data, error } = await query;
  return { data: data ?? [], error };
}

export async function fetchContract(id: string) {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("contracts")
    .select("*, customers(*), contract_services(*), extra_work_orders(*)")
    .eq("id", id)
    .single();
  return { data, error };
}

export async function fetchVisits() {
  const supabase = await createDataClient();
  const role = await getViewRole();
  const customerId = await getScopedCustomerId(role);

  let query = supabase
    .from("service_visits")
    .select("*, contracts(title, customer_id, customers(name))")
    .order("scheduled_date", { ascending: true });

  if (customerId) {
    const { data: contracts } = await supabase
      .from("contracts")
      .select("id")
      .eq("customer_id", customerId);
    const ids = contracts?.map((c) => c.id) ?? [];
    if (ids.length === 0) return { data: [], error: null };
    query = query.in("contract_id", ids);
  }

  const { data, error } = await query;
  return { data: data ?? [], error };
}

export async function fetchVisitCosts(visitId: string) {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("visit_costs")
    .select("*")
    .eq("visit_id", visitId)
    .order("created_at", { ascending: false });
  return { data: data ?? [], error };
}

export async function fetchInvoices() {
  const supabase = await createDataClient();
  const role = await getViewRole();
  const customerId = await getScopedCustomerId(role);

  let query = supabase
    .from("invoices")
    .select("*, customers(name), contracts(title)")
    .order("issue_date", { ascending: false });

  if (customerId) {
    query = query.eq("customer_id", customerId);
  }

  const { data, error } = await query;
  return { data: data ?? [], error };
}

export async function fetchInvoice(id: string) {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*, customers(*), contracts(title), invoice_lines(*), payments(*)")
    .eq("id", id)
    .single();
  return { data, error };
}

export async function fetchPayments() {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*, invoices(invoice_number, customers(name))")
    .order("payment_date", { ascending: false });
  return { data: data ?? [], error };
}

export async function fetchDashboardStats() {
  const supabase = await createDataClient();
  const role = await getViewRole();
  const customerId = await getScopedCustomerId(role);

  let contractsQuery = supabase
    .from("contracts")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");
  let invoicesQuery = supabase.from("invoices").select("*");
  let visitsQuery = supabase
    .from("service_visits")
    .select("*")
    .eq("status", "scheduled");

  if (customerId) {
    contractsQuery = contractsQuery.eq("customer_id", customerId);
    invoicesQuery = invoicesQuery.eq("customer_id", customerId);
    const { data: contracts } = await supabase
      .from("contracts")
      .select("id")
      .eq("customer_id", customerId);
    const ids = contracts?.map((c) => c.id) ?? [];
    if (ids.length > 0) {
      visitsQuery = visitsQuery.in("contract_id", ids);
    } else {
      visitsQuery = visitsQuery.eq("contract_id", "00000000-0000-0000-0000-000000000000");
    }
  }

  const [contracts, invoices, visits] = await Promise.all([
    contractsQuery,
    invoicesQuery,
    visitsQuery,
  ]);

  const invoiceList = invoices.data ?? [];
  const totalBilled = invoiceList.reduce((s, i) => s + Number(i.total), 0);
  const totalCollected = invoiceList.reduce((s, i) => s + Number(i.amount_paid), 0);
  const outstanding = totalBilled - totalCollected;
  const overdueCount = invoiceList.filter(
    (i) => i.status === "overdue" || (i.status === "sent" && Number(i.amount_paid) < Number(i.total))
  ).length;

  return {
    activeContracts: contracts.count ?? 0,
    scheduledVisits: visits.data?.length ?? 0,
    totalBilled,
    totalCollected,
    outstanding,
    overdueCount,
  };
}

export async function fetchProfitabilityReport() {
  const supabase = await createDataClient();
  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, title, monthly_fee, customers(name)")
    .eq("status", "active");

  if (!contracts) return [];

  const results = [];
  for (const contract of contracts) {
    const { data: invoices } = await supabase
      .from("invoices")
      .select("total")
      .eq("contract_id", contract.id);
    const revenue = (invoices ?? []).reduce((s, i) => s + Number(i.total), 0);

    const { data: visits } = await supabase
      .from("service_visits")
      .select("id")
      .eq("contract_id", contract.id);
    const visitIds = visits?.map((v) => v.id) ?? [];

    let costs = 0;
    if (visitIds.length > 0) {
      const { data: visitCosts } = await supabase
        .from("visit_costs")
        .select("amount")
        .in("visit_id", visitIds);
      costs = (visitCosts ?? []).reduce((s, c) => s + Number(c.amount), 0);
    }

    const margin = revenue - costs;
    const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;

    const customer = contract.customers as { name: string } | { name: string }[] | null;
    const customerName = Array.isArray(customer) ? customer[0]?.name : customer?.name;

    results.push({
      contractId: contract.id,
      title: contract.title,
      customerName: customerName ?? "",
      revenue,
      costs,
      margin,
      marginPct,
      monthlyFee: Number(contract.monthly_fee ?? 0),
    });
  }

  return results;
}

export async function fetchArAgingReport() {
  const supabase = await createDataClient();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("*, customers(name)")
    .in("status", ["sent", "overdue"])
    .order("due_date", { ascending: true });

  type AgingInvoice = NonNullable<typeof invoices>[number];

  const buckets: Record<string, AgingInvoice[]> = {
    current: [],
    "1-30": [],
    "31-60": [],
    "61-90": [],
    "90+": [],
  };

  for (const invoice of invoices ?? []) {
    const balance = Number(invoice.total) - Number(invoice.amount_paid);
    if (balance <= 0) continue;

    const today = new Date();
    const due = new Date(invoice.due_date + "T00:00:00");
    const daysOverdue = Math.floor(
      (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysOverdue <= 0) buckets.current.push(invoice);
    else if (daysOverdue <= 30) buckets["1-30"].push(invoice);
    else if (daysOverdue <= 60) buckets["31-60"].push(invoice);
    else if (daysOverdue <= 90) buckets["61-90"].push(invoice);
    else buckets["90+"].push(invoice);
  }

  return buckets;
}
