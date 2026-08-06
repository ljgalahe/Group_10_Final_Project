"use server";

import { revalidatePath } from "next/cache";
import { createDataClient } from "@/lib/auth-access";
import { getViewRole, roleCanEditContractDetails } from "@/lib/demo-role";
import {
  ACCOUNT_TYPE_LABELS,
  inferAccountType,
  type AccountType,
} from "@/lib/chart-of-accounts";
import {
  accountNameForCode,
  depreciationAmountForHours,
  depreciationJournalDraft,
  depreciationJournalReadyReason,
  invoiceJournalDraft,
  invoiceJournalReadyReason,
  paymentJournalDraft,
  paymentJournalReadyReason,
  roundMoney,
  validateJournalLines,
  visitJournalDraft,
  visitJournalReadyReason,
  type JournalDraft,
  type JournalLineInput,
  type JournalSource,
  type JournalStatus,
} from "@/lib/journal";

async function requireAccountant() {
  const role = await getViewRole();
  if (!roleCanEditContractDetails(role)) {
    return { ok: false as const, error: "Only accountants can post journal entries." };
  }
  return { ok: true as const };
}

function revalidateJournalPaths() {
  revalidatePath("/reports/journal-entries");
  revalidatePath("/reports/general-ledger");
  revalidatePath("/invoices", "layout");
  revalidatePath("/payments", "layout");
  revalidatePath("/visits");
  revalidatePath("/equipment");
  revalidatePath("/contracts", "layout");
}

function parseLines(formData: FormData): JournalLineInput[] {
  const codes = formData.getAll("account_code").map(String);
  const debits = formData.getAll("debit").map(String);
  const credits = formData.getAll("credit").map(String);
  return codes.map((code, index) => ({
    accountCode: code,
    accountName: accountNameForCode(code),
    debit: roundMoney(Number(debits[index] || 0)),
    credit: roundMoney(Number(credits[index] || 0)),
  }));
}

async function nextEntryNumber(supabase: Awaited<ReturnType<typeof createDataClient>>) {
  const { data } = await supabase
    .from("journal_entries")
    .select("entry_number")
    .order("entry_number", { ascending: false })
    .limit(20);

  let max = 0;
  for (const row of data ?? []) {
    const match = /^JE-(\d+)$/.exec(row.entry_number);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `JE-${String(max + 1).padStart(4, "0")}`;
}

async function insertJournalEntry(
  draft: JournalDraft,
  options?: { revalidate?: boolean }
) {
  const check = validateJournalLines(draft.lines);
  if (!check.ok) return { ok: false as const, error: check.error };

  const status: JournalStatus = draft.status ?? "draft";
  const supabase = await createDataClient();
  if (draft.sourceId) {
    const { data: existing } = await supabase
      .from("journal_entries")
      .select("id")
      .eq("source", draft.source)
      .eq("source_id", draft.sourceId)
      .maybeSingle();
    if (existing) {
      return { ok: false as const, error: "A journal entry already exists for this item." };
    }
  }

  const entryNumber = await nextEntryNumber(supabase);
  const { data: entry, error } = await supabase
    .from("journal_entries")
    .insert({
      entry_number: entryNumber,
      entry_date: draft.date,
      source: draft.source,
      source_id: draft.sourceId,
      memo: draft.memo,
      reference: draft.reference,
      customer_name: draft.customerName,
      contract_title: draft.contractTitle,
      status,
      posted_at: status === "posted" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error || !entry) {
    return { ok: false as const, error: error?.message ?? "Could not save journal entry." };
  }

  const { error: lineError } = await supabase.from("journal_entry_lines").insert(
    check.lines.map((line, index) => ({
      journal_entry_id: entry.id,
      line_no: index + 1,
      account_code: line.accountCode,
      account_name: line.accountName,
      debit: line.debit,
      credit: line.credit,
    }))
  );

  if (lineError) {
    await supabase.from("journal_entries").delete().eq("id", entry.id);
    return { ok: false as const, error: lineError.message };
  }

  if (options?.revalidate !== false) revalidateJournalPaths();
  return { ok: true as const, id: entry.id };
}

export async function createManualJournalEntry(formData: FormData) {
  const auth = await requireAccountant();
  if (!auth.ok) return auth;

  return insertJournalEntry({
    date: String(formData.get("entry_date") || ""),
    source: "manual",
    sourceId: null,
    memo: String(formData.get("memo") || "").trim(),
    reference: String(formData.get("reference") || "").trim(),
    customerName: String(formData.get("customer_name") || "").trim(),
    contractTitle: String(formData.get("contract_title") || "").trim() || null,
    lines: parseLines(formData),
    status: "posted",
  });
}

export async function updateJournalEntry(formData: FormData) {
  const auth = await requireAccountant();
  if (!auth.ok) return auth;

  const id = String(formData.get("entry_id") || "");
  const memo = String(formData.get("memo") || "").trim();
  const reference = String(formData.get("reference") || "").trim();
  const date = String(formData.get("entry_date") || "");
  const customerName = String(formData.get("customer_name") || "").trim();
  const contractTitle = String(formData.get("contract_title") || "").trim() || null;
  const check = validateJournalLines(parseLines(formData));
  if (!id) return { ok: false as const, error: "Missing journal entry." };
  if (!memo) return { ok: false as const, error: "Memo is required." };
  if (!date) return { ok: false as const, error: "Date is required." };
  if (!check.ok) return check;

  const supabase = await createDataClient();
  const { data: existing } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("id", id)
    .single();
  if (!existing) return { ok: false as const, error: "Journal entry not found." };

  const { error } = await supabase
    .from("journal_entries")
    .update({
      entry_date: date,
      memo,
      reference,
      customer_name: customerName,
      contract_title: contractTitle,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false as const, error: error.message };

  await supabase.from("journal_entry_lines").delete().eq("journal_entry_id", id);
  const { error: lineError } = await supabase.from("journal_entry_lines").insert(
    check.lines.map((line, index) => ({
      journal_entry_id: id,
      line_no: index + 1,
      account_code: line.accountCode,
      account_name: line.accountName,
      debit: line.debit,
      credit: line.credit,
    }))
  );

  if (lineError) return { ok: false as const, error: lineError.message };

  revalidateJournalPaths();
  return { ok: true as const };
}

export async function markJournalEntryReady(formData: FormData) {
  const auth = await requireAccountant();
  if (!auth.ok) return auth;

  const id = String(formData.get("entry_id") || "");
  if (!id) return { ok: false as const, error: "Missing journal entry." };

  const supabase = await createDataClient();
  const { data: entry } = await supabase
    .from("journal_entries")
    .select("id, status, journal_entry_lines(debit, credit)")
    .eq("id", id)
    .single();
  if (!entry) return { ok: false as const, error: "Journal entry not found." };
  if (entry.status === "posted") {
    return { ok: false as const, error: "This journal entry is already posted." };
  }

  const check = validateJournalLines(
    (entry.journal_entry_lines ?? []).map((line) => ({
      accountCode: "",
      accountName: "",
      debit: Number(line.debit),
      credit: Number(line.credit),
    }))
  );
  if (!check.ok) return check;

  const { error } = await supabase
    .from("journal_entries")
    .update({ status: "ready", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidateJournalPaths();
  return { ok: true as const };
}

export async function postJournalEntry(formData: FormData) {
  const auth = await requireAccountant();
  if (!auth.ok) return auth;

  const id = String(formData.get("entry_id") || "");
  if (!id) return { ok: false as const, error: "Missing journal entry." };

  const supabase = await createDataClient();
  const { data: entry } = await supabase
    .from("journal_entries")
    .select("id, status")
    .eq("id", id)
    .single();
  if (!entry) return { ok: false as const, error: "Journal entry not found." };
  if (entry.status !== "ready") {
    return { ok: false as const, error: "Only ready journal entries can be posted." };
  }

  const { error } = await supabase
    .from("journal_entries")
    .update({
      status: "posted",
      posted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "ready");
  if (error) return { ok: false as const, error: error.message };

  revalidateJournalPaths();
  return { ok: true as const };
}

export async function postAutomatedJournalEntry(formData: FormData) {
  const auth = await requireAccountant();
  if (!auth.ok) return auth;

  const source = String(formData.get("source") || "") as JournalSource;
  const sourceId = String(formData.get("source_id") || "");
  if (!sourceId) return { ok: false as const, error: "Missing source record." };

  const supabase = await createDataClient();

  if (source === "invoice") {
    const { data: invoice } = await supabase
      .from("invoices")
      .select("id, invoice_number, issue_date, total, status, customers(name), contracts(title)")
      .eq("id", sourceId)
      .single();
    if (!invoice) return { ok: false as const, error: "Invoice not found." };
    const notReady = invoiceJournalReadyReason(invoice.status);
    if (notReady) return { ok: false as const, error: notReady };
    const customer = Array.isArray(invoice.customers) ? invoice.customers[0] : invoice.customers;
    const contract = Array.isArray(invoice.contracts) ? invoice.contracts[0] : invoice.contracts;
    return insertJournalEntry({
      ...invoiceJournalDraft({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        issueDate: invoice.issue_date,
        total: Number(invoice.total),
        customerName: customer?.name ?? "",
        contractTitle: contract?.title ?? null,
      }),
      status: "posted",
    });
  }

  if (source === "payment") {
    const { data: payment } = await supabase
      .from("payments")
      .select(
        "id, amount, payment_date, payment_method, invoice_id, invoices(invoice_number, customers(name), contracts(title)), customers(name)"
      )
      .eq("id", sourceId)
      .single();
    if (!payment) return { ok: false as const, error: "Payment not found." };
    const notReady = paymentJournalReadyReason({
      amount: Number(payment.amount),
      invoiceId: payment.invoice_id,
    });
    if (notReady) return { ok: false as const, error: notReady };
    const invoice = Array.isArray(payment.invoices) ? payment.invoices[0] : payment.invoices;
    const invoiceCustomer = Array.isArray(invoice?.customers)
      ? invoice?.customers[0]
      : invoice?.customers;
    const contract = Array.isArray(invoice?.contracts) ? invoice?.contracts[0] : invoice?.contracts;
    const customer = Array.isArray(payment.customers) ? payment.customers[0] : payment.customers;
    return insertJournalEntry({
      ...paymentJournalDraft({
        paymentId: payment.id,
        paymentDate: payment.payment_date,
        amount: Number(payment.amount),
        method: payment.payment_method,
        invoiceNumber: invoice?.invoice_number ?? null,
        customerName: customer?.name ?? invoiceCustomer?.name ?? "",
        contractTitle: contract?.title ?? null,
      }),
      status: "posted",
    });
  }

  if (source === "visit") {
    const { data: visit } = await supabase
      .from("service_visits")
      .select("id, scheduled_date, status, contracts(title, customers(name))")
      .eq("id", sourceId)
      .single();
    if (!visit) return { ok: false as const, error: "Visit not found." };
    const { data: costs } = await supabase
      .from("visit_costs")
      .select("cost_type, description, amount")
      .eq("visit_id", sourceId);
    const notReady = visitJournalReadyReason(visit.status, costs?.length ?? 0);
    if (notReady) return { ok: false as const, error: notReady };
    const contract = Array.isArray(visit.contracts) ? visit.contracts[0] : visit.contracts;
    const customer = Array.isArray(contract?.customers)
      ? contract?.customers[0]
      : contract?.customers;
    const draft = visitJournalDraft({
      visitId: visit.id,
      scheduledDate: visit.scheduled_date,
      customerName: customer?.name ?? "",
      contractTitle: contract?.title ?? null,
      costs: costs ?? [],
    });
    if (!draft) return { ok: false as const, error: "This visit has no costs to post." };
    return insertJournalEntry({ ...draft, status: "posted" });
  }

  if (source === "depreciation") {
    return postDepreciationJournalForUsage(sourceId);
  }

  return { ok: false as const, error: "Unsupported journal source." };
}

export async function backfillDepreciationJournals() {
  const auth = await requireAccountant();
  if (!auth.ok) return auth;

  const supabase = await createDataClient();
  const [{ data: usageRows }, { data: existing }] = await Promise.all([
    supabase.from("equipment_usage").select("id"),
    supabase
      .from("journal_entries")
      .select("source_id")
      .eq("source", "depreciation")
      .not("source_id", "is", null),
  ]);

  const posted = new Set(
    (existing ?? []).map((row) => row.source_id).filter(Boolean) as string[]
  );

  const unposted = (usageRows ?? []).filter((row) => !posted.has(row.id));
  for (const row of unposted) {
    await postDepreciationJournalForUsage(row.id, { revalidate: false });
  }

  return { ok: true as const };
}

export async function postDepreciationJournalForUsage(
  usageId: string,
  options?: { revalidate?: boolean }
) {
  const supabase = await createDataClient();
  const { data: usage } = await supabase
    .from("equipment_usage")
    .select(
      "id, hours, used_on, equipment_id, equipment(name, category, cost, salvage_value, estimated_total_hours), service_visits(contracts(title, customers(name)))"
    )
    .eq("id", usageId)
    .single();
  if (!usage) return { ok: false as const, error: "Equipment usage not found." };

  const equipment = Array.isArray(usage.equipment) ? usage.equipment[0] : usage.equipment;
  if (!equipment) return { ok: false as const, error: "Equipment not found." };

  const visit = Array.isArray(usage.service_visits)
    ? usage.service_visits[0]
    : usage.service_visits;
  const contract = Array.isArray(visit?.contracts) ? visit?.contracts[0] : visit?.contracts;
  const customer = Array.isArray(contract?.customers)
    ? contract?.customers[0]
    : contract?.customers;

  const amount = depreciationAmountForHours({
    cost: Number(equipment.cost),
    salvage: Number(equipment.salvage_value),
    estimatedHours: Number(equipment.estimated_total_hours),
    hours: Number(usage.hours),
  });
  const notReady = depreciationJournalReadyReason({
    category: equipment.category,
    hours: Number(usage.hours),
    amount,
  });
  if (notReady) return { ok: false as const, error: notReady };

  return insertJournalEntry(
    {
      ...depreciationJournalDraft({
        usageId: usage.id,
        usedOn: String(usage.used_on),
        hours: Number(usage.hours),
        amount,
        equipmentName: equipment.name,
        category: equipment.category,
        customerName: customer?.name ?? "",
        contractTitle: contract?.title ?? null,
      }),
      status: "posted",
    },
    options
  );
}

export async function deleteJournalEntry(formData: FormData) {
  const auth = await requireAccountant();
  if (!auth.ok) return auth;

  const id = String(formData.get("entry_id") || "");
  if (!id) return { ok: false as const, error: "Missing journal entry." };

  const supabase = await createDataClient();
  const { error } = await supabase.from("journal_entries").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidateJournalPaths();
  return { ok: true as const };
}

const VALID_ACCOUNT_TYPES = new Set(Object.keys(ACCOUNT_TYPE_LABELS));

export async function addChartOfAccountAction(
  _prev: { ok: boolean; error?: string } | null,
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAccountant();
  if (!auth.ok) return auth;

  const code = String(formData.get("account_code") || "").trim();
  const name = String(formData.get("account_name") || "").trim();
  const accountTypeRaw = String(formData.get("account_type") || "").trim();
  const accountType = (
    VALID_ACCOUNT_TYPES.has(accountTypeRaw)
      ? accountTypeRaw
      : inferAccountType(code)
  ) as AccountType;

  if (!/^\d{4}$/.test(code)) {
    return { ok: false, error: "Account code must be exactly 4 digits." };
  }
  if (!name) {
    return { ok: false, error: "Account name is required." };
  }

  const supabase = await createDataClient();
  const { error } = await supabase.from("chart_of_accounts").insert({
    code,
    name,
    account_type: accountType,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "That account code is already in use." };
    }
    if (/chart_of_accounts/i.test(error.message)) {
      return {
        ok: false,
        error: "Chart of accounts is not set up yet. Run the latest database migration.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidateJournalPaths();
  return { ok: true };
}
