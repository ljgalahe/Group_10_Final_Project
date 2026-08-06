import { formatCurrency } from "@/lib/format";
import { landscapePairById } from "@/lib/landscape-proof-photos";
import type { Invoice, InvoiceLine } from "@/lib/types";

const lawnMow = landscapePairById("lawn-mow");
const flowerBed = landscapePairById("flower-bed");
const mulchBed = landscapePairById("mulch-bed");
const leafCleanup = landscapePairById("leaf-cleanup");
const hedgeTrim = landscapePairById("hedge-trim");

export const SEED_INVOICE = {
  riversidePaid: "55555555-5555-5555-5555-555555555501",
  riversideJune: "55555555-5555-5555-5555-555555555502",
  summitPaid: "55555555-5555-5555-5555-555555555503",
  metroOverdue: "55555555-5555-5555-5555-555555555504",
  harborPartial: "55555555-5555-5555-5555-555555555505",
} as const;

export type ManagerInvoiceStatus =
  | "ready"
  | "needs_review"
  | "blocked"
  | "overdue"
  | "disputed"
  | "partially_paid"
  | "paid"
  | "sent";

export type CollectionPriority = "critical" | "high" | "medium" | "low";

export interface ReadinessCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface ProfitBreakdown {
  revenue: number;
  labor: number;
  materials: number;
  equipment: number;
  travelFuel: number;
  other: number;
  profit: number;
  marginPct: number;
  belowTarget: boolean;
}

export interface WhyDifferentItem {
  message: string;
  kind: "info" | "warning";
}

export interface DuplicateShield {
  blocked: boolean;
  message: string | null;
}

export interface EvidencePackage {
  contractRequirements: string[];
  scheduledService: string;
  crew: string[];
  arrival: string;
  completion: string;
  beforeImage: string;
  afterImage: string;
  crewNotes: string;
  materials: string[];
  equipment: string[];
  customerApproval: string;
  extraWorkApproval: string;
  customerAck: string;
  relatedLines: string[];
}

export interface TimelineStep {
  id: string;
  label: string;
  at: string | null;
  done: boolean;
  current: boolean;
}

export interface ApprovalRequirement {
  required: boolean;
  reasons: string[];
  approver: string;
  status: "not_required" | "pending" | "approved" | "rejected";
}

export interface PaymentPromise {
  amount: number;
  promisedDate: string;
  contact: string;
  notes: string;
  status: "open" | "kept" | "broken";
}

export interface UnbilledWorkItem {
  id: string;
  customerName: string;
  property: string;
  serviceDate: string;
  service: string;
  amount: number;
  daysWaiting: number;
  reason: string;
  contractId: string;
  visitId?: string;
}

export interface ManagerInvoiceRow {
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  property: string;
  contractTitle: string;
  contractId: string;
  customerId: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  amountPaid: number;
  balance: number;
  dbStatus: string;
  managerStatus: ManagerInvoiceStatus;
  readinessScore: number;
  readinessLabel: "Ready to Send" | "Needs Review" | "Blocked";
  checks: ReadinessCheck[];
  profit: ProfitBreakdown;
  daysOutstanding: number;
  exception: string;
  highRisk: boolean;
  whyDifferent: WhyDifferentItem[];
  duplicateShield: DuplicateShield;
  evidence: EvidencePackage;
  explainableSummary: string;
  timeline: TimelineStep[];
  approval: ApprovalRequirement;
  collectionPriority: CollectionPriority;
  paymentPromise: PaymentPromise | null;
  canSend: boolean;
}

const TARGET_MARGIN = 28;

function daysBetween(from: string, to = "2026-08-04") {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

function readinessLabel(score: number): ManagerInvoiceRow["readinessLabel"] {
  if (score >= 90) return "Ready to Send";
  if (score >= 70) return "Needs Review";
  return "Blocked";
}

function managerStatusFrom(
  dbStatus: string,
  balance: number,
  amountPaid: number,
  total: number,
  score: number,
  blocked: boolean,
  disputed: boolean
): ManagerInvoiceStatus {
  if (disputed) return "disputed";
  if (dbStatus === "paid" || balance <= 0) return "paid";
  if (dbStatus === "overdue") return "overdue";
  if (amountPaid > 0 && amountPaid < total) return "partially_paid";
  if (blocked || score < 70) return "blocked";
  if (score >= 90 && dbStatus === "draft") return "ready";
  if (dbStatus === "sent") return "sent";
  if (score >= 70) return "needs_review";
  return "blocked";
}

type Overlay = {
  property: string;
  checks: ReadinessCheck[];
  profit: Omit<ProfitBreakdown, "profit" | "marginPct" | "belowTarget"> & {
    revenue?: number;
  };
  exception: string;
  highRisk?: boolean;
  disputed?: boolean;
  whyDifferent: WhyDifferentItem[];
  duplicateShield: DuplicateShield;
  evidence: EvidencePackage;
  explainableSummary: string;
  timeline: Omit<TimelineStep, "current">[];
  approval: ApprovalRequirement;
  collectionPriority: CollectionPriority;
  paymentPromise: PaymentPromise | null;
};

const OVERLAYS: Record<string, Overlay> = {
  [SEED_INVOICE.riversidePaid]: {
    property: "1200 University Ave, Oxford, MS",
    checks: [
      { id: "completed", label: "Service visit completed", passed: true, detail: "May maintenance completed" },
      { id: "docs", label: "Crew documentation exists", passed: true, detail: "Crew notes on file" },
      { id: "costs", label: "Labor and materials recorded", passed: true, detail: "Costs logged" },
      { id: "extra", label: "Extra work approved", passed: true, detail: "N/A — recurring only" },
      { id: "pricing", label: "Pricing matches contract", passed: true, detail: "$2,400 monthly fee" },
      { id: "active", label: "Contract was active", passed: true, detail: "Season open" },
      { id: "dup", label: "Not billed previously", passed: true, detail: "Unique May period" },
      { id: "evidence", label: "Service evidence attached", passed: true, detail: "Photos on file" },
    ],
    profit: { revenue: 2400, labor: 720, materials: 180, equipment: 120, travelFuel: 60, other: 40 },
    exception: "None",
    whyDifferent: [{ message: "Matches the regular monthly maintenance pattern.", kind: "info" }],
    duplicateShield: { blocked: false, message: null },
    evidence: {
      contractRequirements: ["Mowing 2×/week", "Edging", "Trimming"],
      scheduledService: "May monthly maintenance",
      crew: ["Alex Rivera", "Jordan Lee"],
      arrival: "2026-05-12T08:05:00Z",
      completion: "2026-05-12T14:00:00Z",
      beforeImage: lawnMow.beforeImage,
      afterImage: lawnMow.afterImage,
      crewNotes: "Standard grounds pass — all areas.",
      materials: ["Fertilizer blend"],
      equipment: ["Mower", "Edger"],
      customerApproval: "Standing monthly authorization",
      extraWorkApproval: "N/A",
      customerAck: "Acknowledged May 13",
      relatedLines: ["Monthly maintenance — Riverside (May 2026)"],
    },
    explainableSummary:
      "This invoice covers the regular monthly maintenance fee of $2,400 for May 2026. All related work was completed and paid in full.",
    timeline: [
      { id: "sched", label: "Work scheduled", at: "2026-05-01", done: true },
      { id: "done", label: "Work completed", at: "2026-05-12", done: true },
      { id: "costs", label: "Costs recorded", at: "2026-05-12", done: true },
      { id: "review", label: "Manager reviewed", at: "2026-05-14", done: true },
      { id: "created", label: "Invoice created", at: "2026-05-01", done: true },
      { id: "sent", label: "Invoice sent", at: "2026-05-01", done: true },
      { id: "viewed", label: "Customer viewed", at: "2026-05-05", done: true },
      { id: "paid", label: "Payment received", at: "2026-05-28", done: true },
      { id: "closed", label: "Paid / closed", at: "2026-05-28", done: true },
    ],
    approval: {
      required: false,
      reasons: [],
      approver: "N/A",
      status: "not_required",
    },
    collectionPriority: "low",
    paymentPromise: null,
  },
  [SEED_INVOICE.riversideJune]: {
    property: "1200 University Ave, Oxford, MS",
    checks: [
      { id: "completed", label: "Service visit completed", passed: true, detail: "June visits completed" },
      { id: "docs", label: "Crew documentation exists", passed: true, detail: "Notes on file" },
      { id: "costs", label: "Labor and materials recorded", passed: true, detail: "Mulch + labor logged" },
      { id: "extra", label: "Extra work approved", passed: true, detail: "Mulch WO approved May 20" },
      { id: "pricing", label: "Pricing matches contract", passed: true, detail: "Fee + approved extra" },
      { id: "active", label: "Contract was active", passed: true, detail: "Season open" },
      { id: "dup", label: "Not billed previously", passed: true, detail: "June period unique" },
      { id: "evidence", label: "Service evidence attached", passed: false, detail: "After photos missing for mulch beds" },
    ],
    profit: { revenue: 4250, labor: 980, materials: 920, equipment: 160, travelFuel: 75, other: 55 },
    exception: "Missing service evidence",
    highRisk: false,
    whyDifferent: [
      { message: "Invoice is 34% higher than the customer’s three-month average.", kind: "warning" },
      { message: "Approved mulch installation added $1,850 to the total.", kind: "info" },
      { message: "Labor cost is slightly above estimate for entrance beds.", kind: "warning" },
    ],
    duplicateShield: { blocked: false, message: null },
    evidence: {
      contractRequirements: ["Mowing", "Edging", "Trimming", "Spring cleanup"],
      scheduledService: "June maintenance + mulch install",
      crew: ["Alex Rivera", "Sam Ortiz", "Casey Ng"],
      arrival: "2026-06-02T07:50:00Z",
      completion: "2026-06-09T15:30:00Z",
      beforeImage: mulchBed.beforeImage,
      afterImage: mulchBed.afterImage,
      crewNotes: "Mulch installed at entrance; hedge trim completed.",
      materials: ["12 yd premium mulch"],
      equipment: ["Mower", "Edger", "Mulch blower"],
      customerApproval: "Standing monthly authorization",
      extraWorkApproval: "Mulch WO approved 2026-05-20",
      customerAck: "Pending acknowledgment",
      relatedLines: [
        "Monthly maintenance — Riverside (June 2026)",
        "Extra work: Mulch Installation — Entrance Beds",
      ],
    },
    explainableSummary:
      "This invoice includes the regular monthly maintenance fee of $2,400 and one approved mulch installation of $1,850. Related work was completed; after-photo evidence for mulch beds still needs attachment.",
    timeline: [
      { id: "sched", label: "Work scheduled", at: "2026-06-01", done: true },
      { id: "done", label: "Work completed", at: "2026-06-09", done: true },
      { id: "costs", label: "Costs recorded", at: "2026-06-09", done: true },
      { id: "review", label: "Manager reviewed", at: null, done: false },
      { id: "created", label: "Invoice created", at: "2026-06-01", done: true },
      { id: "sent", label: "Invoice sent", at: "2026-06-01", done: true },
      { id: "viewed", label: "Customer viewed", at: "2026-06-08", done: true },
      { id: "paid", label: "Payment received", at: null, done: false },
      { id: "closed", label: "Paid / closed", at: null, done: false },
    ],
    approval: {
      required: false,
      reasons: [],
      approver: "N/A",
      status: "not_required",
    },
    collectionPriority: "high",
    paymentPromise: {
      amount: 4250,
      promisedDate: "2026-07-15",
      contact: "Maria Chen",
      notes: "Will pay after board review",
      status: "broken",
    },
  },
  [SEED_INVOICE.summitPaid]: {
    property: "450 Jackson Ave W, Oxford, MS",
    checks: [
      { id: "completed", label: "Service visit completed", passed: true, detail: "June frontage completed" },
      { id: "docs", label: "Crew documentation exists", passed: true, detail: "Notes on file" },
      { id: "costs", label: "Labor and materials recorded", passed: true, detail: "Costs logged" },
      { id: "extra", label: "Extra work approved", passed: true, detail: "N/A" },
      { id: "pricing", label: "Pricing matches contract", passed: true, detail: "$3,200 monthly" },
      { id: "active", label: "Contract was active", passed: true, detail: "Season open" },
      { id: "dup", label: "Not billed previously", passed: true, detail: "June unique" },
      { id: "evidence", label: "Service evidence attached", passed: true, detail: "Package complete" },
    ],
    profit: { revenue: 3200, labor: 860, materials: 210, equipment: 140, travelFuel: 70, other: 30 },
    exception: "None",
    whyDifferent: [{ message: "Aligned with Summit’s recurring monthly billing.", kind: "info" }],
    duplicateShield: { blocked: false, message: null },
    evidence: {
      contractRequirements: ["Mowing 3×/week", "Edging", "Fertilization"],
      scheduledService: "June retail frontage care",
      crew: ["Taylor Brooks", "Morgan Diaz", "Riley Chen"],
      arrival: "2026-06-03T07:40:00Z",
      completion: "2026-06-03T12:10:00Z",
      beforeImage: lawnMow.beforeImage,
      afterImage: lawnMow.afterImage,
      crewNotes: "Retail frontage mowed and edged.",
      materials: ["Fertilizer"],
      equipment: ["Mower", "Edger"],
      customerApproval: "Standing monthly authorization",
      extraWorkApproval: "N/A",
      customerAck: "Acknowledged",
      relatedLines: ["Monthly maintenance — Summit Retail (June 2026)"],
    },
    explainableSummary:
      "This invoice includes the regular monthly maintenance fee of $3,200 for Summit Retail. Work was completed and paid.",
    timeline: [
      { id: "sched", label: "Work scheduled", at: "2026-06-01", done: true },
      { id: "done", label: "Work completed", at: "2026-06-03", done: true },
      { id: "costs", label: "Costs recorded", at: "2026-06-03", done: true },
      { id: "review", label: "Manager reviewed", at: "2026-06-04", done: true },
      { id: "created", label: "Invoice created", at: "2026-06-01", done: true },
      { id: "sent", label: "Invoice sent", at: "2026-06-01", done: true },
      { id: "viewed", label: "Customer viewed", at: "2026-06-10", done: true },
      { id: "paid", label: "Payment received", at: "2026-06-15", done: true },
      { id: "closed", label: "Paid / closed", at: "2026-06-15", done: true },
    ],
    approval: { required: false, reasons: [], approver: "N/A", status: "not_required" },
    collectionPriority: "low",
    paymentPromise: null,
  },
  [SEED_INVOICE.metroOverdue]: {
    property: "900 Molly Barr Rd, Oxford, MS",
    checks: [
      { id: "completed", label: "Service visit completed", passed: true, detail: "April grounds completed" },
      { id: "docs", label: "Crew documentation exists", passed: false, detail: "Crew notes incomplete" },
      { id: "costs", label: "Labor and materials recorded", passed: true, detail: "High pond labor logged" },
      { id: "extra", label: "Extra work approved", passed: false, detail: "Pond overtime not change-ordered" },
      { id: "pricing", label: "Pricing matches contract", passed: true, detail: "$4,500 monthly" },
      { id: "active", label: "Contract was active", passed: true, detail: "Season open" },
      { id: "dup", label: "Not billed previously", passed: false, detail: "Risk: overlapping April fee already disputed" },
      { id: "evidence", label: "Service evidence attached", passed: false, detail: "No photo package" },
    ],
    profit: { revenue: 4500, labor: 2100, materials: 380, equipment: 420, travelFuel: 140, other: 110 },
    exception: "Overdue balance · Low margin · Duplicate billing risk",
    highRisk: true,
    disputed: true,
    whyDifferent: [
      { message: "Labor cost is far above estimate due to detention pond overtime.", kind: "warning" },
      { message: "Customer disputes April charges pending change-order review.", kind: "warning" },
    ],
    duplicateShield: {
      blocked: true,
      message:
        "Invoice blocked: Service Visit SV-1048 was already included on Invoice INV-2215.",
    },
    evidence: {
      contractRequirements: ["Mowing", "Detention pond maintenance"],
      scheduledService: "April industrial grounds",
      crew: ["Taylor Brooks", "Jordan Lee", "Sam Ortiz", "Casey Ng"],
      arrival: "2026-04-04T07:30:00Z",
      completion: "2026-04-04T16:00:00Z",
      beforeImage: leafCleanup.beforeImage,
      afterImage: leafCleanup.afterImage,
      crewNotes: "Extra time on pond area — costs running high.",
      materials: ["Pond treatment chemicals"],
      equipment: ["Extended equipment rental"],
      customerApproval: "Standing monthly authorization",
      extraWorkApproval: "Missing — overtime not approved",
      customerAck: "Dispute opened",
      relatedLines: ["Monthly maintenance — Metro Industrial (April 2026)"],
    },
    explainableSummary:
      "This invoice covers the April monthly fee of $4,500. Pond overtime drove costs up and the customer has disputed the charge. Duplicate-billing risk blocks further send actions.",
    timeline: [
      { id: "sched", label: "Work scheduled", at: "2026-04-01", done: true },
      { id: "done", label: "Work completed", at: "2026-04-04", done: true },
      { id: "costs", label: "Costs recorded", at: "2026-04-04", done: true },
      { id: "review", label: "Manager reviewed", at: "2026-04-10", done: true },
      { id: "created", label: "Invoice created", at: "2026-04-01", done: true },
      { id: "sent", label: "Invoice sent", at: "2026-04-01", done: true },
      { id: "viewed", label: "Customer viewed", at: "2026-04-20", done: true },
      { id: "paid", label: "Payment received", at: null, done: false },
      { id: "closed", label: "Paid / closed", at: null, done: false },
    ],
    approval: {
      required: true,
      reasons: ["Negative/low margin work", "Unapproved additional work", "Disputed charge"],
      approver: "Regional Manager",
      status: "pending",
    },
    collectionPriority: "critical",
    paymentPromise: {
      amount: 2000,
      promisedDate: "2026-06-01",
      contact: "Ops Finance — Metro",
      notes: "Partial catch-up promised; not received",
      status: "broken",
    },
  },
  [SEED_INVOICE.harborPartial]: {
    property: "88 South Lamar Blvd, Oxford, MS",
    checks: [
      { id: "completed", label: "Service visit completed", passed: true, detail: "July common areas" },
      { id: "docs", label: "Crew documentation exists", passed: true, detail: "Notes on file" },
      { id: "costs", label: "Labor and materials recorded", passed: true, detail: "Costs logged" },
      { id: "extra", label: "Extra work approved", passed: true, detail: "Storm cleanup quoted separately" },
      { id: "pricing", label: "Pricing matches contract", passed: true, detail: "$1,800 monthly" },
      { id: "active", label: "Contract was active", passed: true, detail: "Season open" },
      { id: "dup", label: "Not billed previously", passed: true, detail: "July unique" },
      { id: "evidence", label: "Service evidence attached", passed: true, detail: "Package on file" },
    ],
    profit: { revenue: 1800, labor: 520, materials: 90, equipment: 80, travelFuel: 45, other: 25 },
    exception: "Partial payment",
    whyDifferent: [
      { message: "Customer sent a partial payment of $900 against $1,800.", kind: "info" },
      { message: "Quoted storm cleanup ($950) is not on this invoice yet.", kind: "info" },
    ],
    duplicateShield: { blocked: false, message: null },
    evidence: {
      contractRequirements: ["Mowing", "Bed weeding"],
      scheduledService: "July HOA common areas",
      crew: ["Alex Rivera", "Jordan Lee"],
      arrival: "2026-07-08T08:00:00Z",
      completion: "2026-07-08T12:30:00Z",
      beforeImage: flowerBed.beforeImage,
      afterImage: flowerBed.afterImage,
      crewNotes: "Common areas and entrance beds.",
      materials: [],
      equipment: ["Mower"],
      customerApproval: "HOA standing PO",
      extraWorkApproval: "Storm WO still quoted",
      customerAck: "Partial payment recorded",
      relatedLines: ["Monthly maintenance — Harbor View HOA (July 2026)"],
    },
    explainableSummary:
      "This invoice includes the regular monthly maintenance fee of $1,800. The customer has paid $900 so far; storm cleanup remains quoted separately.",
    timeline: [
      { id: "sched", label: "Work scheduled", at: "2026-07-01", done: true },
      { id: "done", label: "Work completed", at: "2026-07-08", done: true },
      { id: "costs", label: "Costs recorded", at: "2026-07-08", done: true },
      { id: "review", label: "Manager reviewed", at: "2026-07-09", done: true },
      { id: "created", label: "Invoice created", at: "2026-07-01", done: true },
      { id: "sent", label: "Invoice sent", at: "2026-07-01", done: true },
      { id: "viewed", label: "Customer viewed", at: "2026-07-05", done: true },
      { id: "paid", label: "Payment received", at: "2026-07-10", done: true },
      { id: "closed", label: "Paid / closed", at: null, done: false },
    ],
    approval: { required: false, reasons: [], approver: "N/A", status: "not_required" },
    collectionPriority: "medium",
    paymentPromise: {
      amount: 900,
      promisedDate: "2026-08-01",
      contact: "Harbor View HOA Treasurer",
      notes: "Balance after partial ACH",
      status: "open",
    },
  },
};

function scoreFromChecks(checks: ReadinessCheck[]) {
  if (checks.length === 0) return 0;
  const passed = checks.filter((c) => c.passed).length;
  return Math.round((passed / checks.length) * 100);
}

function finalizeProfit(
  revenue: number,
  parts: Overlay["profit"]
): ProfitBreakdown {
  const labor = parts.labor;
  const materials = parts.materials;
  const equipment = parts.equipment;
  const travelFuel = parts.travelFuel;
  const other = parts.other;
  const costs = labor + materials + equipment + travelFuel + other;
  const profit = revenue - costs;
  const marginPct = revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0;
  return {
    revenue,
    labor,
    materials,
    equipment,
    travelFuel,
    other,
    profit,
    marginPct,
    belowTarget: marginPct < TARGET_MARGIN,
  };
}

function defaultOverlay(invoice: Invoice & { customers?: { name?: string; address?: string } | null; contracts?: { title?: string } | null }): Overlay {
  const name = invoice.customers?.name ?? "Customer";
  return {
    property: invoice.customers?.address ?? "Property TBD",
    checks: [
      { id: "completed", label: "Service visit completed", passed: true, detail: "Assumed complete" },
      { id: "docs", label: "Crew documentation exists", passed: true, detail: "Demo default" },
      { id: "costs", label: "Labor and materials recorded", passed: true, detail: "Demo default" },
      { id: "extra", label: "Extra work approved", passed: true, detail: "Demo default" },
      { id: "pricing", label: "Pricing matches contract", passed: true, detail: "Demo default" },
      { id: "active", label: "Contract was active", passed: true, detail: "Demo default" },
      { id: "dup", label: "Not billed previously", passed: true, detail: "Demo default" },
      { id: "evidence", label: "Service evidence attached", passed: true, detail: "Demo default" },
    ],
    profit: {
      revenue: Number(invoice.total),
      labor: Number(invoice.total) * 0.35,
      materials: Number(invoice.total) * 0.08,
      equipment: Number(invoice.total) * 0.05,
      travelFuel: Number(invoice.total) * 0.02,
      other: Number(invoice.total) * 0.01,
    },
    exception: "None",
    whyDifferent: [{ message: `Standard billing for ${name}.`, kind: "info" }],
    duplicateShield: { blocked: false, message: null },
    evidence: {
      contractRequirements: ["Contracted services"],
      scheduledService: invoice.contracts?.title ?? "Service",
      crew: ["Crew TBD"],
      arrival: `${invoice.issue_date}T08:00:00Z`,
      completion: `${invoice.issue_date}T14:00:00Z`,
      beforeImage: hedgeTrim.beforeImage,
      afterImage: hedgeTrim.afterImage,
      crewNotes: "Demo package",
      materials: [],
      equipment: [],
      customerApproval: "Standing authorization",
      extraWorkApproval: "N/A",
      customerAck: "Pending",
      relatedLines: [],
    },
    explainableSummary: `This invoice totals ${formatCurrency(Number(invoice.total))} for ${name}.`,
    timeline: [
      { id: "created", label: "Invoice created", at: invoice.issue_date, done: true },
      { id: "sent", label: "Invoice sent", at: invoice.status === "draft" ? null : invoice.issue_date, done: invoice.status !== "draft" },
      { id: "paid", label: "Payment received", at: null, done: Number(invoice.amount_paid) > 0 },
      { id: "closed", label: "Paid / closed", at: null, done: invoice.status === "paid" },
    ],
    approval: { required: false, reasons: [], approver: "N/A", status: "not_required" },
    collectionPriority: Number(invoice.total) - Number(invoice.amount_paid) > 0 ? "medium" : "low",
    paymentPromise: null,
  };
}

export function buildManagerInvoiceRow(
  invoice: Invoice & {
    customers?: { name?: string; address?: string; property_type?: string } | null;
    contracts?: { title?: string } | null;
    invoice_lines?: InvoiceLine[];
  }
): ManagerInvoiceRow {
  const overlay = OVERLAYS[invoice.id] ?? defaultOverlay(invoice);
  const amount = Number(invoice.total);
  const amountPaid = Number(invoice.amount_paid);
  const balance = amount - amountPaid;
  const score = scoreFromChecks(overlay.checks);
  const profit = finalizeProfit(overlay.profit.revenue ?? amount, overlay.profit);
  const blocked = overlay.duplicateShield.blocked || score < 70;
  const managerStatus = managerStatusFrom(
    invoice.status,
    balance,
    amountPaid,
    amount,
    score,
    blocked,
    !!overlay.disputed
  );

  const firstIncomplete = overlay.timeline.findIndex((s) => !s.done);
  const timeline: TimelineStep[] = overlay.timeline.map((step, i) => ({
    ...step,
    current: i === (firstIncomplete === -1 ? overlay.timeline.length - 1 : firstIncomplete),
  }));

  return {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoice_number,
    customerName: invoice.customers?.name ?? "Customer",
    property: overlay.property,
    contractTitle: invoice.contracts?.title ?? "Contract",
    contractId: invoice.contract_id,
    customerId: invoice.customer_id,
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    amount,
    amountPaid,
    balance,
    dbStatus: invoice.status,
    managerStatus,
    readinessScore: score,
    readinessLabel: readinessLabel(score),
    checks: overlay.checks,
    profit,
    daysOutstanding: balance > 0 ? daysBetween(invoice.due_date) : 0,
    exception: overlay.exception,
    highRisk: !!overlay.highRisk || overlay.disputed || blocked || managerStatus === "overdue",
    whyDifferent: overlay.whyDifferent,
    duplicateShield: overlay.duplicateShield,
    evidence: {
      ...overlay.evidence,
      relatedLines:
        overlay.evidence.relatedLines.length > 0
          ? overlay.evidence.relatedLines
          : (invoice.invoice_lines ?? []).map((l) => l.description),
    },
    explainableSummary: overlay.explainableSummary,
    timeline,
    approval: overlay.approval,
    collectionPriority: overlay.collectionPriority,
    paymentPromise: overlay.paymentPromise,
    canSend: !blocked && score >= 70 && invoice.status === "draft",
  };
}

export function buildUnbilledWork(): UnbilledWorkItem[] {
  return [
    {
      id: "unbilled-1",
      customerName: "Riverside Office Park",
      property: "1200 University Ave, Oxford, MS",
      serviceDate: "2026-07-22",
      service: "Irrigation repair — Zone 3",
      amount: 620,
      daysWaiting: 13,
      reason: "Waiting on manager review",
      contractId: "22222222-2222-2222-2222-222222222201",
      visitId: "33333333-3333-3333-3333-333333333302",
    },
    {
      id: "unbilled-2",
      customerName: "Summit Retail Center",
      property: "450 Jackson Ave W, Oxford, MS",
      serviceDate: "2026-07-18",
      service: "Storm debris removal",
      amount: 640,
      daysWaiting: 17,
      reason: "Extra work not yet change-ordered",
      contractId: "22222222-2222-2222-2222-222222222202",
    },
    {
      id: "unbilled-3",
      customerName: "Harbor View HOA",
      property: "88 South Lamar Blvd, Oxford, MS",
      serviceDate: "2026-07-05",
      service: "Storm Damage Cleanup (quoted)",
      amount: 950,
      daysWaiting: 30,
      reason: "Customer approval still pending",
      contractId: "22222222-2222-2222-2222-222222222203",
    },
    {
      id: "unbilled-4",
      customerName: "Metro Industrial",
      property: "900 Molly Barr Rd, Oxford, MS",
      serviceDate: "2026-07-16",
      service: "Irrigation repair (repeat)",
      amount: 185,
      daysWaiting: 19,
      reason: "Blocked pending dispute resolution",
      contractId: "22222222-2222-2222-2222-222222222204",
    },
    {
      id: "unbilled-5",
      customerName: "Riverside Office Park",
      property: "1200 University Ave, Oxford, MS",
      serviceDate: "2026-07-28",
      service: "Extra bed maintenance",
      amount: 240,
      daysWaiting: 7,
      reason: "Awaiting invoice draft",
      contractId: "22222222-2222-2222-2222-222222222201",
    },
  ];
}

export function unbilledTotal(items: UnbilledWorkItem[]) {
  return items.reduce((s, i) => s + i.amount, 0);
}

export function invoiceHubSummary(rows: ManagerInvoiceRow[], unbilled: UnbilledWorkItem[]) {
  const ready = rows.filter(
    (r) =>
      r.readinessScore >= 90 &&
      !r.duplicateShield.blocked &&
      r.balance > 0 &&
      r.managerStatus !== "paid"
  ).length;
  const outstanding = rows.reduce((s, r) => s + Math.max(0, r.balance), 0);
  const highRisk = rows.filter((r) => r.highRisk).length;
  const unbilledSum = unbilledTotal(unbilled);
  return {
    readyToSend: ready,
    unbilledCount: unbilled.length,
    unbilledAmount: unbilledSum,
    outstandingBalance: outstanding,
    highRiskCount: highRisk,
  };
}

/** Server-side gate used by sendInvoice — mirrors hub UI rules. */
export function invoiceSendBlockReason(row: ManagerInvoiceRow): string | null {
  if (row.duplicateShield.blocked) {
    return (
      row.duplicateShield.message ??
      "Send blocked by Duplicate Billing Shield."
    );
  }
  if (row.readinessScore < 70) {
    return `Send blocked: readiness score is ${row.readinessScore} (minimum 70).`;
  }
  if (row.dbStatus === "paid") {
    return "Invoice is already paid.";
  }
  return null;
}

export function managerStatusLabel(status: ManagerInvoiceStatus) {
  if (status === "ready") return "Ready";
  if (status === "needs_review") return "Needs Review";
  if (status === "blocked") return "Blocked";
  if (status === "overdue") return "Past Due";
  if (status === "disputed") return "Disputed";
  if (status === "partially_paid") return "Partially Paid";
  if (status === "paid") return "Paid";
  return "Sent";
}

export function collectionPriorityLabel(p: CollectionPriority) {
  if (p === "critical") return "Critical";
  if (p === "high") return "High";
  if (p === "medium") return "Medium";
  return "Low";
}

export const INVOICE_TARGET_MARGIN = TARGET_MARGIN;
