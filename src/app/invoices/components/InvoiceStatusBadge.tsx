import { formatInvoiceStatus, getDisplayInvoiceStatus } from "@/app/invoices/lib/accounting";

const colors: Record<string, string> = {
  draft: "bg-stone-100 text-stone-700",
  approved: "bg-indigo-100 text-indigo-800",
  sent: "bg-blue-100 text-blue-800",
  partially_paid: "bg-amber-100 text-amber-900",
  paid: "bg-green-100 text-green-800",
  past_due: "bg-red-100 text-red-800",
  voided: "bg-stone-200 text-stone-500 line-through",
  disputed: "bg-orange-100 text-orange-900",
};

export function InvoiceStatusBadge({
  invoice,
}: {
  invoice: {
    status: string;
    total: number;
    amount_paid: number;
    due_date: string;
  };
}) {
  const displayStatus = getDisplayInvoiceStatus(invoice);
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[displayStatus] ?? "bg-gray-100 text-gray-800"}`}
    >
      {formatInvoiceStatus(displayStatus)}
    </span>
  );
}
