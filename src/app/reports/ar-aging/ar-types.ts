/** Shared AR Aging types — shaped for KPI/risk math against app invoice + payment data. */

export type ServiceType =
  | "Maintenance"
  | "Enhancement"
  | "Irrigation"
  | "Snow Removal"
  | "Tree Care";

export type PaymentTerms = "Net 15" | "Net 30" | "Net 45" | "Net 60";

export type ArExceptionStatus =
  | "Clean"
  | "Disputed"
  | "Short-Paid"
  | "Awaiting PO"
  | "Missing COI";

export type DisputeReasonCode =
  | "RATE_DISPUTE"
  | "SCOPE_DISPUTE"
  | "QUALITY_ISSUE"
  | "DUPLICATE_INVOICE"
  | "PO_MISMATCH"
  | "PARTIAL_ACCEPTANCE"
  | "COI_EXPIRED"
  | "COI_MISSING"
  | null;

export type ArPaymentEvent = {
  payment_date: string;
  amount: number;
};

export type ArInvoice = {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer: string;
  property: string;
  service_type: ServiceType;
  invoice_date: string;
  due_date: string;
  terms: PaymentTerms;
  amount_billed: number;
  amount_paid: number;
  paid_date: string | null;
  status: ArExceptionStatus;
  dispute_reason_code: DisputeReasonCode;
  /** Aging-table aliases (match existing UI shape). */
  total: number;
  customers: { name: string };
  /** Applied cash receipts, used for historical open-balance reconstruction. */
  payments: ArPaymentEvent[];
};

export type AgingBucketKey = "current" | "1-30" | "31-60" | "61-90" | "90+";
