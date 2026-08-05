export type UserRole = "manager" | "accountant" | "crew_lead" | "customer";

export type ContractStatus = "draft" | "active" | "completed" | "cancelled";
export type BillingMethod = "monthly" | "per_visit" | "seasonal";
export type VisitStatus = "scheduled" | "completed" | "cancelled";
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "disputed";
export type ExtraWorkStatus = "quoted" | "approved" | "completed" | "declined";
export type CostType = "labor" | "materials" | "equipment";
export type SupportCategory =
  | "question"
  | "concern"
  | "complaint"
  | "billing_dispute"
  | "renewal"
  | "service_quote";
export type SupportLinkType = "contract" | "visit" | "invoice";
export type SupportRequestStatus = "Open" | "In Progress" | "Resolved";

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
  contact_phone?: string | null;
  customer_notes?: string | null;
  notification_prefs?: Record<string, unknown> | null;
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
  created_at: string;
}

export interface CustomerPaymentMethod {
  id: string;
  customer_id: string;
  nickname: string | null;
  display_label: string;
  method_type?: "card" | "bank";
  is_default?: boolean;
  last_four?: string | null;
  expires_month?: number | null;
  expires_year?: number | null;
  billing_name?: string | null;
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

export const DEMO_ROLES: { role: UserRole; label: string; description: string }[] = [
  { role: "manager", label: "Manager", description: "Oversee contracts and profitability" },
  { role: "accountant", label: "Accountant", description: "Billing, payments, and AR" },
  { role: "crew_lead", label: "Crew Lead", description: "Schedule and complete visits" },
  { role: "customer", label: "Customer", description: "View contracts and pay invoices" },
];

export const DEMO_CUSTOMER_ID = "11111111-1111-1111-1111-111111111101";
