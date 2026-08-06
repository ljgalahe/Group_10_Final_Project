import { createDataClient } from "@/lib/auth-access";
import { isContractFullyApproved } from "@/lib/contract-status";
import { getViewCustomerId, getViewRole } from "@/lib/demo-role";
import {
  JOURNAL_SOURCE_LABELS,
  type JournalSource,
  type JournalStatus,
} from "@/lib/journal";
import {
  DEFAULT_CHART_OF_ACCOUNTS,
  type AccountType,
  type ChartOfAccount,
} from "@/lib/chart-of-accounts";
import { enrichPaymentRow, isMissingColumnError } from "@/lib/payment-schema";
import { daysBetween, isOpenInvoiceStatus } from "@/lib/payment-utils";
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
    .select(
      "*, customers(name, property_type, address), contract_services(*), extra_work_orders(*)"
    )
    .order("created_at", { ascending: false });

  if (customerId) {
    query = query.eq("customer_id", customerId);
  }

  const { data, error } = await query;
  let rows = data ?? [];
  if (customerId) {
    // Customer sees proposed (pending signature) + signed/approved contracts.
    rows = rows.filter((c) =>
      isContractFullyApproved(
        c as {
          approval_state?: string | null;
          customer_signed_at?: string | null;
        }
      )
    );
  }
  return { data: rows, error };
}

export async function fetchContractsDetailed() {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("contracts")
    .select(
      "*, customers(name, property_type, address, contact_name), contract_services(*), extra_work_orders(*)"
    )
    .order("created_at", { ascending: false });
  return { data: data ?? [], error };
}

export async function fetchAccountantContractBilling() {
  const supabase = await createDataClient();
  const { data: visits } = await supabase
    .from("service_visits")
    .select("id, contract_id, status");

  const visitIds = (visits ?? []).map((visit) => visit.id);
  const { data: costs } = visitIds.length
    ? await supabase
        .from("visit_costs")
        .select("visit_id, cost_type, amount")
        .in("visit_id", visitIds)
    : { data: [] as never[] };

  return {
    visits: visits ?? [],
    costs: costs ?? [],
  };
}

export async function fetchPendingContractChangeRequests() {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("contract_change_requests")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  return { data: data ?? [], error };
}

export async function fetchContractAuditLogs(contractId?: string) {
  const supabase = await createDataClient();
  let query = supabase
    .from("contract_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (contractId) {
    query = query.eq("contract_id", contractId);
  }

  const { data, error } = await query;
  return { data: data ?? [], error };
}

export async function fetchOpenVisitCount(contractId: string) {
  const supabase = await createDataClient();
  const { count } = await supabase
    .from("service_visits")
    .select("*", { count: "exact", head: true })
    .eq("contract_id", contractId)
    .eq("status", "scheduled");
  return count ?? 0;
}

export async function fetchCustomers() {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("name", { ascending: true });
  return { data: data ?? [], error };
}

export async function fetchContractProfitabilityMap() {
  const report = await fetchProfitabilityReport();
  const map = new Map<string, { margin: number; unprofitable: boolean }>();
  for (const row of report) {
    map.set(row.contractId, {
      margin: row.margin,
      unprofitable: row.margin < 0,
    });
  }
  return map;
}

export async function fetchContractOutstandingArMap() {
  const supabase = await createDataClient();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("contract_id, total, amount_paid, status")
    .in("status", ["sent", "overdue", "draft"]);

  const map = new Map<string, number>();
  for (const invoice of invoices ?? []) {
    const balance = Number(invoice.total) - Number(invoice.amount_paid);
    if (balance <= 0) continue;
    map.set(
      invoice.contract_id,
      (map.get(invoice.contract_id) ?? 0) + balance
    );
  }
  return map;
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

/** PostgREST defaults to max 1000 rows; page past the cap for full datasets. */
const SUPABASE_PAGE_SIZE = 1000;
const SUPABASE_IN_CHUNK = 200;

async function fetchAllPaged<T>(
  fetchPage: (
    from: number,
    to: number
  ) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<{ data: T[]; error: unknown }> {
  const all: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await fetchPage(from, from + SUPABASE_PAGE_SIZE - 1);
    if (error) return { data: all, error };
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < SUPABASE_PAGE_SIZE) break;
    from += SUPABASE_PAGE_SIZE;
  }
  return { data: all, error: null };
}

export async function fetchVisits() {
  const supabase = await createDataClient();
  const role = await getViewRole();
  const customerId = await getScopedCustomerId(role);

  let contractIds: string[] | null = null;
  if (customerId) {
    const { data: contracts } = await supabase
      .from("contracts")
      .select("id")
      .eq("customer_id", customerId);
    contractIds = contracts?.map((c) => c.id) ?? [];
    if (contractIds.length === 0) return { data: [], error: null };
  }

  const { data, error } = await fetchAllPaged((from, to) => {
    let query = supabase
      .from("service_visits")
      .select(
        "*, contracts(title, customer_id, customers(name, property_type, address, customer_notes))"
      )
      .order("scheduled_date", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to);
    if (contractIds) {
      query = query.in("contract_id", contractIds);
    }
    return query;
  });

  return { data: (data ?? []) as any[], error };
}

export async function fetchVisitLaborEntries(visitIds: string[]) {
  if (visitIds.length === 0) {
    return { data: [] as Array<{
      id: string;
      visit_id: string;
      member_demo_id: string;
      member_name: string;
      member_role: string;
      hours: number | string;
      hourly_rate: number | string;
      started_at: string | null;
      ended_at: string | null;
    }>, error: null };
  }

  type LaborRow = {
    id: string;
    visit_id: string;
    member_demo_id: string;
    member_name: string;
    member_role: string;
    hours: number | string;
    hourly_rate: number | string;
    started_at: string | null;
    ended_at: string | null;
  };

  const supabase = await createDataClient();
  const all: LaborRow[] = [];

  for (let i = 0; i < visitIds.length; i += SUPABASE_IN_CHUNK) {
    const chunk = visitIds.slice(i, i + SUPABASE_IN_CHUNK);
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("visit_labor_entries")
        .select(
          "id, visit_id, member_demo_id, member_name, member_role, hours, hourly_rate, started_at, ended_at"
        )
        .in("visit_id", chunk)
        .range(from, from + SUPABASE_PAGE_SIZE - 1);

      if (error) {
        const msg = (error.message || "").toLowerCase();
        if (
          error.code === "PGRST205" ||
          error.code === "42P01" ||
          msg.includes("visit_labor_entries") ||
          msg.includes("does not exist") ||
          msg.includes("schema cache")
        ) {
          return { data: [], error: null };
        }
        return { data: all, error };
      }

      const rows = (data ?? []) as LaborRow[];
      all.push(...rows);
      if (rows.length < SUPABASE_PAGE_SIZE) break;
      from += SUPABASE_PAGE_SIZE;
    }
  }

  return { data: all, error: null };
}

export async function fetchAccountantVisits() {
  const supabase = await createDataClient();

  const { data: pagedVisits, error } = await fetchAllPaged<
    Record<string, unknown> & {
      id: string;
      contract_id: string;
      scheduled_date: string;
      status: string;
      crew_notes: string | null;
      completed_at: string | null;
      created_at: string;
    }
  >(async (from, to) => {
    const result = await supabase
      .from("service_visits")
      .select(
        "*, contracts(id, title, monthly_fee, visits_per_week, assigned_crew, billing_method, customer_id, customers(name))"
      )
      .order("scheduled_date", { ascending: false })
      .order("id", { ascending: true })
      .range(from, to);
    return { data: result.data, error: result.error };
  });

  // Dedupe in case page boundaries still overlap on shared scheduled_date values.
  const visits = Array.from(
    new Map(
      pagedVisits.map((visit) => [visit.id, visit])
    ).values()
  ) as Array<{
    id: string;
    contract_id: string;
    scheduled_date: string;
    status: string;
    crew_notes: string | null;
    completed_at: string | null;
    created_at: string;
    contracts?: unknown;
  }>;

  if (error || visits.length === 0) {
    return { data: [], error: (error as { message?: string } | null) ?? null };
  }

  const contractIds = [
    ...new Set(visits.map((visit) => visit.contract_id).filter(Boolean)),
  ] as string[];

  const completedIds = visits
    .filter((visit) => visit.status === "completed")
    .map((visit) => visit.id);

  type VisitCostRow = {
    id: string;
    visit_id: string;
    cost_type: string;
    description: string | null;
    amount: number | string;
    quantity: number | string | null;
    created_at: string;
  };
  type InvoiceRow = {
    id: string;
    contract_id: string;
    status: string;
    issue_date: string;
    created_at: string;
  };

  const costs: VisitCostRow[] = [];
  for (let i = 0; i < completedIds.length; i += SUPABASE_IN_CHUNK) {
    const chunk = completedIds.slice(i, i + SUPABASE_IN_CHUNK);
    let from = 0;
    for (;;) {
      const { data, error: costError } = await supabase
        .from("visit_costs")
        .select("*")
        .in("visit_id", chunk)
        .range(from, from + SUPABASE_PAGE_SIZE - 1);
      if (costError) break;
      const rows = (data ?? []) as VisitCostRow[];
      costs.push(...rows);
      if (rows.length < SUPABASE_PAGE_SIZE) break;
      from += SUPABASE_PAGE_SIZE;
    }
  }

  const invoices: InvoiceRow[] = [];
  for (let i = 0; i < contractIds.length; i += SUPABASE_IN_CHUNK) {
    const chunk = contractIds.slice(i, i + SUPABASE_IN_CHUNK);
    const { data } = await supabase
      .from("invoices")
      .select("id, contract_id, status, issue_date, created_at")
      .in("contract_id", chunk);
    invoices.push(...((data ?? []) as InvoiceRow[]));
  }

  const { data: laborEntries } = await fetchVisitLaborEntries(completedIds);

  const costsByVisit = new Map<string, VisitCostRow[]>();
  for (const cost of costs) {
    const list = costsByVisit.get(cost.visit_id) ?? [];
    list.push(cost);
    costsByVisit.set(cost.visit_id, list);
  }

  const laborByVisit = new Map<string, typeof laborEntries>();
  for (const entry of laborEntries) {
    const list = laborByVisit.get(entry.visit_id) ?? [];
    list.push(entry);
    laborByVisit.set(entry.visit_id, list);
  }

  const invoicesByContract = new Map<string, InvoiceRow[]>();
  for (const invoice of invoices) {
    const list = invoicesByContract.get(invoice.contract_id) ?? [];
    list.push(invoice);
    invoicesByContract.set(invoice.contract_id, list);
  }
  return {
    data: visits.map((visit) => ({
      ...visit,
      visit_costs: costsByVisit.get(visit.id) ?? [],
      invoices: invoicesByContract.get(visit.contract_id) ?? [],
      visit_labor_entries: laborByVisit.get(visit.id) ?? [],
    })),
    error: null,
  };
}

export async function fetchExtraWorkByContractIds(contractIds: string[]) {
  if (contractIds.length === 0) {
    return {
      data: [] as {
        id: string;
        contract_id: string;
        title: string;
        description: string | null;
        quoted_amount: number;
        status: string;
      }[],
      error: null,
    };
  }
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("extra_work_orders")
    .select("id, contract_id, title, description, quoted_amount, status")
    .in("contract_id", contractIds)
    .order("created_at", { ascending: false });
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

/** Batch load visit_costs for many visits (avoids N+1). Chunks + pages past PostgREST limits. */
export async function fetchVisitCostsByVisitIds(visitIds: string[]) {
  const ids = [...new Set(visitIds.filter(Boolean))];
  if (ids.length === 0) {
    return { data: [] as Array<Record<string, unknown> & {
      id: string;
      visit_id: string;
      cost_type: string;
      description: string | null;
      amount: number | string;
    }>, error: null };
  }

  type CostRow = {
    id: string;
    visit_id: string;
    cost_type: string;
    description: string | null;
    amount: number | string;
  };

  const supabase = await createDataClient();
  const all: CostRow[] = [];

  for (let i = 0; i < ids.length; i += SUPABASE_IN_CHUNK) {
    const chunk = ids.slice(i, i + SUPABASE_IN_CHUNK);
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("visit_costs")
        .select("*")
        .in("visit_id", chunk)
        .order("created_at", { ascending: false })
        .range(from, from + SUPABASE_PAGE_SIZE - 1);

      if (error) {
        return { data: all, error };
      }
      const rows = (data ?? []) as CostRow[];
      all.push(...rows);
      if (rows.length < SUPABASE_PAGE_SIZE) break;
      from += SUPABASE_PAGE_SIZE;
    }
  }

  return { data: all, error: null };
}

export async function fetchAllVisitCosts() {
  const supabase = await createDataClient();
  const { data, error } = await fetchAllPaged((from, to) =>
    supabase
      .from("visit_costs")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, to)
  );
  return {
    data: (data ?? []) as any[],
    error,
  };
}

export async function fetchInvoices() {
  const supabase = await createDataClient();
  const role = await getViewRole();
  const customerId = await getScopedCustomerId(role);

  let query = supabase
    .from("invoices")
    .select(
      "*, customers(name, address, property_type), contracts(title), invoice_lines(*)"
    )
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
    .select(
      "*, customers(*), contracts(title), invoice_lines(*), payments(*)"
    )
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
    .select("amount, payment_date, status, applied_amount, invoices(issue_date)");

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
  const daysToPay: number[] = [];

  for (const payment of payments) {
    const amount = Number(payment.amount);
    const status =
      "status" in payment && payment.status ? String(payment.status) : "applied";

    if (status === "void") continue;

    const payDate = new Date(payment.payment_date + "T00:00:00Z");
    if (payDate.getUTCFullYear() === year && payDate.getUTCMonth() === month) {
      const collectedPortion =
        "applied_amount" in payment && payment.applied_amount != null
          ? Number(payment.applied_amount)
          : amount;
      collectedThisMonth += collectedPortion;
    }

    const invoice = payment.invoices as
      | { issue_date?: string }
      | { issue_date?: string }[]
      | null;
    const issueDate = Array.isArray(invoice)
      ? invoice[0]?.issue_date
      : invoice?.issue_date;
    if (issueDate) {
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
      visitsQuery = visitsQuery.eq(
        "contract_id",
        "00000000-0000-0000-0000-000000000000"
      );
    }
  }

  const [contracts, invoices, visits] = await Promise.all([
    contractsQuery,
    invoicesQuery,
    visitsQuery,
  ]);

  const invoiceList = invoices.data ?? [];
  const totalBilled = invoiceList.reduce((s, i) => s + Number(i.total), 0);
  const totalCollected = invoiceList.reduce(
    (s, i) => s + Number(i.amount_paid),
    0
  );
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

  if (!contracts?.length) return [];

  const contractIds = contracts.map((c) => c.id);

  type InvoiceRow = { contract_id: string; total: number | string };
  type VisitRow = { id: string; contract_id: string };

  const invoices: InvoiceRow[] = [];
  const visits: VisitRow[] = [];

  // Page past PostgREST's 1000-row default — active contracts can have 1k+ visits.
  for (let i = 0; i < contractIds.length; i += SUPABASE_IN_CHUNK) {
    const chunk = contractIds.slice(i, i + SUPABASE_IN_CHUNK);
    const [invoicePage, visitPage] = await Promise.all([
      fetchAllPaged<InvoiceRow>((from, to) =>
        supabase
          .from("invoices")
          .select("contract_id, total")
          .in("contract_id", chunk)
          .range(from, to)
      ),
      fetchAllPaged<VisitRow>((from, to) =>
        supabase
          .from("service_visits")
          .select("id, contract_id")
          .in("contract_id", chunk)
          .range(from, to)
      ),
    ]);
    if (invoicePage.error) {
      console.error("fetchProfitabilityReport invoices:", invoicePage.error);
    } else {
      invoices.push(...invoicePage.data);
    }
    if (visitPage.error) {
      console.error("fetchProfitabilityReport visits:", visitPage.error);
    } else {
      visits.push(...visitPage.data);
    }
  }

  const revenueByContract = new Map<string, number>();
  for (const invoice of invoices) {
    revenueByContract.set(
      invoice.contract_id,
      (revenueByContract.get(invoice.contract_id) ?? 0) + Number(invoice.total)
    );
  }

  const visitIdsByContract = new Map<string, string[]>();
  const allVisitIds: string[] = [];
  for (const visit of visits) {
    const list = visitIdsByContract.get(visit.contract_id) ?? [];
    list.push(visit.id);
    visitIdsByContract.set(visit.contract_id, list);
    allVisitIds.push(visit.id);
  }

  const { data: costRows } = await fetchVisitCostsByVisitIds(allVisitIds);
  const costsByVisit = new Map<string, number>();
  for (const cost of costRows) {
    costsByVisit.set(
      cost.visit_id,
      (costsByVisit.get(cost.visit_id) ?? 0) + Number(cost.amount)
    );
  }

  const results = contracts.map((contract) => {
    const revenue = revenueByContract.get(contract.id) ?? 0;
    const visitIds = visitIdsByContract.get(contract.id) ?? [];
    const costs = visitIds.reduce(
      (sum, id) => sum + (costsByVisit.get(id) ?? 0),
      0
    );
    const margin = revenue - costs;
    const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;
    const customer = contract.customers as
      | { name: string }
      | { name: string }[]
      | null;
    const customerName = Array.isArray(customer)
      ? customer[0]?.name
      : customer?.name;

    return {
      contractId: contract.id,
      title: contract.title,
      customerName: customerName ?? "",
      revenue,
      costs,
      margin,
      marginPct,
      monthlyFee: Number(contract.monthly_fee ?? 0),
    };
  });
  return results;
}

export type { ChartOfAccount } from "@/lib/chart-of-accounts";
export type { JournalSource, JournalStatus };

export type JournalLine = {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
};

export type JournalEntry = {
  id: string;
  entryNumber: string;
  date: string;
  source: JournalSource;
  sourceLabel: string;
  sourceId: string | null;
  status: JournalStatus;
  memo: string;
  reference: string;
  customerName: string;
  contractTitle: string | null;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
};

export async function fetchJournalEntries(): Promise<JournalEntry[]> {
  const supabase = await createDataClient();
  const { data: pagedEntries, error } = await fetchAllPaged<{
    id: string;
    entry_number: string;
    entry_date: string;
    source: string;
    source_id: string | null;
    status: string | null;
    memo: string;
    reference: string;
    customer_name: string;
    contract_title: string | null;
  }>((from, to) =>
    supabase
      .from("journal_entries")
      .select(
        "id, entry_number, entry_date, source, source_id, status, memo, reference, customer_name, contract_title"
      )
      .order("entry_date", { ascending: true })
      .order("entry_number", { ascending: true })
      .range(from, to)
  );

  if (error || pagedEntries.length === 0) return [];

  const linesByEntry = new Map<
    string,
    Array<{
      line_no: number;
      account_code: string;
      account_name: string;
      debit: number | string;
      credit: number | string;
    }>
  >();

  for (let i = 0; i < pagedEntries.length; i += SUPABASE_IN_CHUNK) {
    const chunkIds = pagedEntries.slice(i, i + SUPABASE_IN_CHUNK).map((e) => e.id);
    let from = 0;
    for (;;) {
      const { data: lineRows, error: lineError } = await supabase
        .from("journal_entry_lines")
        .select(
          "journal_entry_id, line_no, account_code, account_name, debit, credit"
        )
        .in("journal_entry_id", chunkIds)
        .order("line_no", { ascending: true })
        .range(from, from + SUPABASE_PAGE_SIZE - 1);
      if (lineError) break;
      const rows = lineRows ?? [];
      for (const row of rows) {
        const list = linesByEntry.get(row.journal_entry_id) ?? [];
        list.push(row);
        linesByEntry.set(row.journal_entry_id, list);
      }
      if (rows.length < SUPABASE_PAGE_SIZE) break;
      from += SUPABASE_PAGE_SIZE;
    }
  }

  return pagedEntries.map((entry) => {
    const lines = [...(linesByEntry.get(entry.id) ?? [])]
      .sort((a, b) => a.line_no - b.line_no)
      .map((line) => ({
        accountCode: line.account_code,
        accountName: line.account_name,
        debit: Number(line.debit),
        credit: Number(line.credit),
      }));
    const source = entry.source as JournalSource;
    const status = (entry.status as JournalStatus | null) ?? "posted";
    return {
      id: entry.id,
      entryNumber: entry.entry_number,
      date: String(entry.entry_date).slice(0, 10),
      source,
      sourceLabel: JOURNAL_SOURCE_LABELS[source] ?? source,
      sourceId: entry.source_id,
      status,
      memo: entry.memo,
      reference: entry.reference,
      customerName: entry.customer_name,
      contractTitle: entry.contract_title,
      lines,
      totalDebit: roundMoney(lines.reduce((sum, line) => sum + line.debit, 0)),
      totalCredit: roundMoney(lines.reduce((sum, line) => sum + line.credit, 0)),
    };
  });
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export async function fetchChartOfAccounts(): Promise<ChartOfAccount[]> {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("chart_of_accounts")
    .select("code, name, account_type")
    .order("code", { ascending: true });

  if (error || !data?.length) {
    return DEFAULT_CHART_OF_ACCOUNTS;
  }

  return data.map((row) => ({
    code: row.code,
    name: row.name,
    accountType: row.account_type as AccountType,
  }));
}

export async function fetchJournalSourceStates() {
  const supabase = await createDataClient();
  const { data } = await fetchAllPaged<{
    source: string;
    source_id: string | null;
    status: string | null;
  }>((from, to) =>
    supabase
      .from("journal_entries")
      .select("source, source_id, status")
      .not("source_id", "is", null)
      .order("id", { ascending: true })
      .range(from, to)
  );

  const states = {
    invoice: new Map<string, JournalStatus>(),
    payment: new Map<string, JournalStatus>(),
    visit: new Map<string, JournalStatus>(),
    depreciation: new Map<string, JournalStatus>(),
  };

  for (const row of data ?? []) {
    if (!row.source_id) continue;
    const status = (row.status as JournalStatus | null) ?? "posted";
    if (row.source === "invoice") states.invoice.set(row.source_id, status);
    if (row.source === "payment") states.payment.set(row.source_id, status);
    if (row.source === "visit") states.visit.set(row.source_id, status);
    if (row.source === "depreciation") {
      states.depreciation.set(row.source_id, status);
    }
  }

  return states;
}

export async function fetchJournalPostedSourceIds() {
  const states = await fetchJournalSourceStates();
  return {
    invoice: new Set(states.invoice.keys()),
    payment: new Set(states.payment.keys()),
    visit: new Set(states.visit.keys()),
    depreciation: new Set(states.depreciation.keys()),
  };
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

  const contractIds = contracts.map((c) => c.id);

  type InvoiceRow = {
    id: string;
    contract_id: string;
    total: number | string;
    status: string;
    issue_date: string;
    invoice_lines: Array<{
      description: string | null;
      amount: number | string;
      line_type: string | null;
    }> | null;
  };
  type VisitRow = {
    id: string;
    contract_id: string;
    scheduled_date: string;
    status: string;
    crew_notes: string | null;
  };
  type ExtraWorkRow = {
    id: string;
    contract_id: string;
    title: string;
    quoted_amount: number | string;
    status: string;
  };

  const invoices: InvoiceRow[] = [];
  const visits: VisitRow[] = [];
  const extraWork: ExtraWorkRow[] = [];

  for (let i = 0; i < contractIds.length; i += SUPABASE_IN_CHUNK) {
    const chunk = contractIds.slice(i, i + SUPABASE_IN_CHUNK);
    const [
      { data: invoiceRows },
      { data: visitRows },
      { data: extraRows },
    ] = await Promise.all([
      supabase
        .from("invoices")
        .select(
          "id, contract_id, total, status, issue_date, invoice_lines(description, amount, line_type)"
        )
        .in("contract_id", chunk),
      supabase
        .from("service_visits")
        .select("id, contract_id, scheduled_date, status, crew_notes")
        .in("contract_id", chunk),
      supabase
        .from("extra_work_orders")
        .select("id, contract_id, title, quoted_amount, status")
        .in("contract_id", chunk),
    ]);
    invoices.push(...((invoiceRows ?? []) as InvoiceRow[]));
    visits.push(...((visitRows ?? []) as VisitRow[]));
    extraWork.push(...((extraRows ?? []) as ExtraWorkRow[]));
  }

  const invoicesByContract = new Map<string, InvoiceRow[]>();
  for (const row of invoices) {
    const list = invoicesByContract.get(row.contract_id) ?? [];
    list.push(row);
    invoicesByContract.set(row.contract_id, list);
  }

  const visitsByContract = new Map<string, VisitRow[]>();
  const allVisitIds: string[] = [];
  for (const row of visits) {
    const list = visitsByContract.get(row.contract_id) ?? [];
    list.push(row);
    visitsByContract.set(row.contract_id, list);
    allVisitIds.push(row.id);
  }

  const extraByContract = new Map<string, ExtraWorkRow[]>();
  for (const row of extraWork) {
    const list = extraByContract.get(row.contract_id) ?? [];
    list.push(row);
    extraByContract.set(row.contract_id, list);
  }

  const { data: costRows } = await fetchVisitCostsByVisitIds(allVisitIds);
  const costsByVisit = new Map<string, typeof costRows>();
  for (const cost of costRows) {
    const list = costsByVisit.get(cost.visit_id) ?? [];
    list.push(cost);
    costsByVisit.set(cost.visit_id, list);
  }

  const results = contracts.map((contract) => {
    const customer = contract.customers as
      | { name: string }
      | { name: string }[]
      | null;
    const customerName = Array.isArray(customer)
      ? customer[0]?.name
      : customer?.name;
    const contractVisits = visitsByContract.get(contract.id) ?? [];
    const visitCosts = contractVisits.flatMap(
      (visit) => costsByVisit.get(visit.id) ?? []
    );

    return {
      contractId: contract.id,
      title: contract.title,
      customerName: customerName ?? "",
      monthlyFee: Number(contract.monthly_fee ?? 0),
      visitsPerWeek: Number(contract.visits_per_week ?? 0),
      seasonStart: contract.season_start as string | null,
      seasonEnd: contract.season_end as string | null,
      invoices: (invoicesByContract.get(contract.id) ?? []).map((invoice) => ({
        id: invoice.id,
        total: Number(invoice.total),
        status: invoice.status,
        issue_date: invoice.issue_date,
        invoice_lines: (invoice.invoice_lines ?? []).map((line) => ({
          description: line.description,
          amount: Number(line.amount),
          line_type: line.line_type,
        })),
      })),
      visits: contractVisits.map((visit) => ({
        id: visit.id,
        scheduled_date: visit.scheduled_date,
        status: visit.status,
        crew_notes: visit.crew_notes,
      })),
      visitCosts: visitCosts.map((cost) => ({
        visit_id: cost.visit_id,
        cost_type: cost.cost_type,
        description: cost.description,
        amount: Number(cost.amount),
      })),
      extraWork: (extraByContract.get(contract.id) ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        quoted_amount: Number(row.quoted_amount),
        status: row.status,
      })),
    };
  });
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

export async function fetchCustomerSupportLinkOptions(customerId: string) {
  const supabase = await createDataClient();

  const { data: contracts, error: contractsError } = await supabase
    .from("contracts")
    .select("id, title")
    .eq("customer_id", customerId)
    .order("title");

  const contractIds = (contracts ?? []).map((c) => c.id);

  const visitsRes =
    contractIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("service_visits")
          .select("id, scheduled_date, status, contract_id, contracts(title)")
          .in("contract_id", contractIds)
          .order("scheduled_date", { ascending: false });

  const { data: invoices, error: invoicesError } = await supabase
    .from("invoices")
    .select("id, invoice_number")
    .eq("customer_id", customerId)
    .order("issue_date", { ascending: false });

  const contractOptions = (contracts ?? []).map((c) => ({
    value: `contract:${c.id}`,
    label: `Contract · ${c.title}`,
  }));

  const visitOptions = (visitsRes.data ?? []).map((v) => {
    const contract = v.contracts as
      | { title: string }
      | { title: string }[]
      | null;
    const title = Array.isArray(contract)
      ? contract[0]?.title
      : contract?.title;
    return {
      value: `visit:${v.id}`,
      label: `Visit · ${title ?? "Service"} · ${v.scheduled_date}`,
    };
  });

  const invoiceOptions = (invoices ?? []).map((inv) => ({
    value: `invoice:${inv.id}`,
    label: `Invoice · ${inv.invoice_number}`,
  }));

  return {
    options: [...contractOptions, ...visitOptions, ...invoiceOptions],
    error: contractsError || visitsRes.error || invoicesError,
  };
}

export async function fetchSupportRequestsForCustomer(customerId: string) {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("support_requests")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  return { data: data ?? [], error };
}

export type SupportRequestQueueItem = {
  id: string;
  customer_id: string;
  customer_name: string;
  category: string;
  message: string;
  linked_type: string | null;
  linked_id: string | null;
  linked_label: string | null;
  photo_path: string | null;
  status: string;
  resolution_notes: string | null;
  created_at: string;
};

export async function fetchAllSupportRequests(): Promise<{
  data: SupportRequestQueueItem[];
  error: unknown;
}> {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("support_requests")
    .select("*, customers(name)")
    .neq("category", "service_quote")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return { data: [], error };
  }

  const contractIds = data
    .filter((r) => r.linked_type === "contract" && r.linked_id)
    .map((r) => r.linked_id as string);
  const visitIds = data
    .filter((r) => r.linked_type === "visit" && r.linked_id)
    .map((r) => r.linked_id as string);
  const invoiceIds = data
    .filter((r) => r.linked_type === "invoice" && r.linked_id)
    .map((r) => r.linked_id as string);

  const [contractsRes, visitsRes, invoicesRes] = await Promise.all([
    contractIds.length
      ? supabase.from("contracts").select("id, title").in("id", contractIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    visitIds.length
      ? supabase
          .from("service_visits")
          .select("id, scheduled_date, contracts(title)")
          .in("id", visitIds)
      : Promise.resolve({
          data: [] as {
            id: string;
            scheduled_date: string;
            contracts: { title: string } | { title: string }[] | null;
          }[],
        }),
    invoiceIds.length
      ? supabase
          .from("invoices")
          .select("id, invoice_number")
          .in("id", invoiceIds)
      : Promise.resolve({
          data: [] as { id: string; invoice_number: string }[],
        }),
  ]);

  const contractMap = new Map(
    (contractsRes.data ?? []).map((c) => [c.id, c.title])
  );
  const invoiceMap = new Map(
    (invoicesRes.data ?? []).map((i) => [i.id, i.invoice_number])
  );
  const visitMap = new Map(
    (visitsRes.data ?? []).map((v) => {
      const contract = v.contracts as
        | { title: string }
        | { title: string }[]
        | null;
      const title = Array.isArray(contract)
        ? contract[0]?.title
        : contract?.title;
      return [v.id, `Visit · ${title ?? "Service"} · ${v.scheduled_date}`];
    })
  );

  const items: SupportRequestQueueItem[] = data.map((row) => {
    const customer = row.customers as
      | { name: string }
      | { name: string }[]
      | null;
    const customer_name = Array.isArray(customer)
      ? (customer[0]?.name ?? "Customer")
      : (customer?.name ?? "Customer");

    let linked_label: string | null = null;
    if (row.linked_type === "contract" && row.linked_id) {
      const title = contractMap.get(row.linked_id);
      linked_label = title ? `Contract · ${title}` : "Contract";
    } else if (row.linked_type === "visit" && row.linked_id) {
      linked_label = visitMap.get(row.linked_id) ?? "Visit";
    } else if (row.linked_type === "invoice" && row.linked_id) {
      const num = invoiceMap.get(row.linked_id);
      linked_label = num ? `Invoice · ${num}` : "Invoice";
    }

    return {
      id: row.id,
      customer_id: row.customer_id,
      customer_name,
      category: row.category,
      message: row.message,
      linked_type: row.linked_type,
      linked_id: row.linked_id,
      linked_label,
      photo_path: (row as { photo_path?: string | null }).photo_path ?? null,
      status: row.status,
      resolution_notes: row.resolution_notes ?? null,
      created_at: row.created_at,
    };
  });

  return { data: items, error: null };
}

/** Contact Us requests relevant to crew (questions, concerns, complaints). */
export async function fetchCrewApplicableSupportRequests() {
  const { data, error } = await fetchAllSupportRequests();
  const applicable = new Set(["question", "concern", "complaint"]);
  return {
    data: data.filter((item) => applicable.has(item.category)),
    error,
  };
}

export async function fetchSupportRequestForCustomer(
  requestId: string,
  customerId: string
) {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("support_requests")
    .select("*")
    .eq("id", requestId)
    .eq("customer_id", customerId)
    .single();

  if (error || !data) {
    return { data: null, linked_label: null, error };
  }

  let linked_label: string | null = null;
  if (data.linked_type === "contract" && data.linked_id) {
    const { data: contract } = await supabase
      .from("contracts")
      .select("title")
      .eq("id", data.linked_id)
      .single();
    linked_label = contract?.title
      ? `Contract · ${contract.title}`
      : "Contract";
  } else if (data.linked_type === "visit" && data.linked_id) {
    const { data: visit } = await supabase
      .from("service_visits")
      .select("scheduled_date, contracts(title)")
      .eq("id", data.linked_id)
      .single();
    if (visit) {
      const contract = visit.contracts as
        | { title: string }
        | { title: string }[]
        | null;
      const title = Array.isArray(contract)
        ? contract[0]?.title
        : contract?.title;
      linked_label = `Visit · ${title ?? "Service"} · ${visit.scheduled_date}`;
    } else {
      linked_label = "Visit";
    }
  } else if (data.linked_type === "invoice" && data.linked_id) {
    const { data: invoice } = await supabase
      .from("invoices")
      .select("invoice_number")
      .eq("id", data.linked_id)
      .single();
    linked_label = invoice?.invoice_number
      ? `Invoice · ${invoice.invoice_number}`
      : "Invoice";
  }

  return { data, linked_label, error: null };
}

/** Active contracts ending within the next `windowDays` for renewal prompts. */
export async function fetchContractsApproachingRenewal(
  customerId: string,
  windowDays = 45
) {
  const supabase = await createDataClient();
  const { data: contracts, error } = await supabase
    .from("contracts")
    .select("id, title, season_end, status")
    .eq("customer_id", customerId)
    .eq("status", "active")
    .order("season_end", { ascending: true });

  if (error || !contracts) {
    return { data: [], error };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: openRenewals } = await supabase
    .from("support_requests")
    .select("id, linked_id, status")
    .eq("customer_id", customerId)
    .eq("category", "renewal")
    .eq("linked_type", "contract")
    .in("status", ["Open", "In Progress"]);

  const requestedContractIds = new Set(
    (openRenewals ?? [])
      .map((r) => r.linked_id)
      .filter((id): id is string => !!id)
  );

  const notices = contracts
    .map((contract) => {
      const end = new Date(contract.season_end + "T00:00:00");
      const daysLeft = Math.ceil(
        (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        id: contract.id,
        title: contract.title,
        season_end: contract.season_end,
        daysLeft,
        renewalRequested: requestedContractIds.has(contract.id),
      };
    })
    .filter((c) => c.daysLeft >= 0 && c.daysLeft <= windowDays);

  return { data: notices, error: null };
}

export async function fetchCustomerPaymentMethods(customerId: string) {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("customer_payment_methods")
    .select(
      "id, customer_id, nickname, display_label, method_type, is_default, last_four, expires_month, expires_year, billing_name, created_at"
    )
    .eq("customer_id", customerId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
  return { data: data ?? [], error };
}

export async function fetchCustomerProfile(customerId: string) {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("customers")
    .select(
      "id, name, property_type, address, contact_name, contact_email, contact_phone, customer_notes, notification_prefs, created_at"
    )
    .eq("id", customerId)
    .single();
  return { data, error };
}

export async function fetchCustomerAccountHealth(customerId: string) {
  const supabase = await createDataClient();

  const [customerRes, contractsRes, openRequestsRes, invoicesRes] =
    await Promise.all([
      supabase
        .from("customers")
        .select("created_at, name, address")
        .eq("id", customerId)
        .single(),
      supabase
        .from("contracts")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", customerId)
        .eq("status", "active"),
      supabase
        .from("support_requests")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", customerId)
        .neq("status", "Resolved"),
      supabase
        .from("invoices")
        .select("total, amount_paid, status, due_date")
        .eq("customer_id", customerId),
    ]);

  const sinceYear = customerRes.data?.created_at
    ? new Date(customerRes.data.created_at).getFullYear()
    : null;

  const invoices = invoicesRes.data ?? [];
  const openBalance = invoices.reduce((sum, inv) => {
    const bal = Number(inv.total) - Number(inv.amount_paid);
    return sum + (bal > 0 ? bal : 0);
  }, 0);
  const overdueCount = invoices.filter((inv) => {
    const bal = Number(inv.total) - Number(inv.amount_paid);
    if (bal <= 0.001) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(inv.due_date + "T00:00:00") < today;
  }).length;

  return {
    customerName: customerRes.data?.name ?? "Customer",
    address: customerRes.data?.address ?? null,
    sinceYear,
    activeContracts: contractsRes.count ?? 0,
    openRequests: openRequestsRes.count ?? 0,
    openBalance,
    overdueCount,
    error:
      customerRes.error ||
      contractsRes.error ||
      openRequestsRes.error ||
      invoicesRes.error,
  };
}

export async function fetchCustomerContractsForSelect(customerId: string) {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("contracts")
    .select("id, title")
    .eq("customer_id", customerId)
    .eq("status", "active")
    .order("title");
  return { data: data ?? [], error };
}

export type CustomerAttentionItem = {
  id: string;
  kind:
    | "proposed_contract"
    | "overdue_invoice"
    | "open_invoice"
    | "support"
    | "renewal";
  title: string;
  detail: string;
  href: string;
  amount?: number;
  dueDate?: string;
  /** Present for renewals so the dashboard can post requestContractRenewal. */
  contractId?: string;
};

/** Open invoices, support replies, and unrequested renewals for the dashboard strip. */
export async function fetchCustomerNeedsAttention(customerId: string) {
  const supabase = await createDataClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [invoicesRes, supportRes, renewalsRes, proposedRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, invoice_number, due_date, total, amount_paid, status")
      .eq("customer_id", customerId)
      .order("due_date", { ascending: true }),
    supabase
      .from("support_requests")
      .select("id, category, status, resolution_notes, created_at")
      .eq("customer_id", customerId)
      .eq("status", "Resolved")
      .not("resolution_notes", "is", null)
      .order("created_at", { ascending: false })
      .limit(5),
    fetchContractsApproachingRenewal(customerId),
    supabase
      .from("contracts")
      .select("id, title, monthly_fee, season_start, season_end")
      .eq("customer_id", customerId)
      .eq("approval_state", "pending_customer")
      .is("customer_signed_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const items: CustomerAttentionItem[] = [];

  for (const contract of proposedRes.data ?? []) {
    items.push({
      id: `proposed-${contract.id}`,
      kind: "proposed_contract",
      title: `Proposed Contract: ${contract.title}`,
      detail: "Needs Your Review And Signature.",
      href: `/contracts/${contract.id}`,
      contractId: contract.id,
    });
  }

  const openInvoices = (invoicesRes.data ?? []).filter(
    (inv) =>
      inv.status !== "draft" &&
      Number(inv.total) - Number(inv.amount_paid) > 0.001
  );

  for (const inv of openInvoices) {
    const balance = Number(inv.total) - Number(inv.amount_paid);
    const due = new Date(inv.due_date + "T00:00:00");
    const isOverdue = inv.status === "overdue" || due < today;

    items.push({
      id: `invoice-${inv.id}`,
      kind: isOverdue ? "overdue_invoice" : "open_invoice",
      title: isOverdue
        ? `${inv.invoice_number} is overdue`
        : `${inv.invoice_number} balance due`,
      detail: "",
      href: `/invoices/${inv.id}`,
      amount: balance,
      dueDate: inv.due_date,
    });
  }

  const categoryLabels: Record<string, string> = {
    question: "Question",
    concern: "Concern",
    complaint: "Complaint",
    billing_dispute: "Billing dispute",
    renewal: "Renewal request",
    service_quote: "Quote Request",
  };

  for (const req of supportRes.data ?? []) {
    if (!req.resolution_notes?.trim()) continue;
    items.push({
      id: `support-${req.id}`,
      kind: "support",
      title: `${categoryLabels[req.category] ?? "Support"} — response ready`,
      detail: "GreenScape left a resolution for you to review.",
      href: `/contact/${req.id}`,
    });
  }

  for (const notice of renewalsRes.data) {
    if (notice.renewalRequested) continue;
    const daysLabel =
      notice.daysLeft === 0
        ? "Ends today"
        : notice.daysLeft === 1
          ? "Ends in 1 day"
          : `Ends in ${notice.daysLeft} days`;
    const shortTitle =
      notice.title.replace(/^20\d{2}\s+/, "").trim() || notice.title;
    items.push({
      id: `renewal-${notice.id}`,
      kind: "renewal",
      title: `${shortTitle} is coming up for renewal`,
      detail: `${daysLabel} · ends ${notice.season_end}`,
      href: "#",
      contractId: notice.id,
    });
  }

  // Priority: proposed contracts → overdue → open balance → support → renewals
  const rank: Record<CustomerAttentionItem["kind"], number> = {
    proposed_contract: 0,
    overdue_invoice: 1,
    open_invoice: 2,
    support: 3,
    renewal: 4,
  };
  items.sort((a, b) => {
    const rankDiff = rank[a.kind] - rank[b.kind];
    if (rankDiff !== 0) return rankDiff;
    if (a.kind === "overdue_invoice" || a.kind === "open_invoice") {
      const amtDiff = (b.amount ?? 0) - (a.amount ?? 0);
      if (amtDiff !== 0) return amtDiff;
      return (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
    }
    return 0;
  });

  return {
    data: items.slice(0, 6),
    error: invoicesRes.error ?? supportRes.error ?? proposedRes.error,
  };
}

export type CustomerUpcomingVisit = {
  id: string;
  scheduled_date: string;
  status: string;
  contract_title: string;
  property_name: string;
  address: string | null;
};

/** Next scheduled visits for the customer portal dashboard. */
export async function fetchCustomerUpcomingVisits(
  customerId: string,
  limit = 3
) {
  const supabase = await createDataClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  const { data: contracts } = await supabase
    .from("contracts")
    .select("id")
    .eq("customer_id", customerId);
  const contractIds = contracts?.map((c) => c.id) ?? [];
  if (contractIds.length === 0) {
    return { data: [] as CustomerUpcomingVisit[], error: null };
  }

  const { data, error } = await supabase
    .from("service_visits")
    .select(
      "id, scheduled_date, status, contracts(title, customers(name, address))"
    )
    .in("contract_id", contractIds)
    .eq("status", "scheduled")
    .gte("scheduled_date", todayStr)
    .order("scheduled_date", { ascending: true })
    .limit(limit);

  const visits: CustomerUpcomingVisit[] = (data ?? []).map((v) => {
    const contract = v.contracts as
      | {
          title: string;
          customers:
            | { name: string; address: string | null }
            | { name: string; address: string | null }[]
            | null;
        }
      | {
          title: string;
          customers:
            | { name: string; address: string | null }
            | { name: string; address: string | null }[]
            | null;
        }[]
      | null;

    const c = Array.isArray(contract) ? contract[0] : contract;
    const customers = c?.customers;
    const customer = Array.isArray(customers) ? customers[0] : customers;

    return {
      id: v.id,
      scheduled_date: v.scheduled_date,
      status: v.status,
      contract_title: c?.title ?? "Contract",
      property_name: customer?.name ?? "Property",
      address: customer?.address ?? null,
    };
  });

  return { data: visits, error };
}

export async function fetchQuoteRequests() {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("quote_requests")
    .select("*, customers(id, name, address, contact_name, contact_email)")
    .order("created_at", { ascending: false });
  return { data: data ?? [], error };
}

export async function fetchQuoteRequestById(id: string) {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("quote_requests")
    .select("*, customers(id, name, address, contact_name, contact_email, contact_phone)")
    .eq("id", id)
    .maybeSingle();
  return { data, error };
}

export async function fetchPendingContractApprovals() {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("contracts")
    .select("*, customers(name, address)")
    .eq("approval_state", "pending_approvals")
    .order("created_at", { ascending: false });
  return { data: data ?? [], error };
}

export async function fetchQuotesPendingApproval() {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("quote_requests")
    .select("*, customers(name, address)")
    .eq("status", "pending_manager_approval")
    .order("created_at", { ascending: false });
  if (error) {
    // Pre-migration / missing enum value — return empty rather than crash Manager Contracts.
    return { data: [] as never[], error };
  }
  return { data: data ?? [], error };
}

export async function fetchApprovedQuotesForDraft() {
  const supabase = await createDataClient();
  // Stay in Draft Contracts until Ops sends the contract to the customer
  // (approval_state → pending_customer), not merely when a draft row exists.
  const { data, error } = await supabase
    .from("quote_requests")
    .select("*, customers(name, address)")
    .in("status", ["approved", "contract_drafted"])
    .order("created_at", { ascending: false });
  if (error) {
    return { data: [] as never[], error };
  }

  const rows = data ?? [];
  const draftIds = rows
    .map((q) => q.draft_contract_id as string | null)
    .filter((id): id is string => !!id);

  const draftStateById = new Map<string, string | null>();
  if (draftIds.length > 0) {
    const { data: drafts } = await supabase
      .from("contracts")
      .select("id, approval_state")
      .in("id", draftIds);
    for (const c of drafts ?? []) {
      draftStateById.set(c.id, c.approval_state ?? null);
    }
  }

  const filtered = rows.filter((q) => {
    const draftId = q.draft_contract_id as string | null;
    if (!draftId) return true;
    return draftStateById.get(draftId) === "draft";
  });

  return {
    data: filtered.map((q) => ({
      ...q,
      draft_approval_state: q.draft_contract_id
        ? (draftStateById.get(q.draft_contract_id as string) ?? null)
        : null,
    })),
    error,
  };
}

export async function fetchProposedContractsForCustomer() {
  const supabase = await createDataClient();
  const customerId = await getScopedCustomerId(await getViewRole());
  let query = supabase
    .from("contracts")
    .select("*, customers(name, address)")
    .eq("approval_state", "pending_customer")
    .is("customer_signed_at", null)
    .order("created_at", { ascending: false });
  if (customerId) {
    query = query.eq("customer_id", customerId);
  }
  const { data, error } = await query;
  if (error) {
    return { data: [] as never[], error };
  }
  return { data: data ?? [], error };
}

export async function fetchSignedContractsReadyToSchedule() {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("contracts")
    .select("*, customers(name, address)")
    .eq("status", "active")
    .not("customer_signed_at", "is", null)
    .order("customer_signed_at", { ascending: false });
  return { data: data ?? [], error };
}

