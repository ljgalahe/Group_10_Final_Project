export type UserRole =
  | "manager"
  | "accountant"
  | "crew_lead"
  | "crew_member"
  | "customer";

export type ContractStatus = "draft" | "active" | "completed" | "cancelled";
export type BillingMethod = "monthly" | "per_visit" | "seasonal";
export type VisitStatus = "scheduled" | "completed" | "cancelled";
export type InvoiceStatus =
  | "draft"
  | "approved"
  | "sent"
  | "paid"
  | "overdue"
  | "past_due"
  | "partially_paid"
  | "canceled"
  | "voided"
  | "disputed";
export type ExtraWorkStatus = "quoted" | "approved" | "completed" | "declined";
export type CostType = "labor" | "materials" | "equipment";
export type PaymentMethod = "check" | "ach" | "card" | "bank_transfer";
export type PaymentStatus = "applied" | "unapplied" | "void";
export type SupportCategory =
  | "question"
  | "concern"
  | "complaint"
  | "billing_dispute"
  | "renewal"
  | "service_quote";
export type SupportLinkType = "contract" | "visit" | "invoice";
export type SupportRequestStatus = "Open" | "In Progress" | "Resolved";

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "check", label: "Check" },
  { value: "ach", label: "ACH" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
];

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  customer_id: string | null;
}

export interface Customer {
  id: string;
  name: string;
  property_type: string | null;
  address: string | null;
  contact_name: string | null;
  contact_email: string | null;
  created_at: string;
}

export interface Contract {
  id: string;
  customer_id: string;
  title: string;
  status: ContractStatus;
  season_start: string;
  season_end: string;
  monthly_fee: number | null;
  visits_per_week: number | null;
  billing_method: BillingMethod;
  notes: string | null;
  assigned_crew: string | null;
  account_manager: string | null;
  renewal_date: string | null;
  created_at: string;
  customers?: Customer;
}

export interface ContractService {
  id: string;
  contract_id: string;
  service_name: string;
  included: boolean;
}

export interface ServiceVisit {
  id: string;
  contract_id: string;
  scheduled_date: string;
  status: VisitStatus;
  crew_notes: string | null;
  completed_at: string | null;
  created_at: string;
  contracts?: Contract;
}

export interface VisitCost {
  id: string;
  visit_id: string;
  cost_type: CostType;
  description: string | null;
  amount: number;
  quantity: number | null;
  created_at: string;
}

export interface ExtraWorkOrder {
  id: string;
  contract_id: string;
  title: string;
  description: string | null;
  quoted_amount: number;
  status: ExtraWorkStatus;
  approved_at: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  contract_id: string;
  customer_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  subtotal: number;
  total: number;
  amount_paid: number;
  created_at: string;
  customers?: Customer;
  contracts?: Contract;
}

export interface InvoiceLine {
  id: string;
  invoice_id: string;
  description: string;
  amount: number;
  line_type: string | null;
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes: string | null;
  payment_number?: string | null;
  customer_id?: string | null;
  applied_amount?: number | null;
  unapplied_amount?: number | null;
  reference_number?: string | null;
  recorded_by?: string | null;
  recorded_by_name?: string | null;
  status?: PaymentStatus | string;
  created_at: string;
  invoices?: {
    invoice_number: string;
    issue_date?: string;
    customer_id?: string;
    total?: number;
    amount_paid?: number;
    status?: InvoiceStatus | string;
    customers?: { name: string; id?: string } | null;
    contracts?: { title: string } | null;
  } | null;
}

export interface PaymentsSummary {
  collectedThisMonth: number;
  outstandingBalance: number;
  overdueCustomerCount: number;
  overdueCustomerIds: string[];
  outstandingInvoiceIds: string[];
  collectionRate: number | null;
  averageDaysToPay: number | null;
  /** Kept for compatibility with existing payment tooling */
  unappliedPayments: number;
  partialPaymentsCount: number;
}

export interface CustomerPaymentMethod {
  id: string;
  customer_id: string;
  nickname: string | null;
  display_label: string;
  created_at: string;
}

export interface SupportRequest {
  id: string;
  customer_id: string;
  category: SupportCategory;
  message: string;
  linked_type: SupportLinkType | null;
  linked_id: string | null;
  status: string;
  resolution_notes: string | null;
  created_at: string;
}

export const SUPPORT_CATEGORIES: {
  value: SupportCategory;
  label: string;
}[] = [
  { value: "question", label: "Question" },
  { value: "concern", label: "Concern" },
  { value: "complaint", label: "Complaint" },
  { value: "billing_dispute", label: "Billing Dispute" },
  { value: "renewal", label: "Renewal Request" },
  { value: "service_quote", label: "Service Quote" },
];

/** Categories customers can pick on Contact Us (special flows have their own UI). */
export const SUPPORT_FORM_CATEGORIES = SUPPORT_CATEGORIES.filter(
  (c) => c.value !== "renewal" && c.value !== "service_quote"
);

/** Field-relevant Contact Us categories for Crew Lead (excludes billing / sales). */
export const CREW_APPLICABLE_SUPPORT_CATEGORIES = SUPPORT_CATEGORIES.filter(
  (c) =>
    c.value === "question" ||
    c.value === "concern" ||
    c.value === "complaint"
);

export const DEMO_ROLES: { role: UserRole; label: string; description: string }[] = [
  { role: "manager", label: "Manager", description: "Oversee contracts and profitability" },
  { role: "accountant", label: "Accountant", description: "Billing, payments, and AR" },
  { role: "crew_lead", label: "Crew Lead", description: "Schedule and complete visits" },
  {
    role: "crew_member",
    label: "Crew Member",
    description: "View assigned jobs, schedule, and request time off",
  },
  { role: "customer", label: "Customer", description: "View contracts and pay invoices" },
];

export const DEMO_CUSTOMER_ID = "11111111-1111-1111-1111-111111111101";

/** Demo identity for the View-as Crew Member portal (matches default roster). */
export const DEMO_CREW_MEMBER = {
  id: "crew-1",
  name: "Jordan Miles",
  roleTitle: "Crew Member",
} as const;

export const DEMO_CREW_LEAD_NAME = "Morgan Hale";
