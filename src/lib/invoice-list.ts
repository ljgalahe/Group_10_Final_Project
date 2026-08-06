import type { DisplayInvoiceStatus } from "@/app/invoices/lib/accounting";

export type InvoiceListItem = {
  id: string;
  invoice_number: string;
  customerName: string;
  contractTitle: string;
  issue_date: string;
  due_date: string;
  total: number;
  amount_paid: number;
  status: string;
  displayStatus: DisplayInvoiceStatus;
  balance: number;
  paid: boolean;
  notPaid: boolean;
  overdue: boolean;
  sent: boolean;
  notSent: boolean;
};
