import { formatVisitCostDescription } from "@/lib/crew-hours";

export type JournalSource = "invoice" | "payment" | "visit" | "manual" | "depreciation";
export type JournalStatus = "draft" | "ready" | "posted";

export type JournalLineInput = {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
};

export type JournalDraft = {
  date: string;
  source: JournalSource;
  sourceId: string | null;
  memo: string;
  reference: string;
  customerName: string;
  contractTitle: string | null;
  lines: JournalLineInput[];
  status?: JournalStatus;
};

export const JOURNAL_ACCOUNTS = [
  { code: "1000", name: "Cash" },
  { code: "1200", name: "Accounts Receivable" },
  { code: "1500", name: "Accumulated Depreciation" },
  { code: "2000", name: "Accounts Payable" },
  { code: "2100", name: "Accrued Expenses" },
  { code: "4000", name: "Service Revenue" },
  { code: "5010", name: "Direct Labor" },
  { code: "5020", name: "Materials" },
  { code: "5030", name: "Equipment" },
  { code: "5040", name: "Depreciation Expense" },
  { code: "5900", name: "Other Expense" },
] as const;

export const JOURNAL_SOURCE_LABELS: Record<JournalSource, string> = {
  invoice: "Invoice",
  payment: "Payment",
  visit: "Visit Cost",
  manual: "Manual",
  depreciation: "Depreciation",
};

export const DEPRECIATION_JOURNAL_CATEGORIES = new Set([
  "Mowers",
  "Trucks/Trailers",
  "Trailers",
  "Irrigation tools",
]);

export const JOURNAL_STATUS_LABELS: Record<JournalStatus, string> = {
  draft: "Draft",
  ready: "Ready",
  posted: "Posted",
};

const INVOICE_JOURNAL_READY_STATUSES = new Set([
  "sent",
  "paid",
  "partially_paid",
  "past_due",
  "overdue",
]);

export function invoiceJournalReadyReason(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "draft") return "Invoice is still a draft";
  if (normalized === "voided") return "Voided invoices cannot be posted";
  if (normalized === "approved") return "Mark the invoice as sent before it is ready";
  if (normalized === "disputed") return "Disputed invoices are not ready to post";
  if (!INVOICE_JOURNAL_READY_STATUSES.has(normalized)) {
    return "Invoice is not ready for a journal entry";
  }
  return null;
}

export function visitJournalReadyReason(status: string, costCount: number) {
  if (status !== "completed") return "Complete the visit before it is ready";
  if (costCount <= 0) return "Add visit costs before it is ready";
  return null;
}

export function paymentJournalReadyReason(input: {
  amount: number;
  invoiceId?: string | null;
}) {
  if (!(input.amount > 0)) return "Payment amount must be greater than zero";
  if (!input.invoiceId) return "Apply the payment to an invoice first";
  return null;
}

export function depreciationJournalReadyReason(input: {
  category: string;
  hours: number;
  amount: number;
}) {
  if (!DEPRECIATION_JOURNAL_CATEGORIES.has(input.category)) {
    return "Automated only for mowers, trucks, trailers, and irrigation";
  }
  if (!(input.hours > 0)) return "Log equipment hours first";
  if (!(input.amount > 0)) return "No depreciable amount for these hours";
  return null;
}

export function depreciationAmountForHours(input: {
  cost: number;
  salvage: number;
  estimatedHours: number;
  hours: number;
}) {
  if (!(input.estimatedHours > 0) || !(input.hours > 0)) return 0;
  const rate = Math.max(0, input.cost - input.salvage) / input.estimatedHours;
  return roundMoney(rate * input.hours);
}

export function depreciationJournalDraft(input: {
  usageId: string;
  usedOn: string;
  hours: number;
  amount: number;
  equipmentName: string;
  category: string;
  customerName: string;
  contractTitle: string | null;
}): JournalDraft {
  const amount = roundMoney(input.amount);
  return {
    date: input.usedOn.slice(0, 10),
    source: "depreciation",
    sourceId: input.usageId,
    memo: `Unit-of-production depreciation — ${input.equipmentName} (${input.hours.toFixed(1)} hrs)`,
    reference: input.equipmentName,
    customerName: input.customerName,
    contractTitle: input.contractTitle,
    lines: [
      {
        accountCode: "5040",
        accountName: `Depreciation Expense — ${input.category}`,
        debit: amount,
        credit: 0,
      },
      {
        accountCode: "1500",
        accountName: "Accumulated Depreciation",
        debit: 0,
        credit: amount,
      },
    ],
  };
}

export function accountNameForCode(code: string) {
  return JOURNAL_ACCOUNTS.find((account) => account.code === code)?.name ?? code;
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function validateJournalLines(lines: JournalLineInput[]) {
  const usable = lines.filter((line) => line.debit > 0 || line.credit > 0);
  if (usable.length < 2) {
    return { ok: false as const, error: "Enter at least two journal lines." };
  }

  const totalDebit = roundMoney(usable.reduce((sum, line) => sum + line.debit, 0));
  const totalCredit = roundMoney(usable.reduce((sum, line) => sum + line.credit, 0));
  if (totalDebit <= 0 || totalCredit <= 0) {
    return { ok: false as const, error: "Debits and credits must be greater than zero." };
  }
  if (Math.abs(totalDebit - totalCredit) > 0.005) {
    return { ok: false as const, error: "Debits must equal credits." };
  }

  return { ok: true as const, lines: usable, totalDebit, totalCredit };
}

export function invoiceJournalDraft(input: {
  invoiceId: string;
  invoiceNumber: string;
  issueDate: string;
  total: number;
  customerName: string;
  contractTitle: string | null;
}): JournalDraft {
  const amount = roundMoney(input.total);
  return {
    date: input.issueDate.slice(0, 10),
    source: "invoice",
    sourceId: input.invoiceId,
    memo: `Invoice ${input.invoiceNumber} — service revenue`,
    reference: input.invoiceNumber,
    customerName: input.customerName,
    contractTitle: input.contractTitle,
    lines: [
      { accountCode: "1200", accountName: "Accounts Receivable", debit: amount, credit: 0 },
      { accountCode: "4000", accountName: "Service Revenue", debit: 0, credit: amount },
    ],
  };
}

export function paymentJournalDraft(input: {
  paymentId: string;
  paymentDate: string;
  amount: number;
  method: string;
  invoiceNumber: string | null;
  customerName: string;
  contractTitle: string | null;
}): JournalDraft {
  const amount = roundMoney(input.amount);
  const method = input.method.replaceAll("_", " ");
  return {
    date: input.paymentDate.slice(0, 10),
    source: "payment",
    sourceId: input.paymentId,
    memo: `Customer payment (${method}) applied to ${input.invoiceNumber ?? "invoice"}`,
    reference: input.invoiceNumber ?? input.paymentId.slice(0, 8),
    customerName: input.customerName,
    contractTitle: input.contractTitle,
    lines: [
      { accountCode: "1000", accountName: "Cash", debit: amount, credit: 0 },
      { accountCode: "1200", accountName: "Accounts Receivable", debit: 0, credit: amount },
    ],
  };
}

export function visitJournalDraft(input: {
  visitId: string;
  scheduledDate: string;
  customerName: string;
  contractTitle: string | null;
  costs: Array<{ cost_type: string; description: string | null; amount: number | string }>;
}): JournalDraft | null {
  const lines: JournalLineInput[] = [];
  let total = 0;

  for (const cost of input.costs) {
    const amount = roundMoney(Number(cost.amount));
    if (amount <= 0) continue;
    total = roundMoney(total + amount);
    const account =
      cost.cost_type === "labor"
        ? { accountCode: "5010", accountName: "Direct Labor" }
        : cost.cost_type === "materials"
          ? { accountCode: "5020", accountName: "Materials" }
          : { accountCode: "5030", accountName: "Equipment" };
    const label = formatVisitCostDescription(
      input.visitId,
      cost.cost_type,
      cost.description
    );
    lines.push({
      ...account,
      accountName: `${account.accountName} — ${label}`,
      debit: amount,
      credit: 0,
    });
  }

  if (lines.length === 0 || total <= 0) return null;

  lines.push({
    accountCode: "2100",
    accountName: "Accrued Expenses",
    debit: 0,
    credit: total,
  });

  return {
    date: input.scheduledDate.slice(0, 10),
    source: "visit",
    sourceId: input.visitId,
    memo: `Visit costs — ${input.contractTitle || "service visit"}`,
    reference: input.visitId.slice(0, 8).toUpperCase(),
    customerName: input.customerName,
    contractTitle: input.contractTitle,
    lines,
  };
}
