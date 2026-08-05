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

export async function fetchVisits() {
  const supabase = await createDataClient();
  const role = await getViewRole();
  const customerId = await getScopedCustomerId(role);

  let query = supabase
    .from("service_visits")
    .select(
      "*, contracts(title, customer_id, customers(name, address, customer_notes))"
    )
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

export async function fetchAccountantVisits() {
  const supabase = await createDataClient();

  const { data: visits, error } = await supabase
    .from("service_visits")
    .select(
      "*, contracts(id, title, monthly_fee, visits_per_week, assigned_crew, billing_method, customer_id, customers(name))"
    )
    .order("scheduled_date", { ascending: false });

  if (error || !visits) return { data: [], error };

  const visitIds = visits.map((visit) => visit.id);
  const contractIds = [
    ...new Set(visits.map((visit) => visit.contract_id).filter(Boolean)),
  ];

  const [{ data: costs }, { data: invoices }] = await Promise.all([
    visitIds.length
      ? supabase.from("visit_costs").select("*").in("visit_id", visitIds)
      : Promise.resolve({ data: [] as never[] }),
    contractIds.length
      ? supabase
          .from("invoices")
          .select("id, contract_id, status, issue_date, created_at")
          .in("contract_id", contractIds)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  return {
    data: visits.map((visit) => ({
      ...visit,
      visit_costs: (costs ?? []).filter((cost) => cost.visit_id === visit.id),
      invoices: (invoices ?? []).filter(
        (invoice) => invoice.contract_id === visit.contract_id
      ),
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
  kind: "overdue_invoice" | "open_invoice" | "support" | "renewal";
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

  const [invoicesRes, supportRes, renewalsRes] = await Promise.all([
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
  ]);

  const items: CustomerAttentionItem[] = [];

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
    service_quote: "Quote request",
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

  // Priority: overdue (highest balance first) → open balance → support → renewals
  const rank: Record<CustomerAttentionItem["kind"], number> = {
    overdue_invoice: 0,
    open_invoice: 1,
    support: 2,
    renewal: 3,
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
    error: invoicesRes.error ?? supportRes.error,
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
