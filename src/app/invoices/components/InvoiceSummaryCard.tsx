import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  getArAgingBucketLabel,
  getDaysOutstanding,
  getOutstandingBalance,
} from "@/app/invoices/lib/accounting";
import { InvoiceStatusBadge } from "@/app/invoices/components/InvoiceStatusBadge";

export function InvoiceSummaryCard({
  invoice,
}: {
  invoice: {
    status: string;
    issue_date: string;
    due_date: string;
    total: number;
    amount_paid: number;
  };
}) {
  const total = Number(invoice.total);
  const amountPaid = Number(invoice.amount_paid);
  const balance = getOutstandingBalance(total, amountPaid);
  const arAgingLabel = getArAgingBucketLabel(invoice.due_date, total, amountPaid);
  const daysOutstanding = getDaysOutstanding(invoice.due_date, total, amountPaid);

  return (
    <>
      <h2 className="text-lg font-semibold text-green-950">Summary</h2>
      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-stone-500">Status</dt>
          <dd>
            <InvoiceStatusBadge invoice={invoice} />
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-stone-500">Issue Date</dt>
          <dd>{formatDate(invoice.issue_date)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-stone-500">Due Date</dt>
          <dd>{formatDate(invoice.due_date)}</dd>
        </div>
        <div className="flex justify-between font-semibold">
          <dt>Total</dt>
          <dd>{formatCurrency(total)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-stone-500">Paid</dt>
          <dd>{formatCurrency(amountPaid)}</dd>
        </div>
        <div className="flex justify-between font-semibold text-green-900">
          <dt>Outstanding Balance</dt>
          <dd>{formatCurrency(balance)}</dd>
        </div>
        {balance > 0 && (
          <>
            <div className="border-t border-stone-100 pt-3">
              <Link
                href="/reports/ar-aging"
                className="text-green-800 hover:underline"
              >
                A/R Aging: {arAgingLabel}
              </Link>
            </div>
            <div className="flex justify-between text-stone-600">
              <dt>Days Outstanding</dt>
              <dd>{daysOutstanding} {daysOutstanding === 1 ? "day" : "days"}</dd>
            </div>
          </>
        )}
      </dl>
    </>
  );
}
