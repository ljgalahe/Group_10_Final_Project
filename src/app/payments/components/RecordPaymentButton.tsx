"use client";

import { useState } from "react";
import { RecordPaymentForm } from "@/app/payments/components/RecordPaymentForm";

export function RecordPaymentButton({
  invoices,
  defaultInvoiceId,
  invoiceOnly = false,
  redirectTo = "/payments",
  label = "Record Payment",
  className = "rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700",
}: {
  invoices: {
    id: string;
    invoice_number: string;
    total: number;
    amount_paid: number;
    customers: { name: string } | null;
  }[];
  defaultInvoiceId?: string;
  invoiceOnly?: boolean;
  redirectTo?: string;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const invoice = defaultInvoiceId
    ? invoices.find((i) => i.id === defaultInvoiceId)
    : null;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-green-950">Record Payment</h2>
                <p className="mt-1 text-sm text-stone-500">
                  {invoiceOnly && invoice
                    ? `Apply a payment to ${invoice.invoice_number}.`
                    : "Apply a cash or check payment to an open invoice."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-stone-400 hover:text-stone-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="mt-4">
              <RecordPaymentForm
                invoices={invoices}
                defaultInvoiceId={defaultInvoiceId}
                invoiceOnly={invoiceOnly}
                redirectTo={redirectTo}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
