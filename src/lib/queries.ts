import { createDataClient } from "@/lib/auth-access";
import { getViewCustomerId, getViewRole } from "@/lib/demo-role";
import { daysBetween, isOpenInvoiceStatus } from "@/lib/payment-utils";
import { enrichPaymentRow, isMissingColumnError } from "@/lib/payment-schema";
import type { Payment, PaymentsSummary, UserRole } from "@/lib/types";

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
    .select(
      "*, invoices(invoice_number, issue_date, customer_id, total, amount_paid, status, customers(id, name), contracts(title))"
    )
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false });

  const enriched = ((data ?? []) as Payment[]).map((payment) =>
    enrichPaymentRow(payment)
  );
  return { data: enriched, error };
}

export async function fetchCustomers() {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, name")
    .order("name", { ascending: true });
  return { data: data ?? [], error };
}

export async function fetchOpenInvoicesForCustomer(customerId: string) {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("id, invoice_number, total, amount_paid, status, customer_id")
    .eq("customer_id", customerId)
    .in("status", ["sent", "overdue", "past_due", "partially_paid"])
    .order("issue_date", { ascending: false });

  const open = (data ?? []).filter((invoice) => {
    const balance = Number(invoice.total) - Number(invoice.amount_paid);
    return balance > 0 && isOpenInvoiceStatus(invoice.status);
  });

  return { data: open, error };
}

export async function fetchPaymentsSummary(): Promise<PaymentsSummary> {
  const supabase = await createDataClient();

  let paymentsQuery = await supabase
    .from("payments")
    .select(
      "amount, payment_date, status, unapplied_amount, applied_amount, invoices(issue_date)"
    );

  if (paymentsQuery.error && isMissingColumnError(paymentsQuery.error)) {
    paymentsQuery = await supabase
      .from("payments")
      .select("amount, payment_date, invoices(issue_date)");
  }

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, total, amount_paid, status, customer_id, due_date");

  const payments = paymentsQuery.data ?? [];
  const now = new Date();
  const month = now.getUTCMonth();
  const year = now.getUTCFullYear();
  const today = now.toISOString().slice(0, 10);

  let collectedThisMonth = 0;
  let unappliedPayments = 0;
  const daysToPay: number[] = [];

  for (const payment of payments) {
    const amount = Number(payment.amount);
    const unapplied =
      "unapplied_amount" in payment && payment.unapplied_amount != null
        ? Number(payment.unapplied_amount)
        : 0;
    const status =
      "status" in payment && payment.status
        ? String(payment.status)
        : unapplied > 0 && unapplied >= amount
          ? "unapplied"
          : "applied";

    unappliedPayments += unapplied;
    if (status === "unapplied" && unapplied === 0) {
      unappliedPayments += amount;
    }

    const payDate = new Date(payment.payment_date + "T00:00:00Z");
    if (payDate.getUTCFullYear() === year && payDate.getUTCMonth() === month) {
      const collectedPortion =
        "applied_amount" in payment && payment.applied_amount != null
          ? Number(payment.applied_amount)
          : status === "applied"
            ? amount
            : 0;
      collectedThisMonth += collectedPortion;
    }

    const invoice = payment.invoices as
      | { issue_date?: string }
      | { issue_date?: string }[]
      | null;
    const issueDate = Array.isArray(invoice)
      ? invoice[0]?.issue_date
      : invoice?.issue_date;
    if (issueDate && (status === "applied" || unapplied < amount)) {
      daysToPay.push(daysBetween(issueDate, payment.payment_date));
    }
  }

  let outstandingBalance = 0;
  let totalBilled = 0;
  let totalCollected = 0;
  const outstandingInvoiceIds: string[] = [];
  const overdueCustomerIdSet = new Set<string>();

  const partialPaymentsCount = (invoices ?? []).filter((invoice) => {
    if (invoice.status === "canceled" || invoice.status === "voided") {
      return false;
    }

    const paid = Number(invoice.amount_paid);
    const total = Number(invoice.total);
    const balance = Math.round((total - paid) * 100) / 100;

    totalBilled += total;
    totalCollected += Math.min(paid, total);

    if (balance > 0 && isOpenInvoiceStatus(invoice.status)) {
      outstandingBalance += balance;
      outstandingInvoiceIds.push(invoice.id);
    }

    const isOverdueStatus =
      invoice.status === "overdue" || invoice.status === "past_due";
    const isPastDueDate =
      Boolean(invoice.due_date) &&
      invoice.due_date < today &&
      balance > 0 &&
      invoice.status !== "paid";

    if (isOverdueStatus || isPastDueDate) {
      overdueCustomerIdSet.add(String(invoice.customer_id));
    }

    return (
      invoice.status === "partially_paid" || (paid > 0 && paid < total)
    );
  }).length;

  const averageDaysToPay =
    daysToPay.length > 0
      ? Math.round(
          daysToPay.reduce((sum, days) => sum + days, 0) / daysToPay.length
        )
      : null;

  const collectionRate =
    totalBilled > 0
      ? Math.round((totalCollected / totalBilled) * 1000) / 10
      : null;

  return {
    collectedThisMonth,
    outstandingBalance,
    overdueCustomerCount: overdueCustomerIdSet.size,
    overdueCustomerIds: Array.from(overdueCustomerIdSet),
    outstandingInvoiceIds,
    collectionRate,
    averageDaysToPay,
    unappliedPayments,
    partialPaymentsCount,
  };
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
  const overdueCount = invoiceList.filter((i) => {
    const balance = Number(i.amount_paid) < Number(i.total);
    return (
      i.status === "overdue" ||
      i.status === "past_due" ||
      (i.status === "sent" && balance) ||
      (i.status === "partially_paid" && balance)
    );
  }).length;

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

/** Richer inputs for Profit Leak Detector — does not change profitability math. */
export async function fetchProfitLeakInputs() {
  const supabase = await createDataClient();
  const { data: contracts } = await supabase
    .from("contracts")
    .select(
      "id, title, monthly_fee, visits_per_week, season_start, season_end, customers(name)"
    )
    .eq("status", "active");

  if (!contracts?.length) return [];

  const results = [];

  for (const contract of contracts) {
    const customer = contract.customers as
      | { name: string }
      | { name: string }[]
      | null;
    const customerName = Array.isArray(customer)
      ? customer[0]?.name
      : customer?.name;

    const [{ data: invoices }, { data: visits }, { data: extraWork }] =
      await Promise.all([
        supabase
          .from("invoices")
          .select(
            "id, total, status, issue_date, invoice_lines(description, amount, line_type)"
          )
          .eq("contract_id", contract.id),
        supabase
          .from("service_visits")
          .select("id, scheduled_date, status, crew_notes")
          .eq("contract_id", contract.id),
        supabase
          .from("extra_work_orders")
          .select("id, title, quoted_amount, status")
          .eq("contract_id", contract.id),
      ]);

    const visitIds = (visits ?? []).map((visit) => visit.id);
    let visitCosts: Array<{
      visit_id: string;
      cost_type: string;
      description: string | null;
      amount: number;
    }> = [];

    if (visitIds.length > 0) {
      const { data } = await supabase
        .from("visit_costs")
        .select("visit_id, cost_type, description, amount")
        .in("visit_id", visitIds);
      visitCosts = data ?? [];
    }

    results.push({
      contractId: contract.id,
      title: contract.title,
      customerName: customerName ?? "",
      monthlyFee: Number(contract.monthly_fee ?? 0),
      visitsPerWeek: Number(contract.visits_per_week ?? 0),
      seasonStart: contract.season_start as string | null,
      seasonEnd: contract.season_end as string | null,
      invoices: invoices ?? [],
      visits: visits ?? [],
      visitCosts,
      extraWork: extraWork ?? [],
    });
  }

  return results;
}

export async function fetchArAgingReport() {
  const supabase = await createDataClient();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("*, customers(name)")
    .in("status", ["sent", "overdue", "past_due", "partially_paid"])
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
