"use client";

import { useState } from "react";
import { updateInvoiceStatus } from "@/app/invoices/actions";
import { getDisplayInvoiceStatus } from "@/app/invoices/lib/accounting";

export function InvoiceWorkflowActions({
  invoice,
  invoiceNumber,
}: {
  invoice: {
    id: string;
    status: string;
    total: number;
    amount_paid: number;
    due_date: string;
  };
  invoiceNumber: string;
}) {
  const [voidOpen, setVoidOpen] = useState(false);
  const displayStatus = getDisplayInvoiceStatus(invoice);

  return (
    <div className="flex flex-wrap gap-2">
      {displayStatus === "draft" && (
        <form action={updateInvoiceStatus}>
          <input type="hidden" name="invoice_id" value={invoice.id} />
          <input type="hidden" name="status" value="approved" />
          <button
            type="submit"
            className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600"
          >
            Approve
          </button>
        </form>
      )}
      {displayStatus === "approved" && (
        <form action={updateInvoiceStatus}>
          <input type="hidden" name="invoice_id" value={invoice.id} />
          <input type="hidden" name="status" value="sent" />
          <button
            type="submit"
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          >
            Mark Sent
          </button>
        </form>
      )}
      {displayStatus !== "voided" && displayStatus !== "paid" && (
        <>
          <button
            type="button"
            onClick={() => setVoidOpen(true)}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
          >
            Void
          </button>

          {voidOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                <h3 className="text-lg font-semibold text-green-950">Void this invoice?</h3>
                <p className="mt-2 text-sm text-stone-600">
                  Are you sure you want to void invoice{" "}
                  <span className="font-medium">{invoiceNumber}</span>? This removes it
                  from active A/R and cannot be undone.
                </p>
                <form action={updateInvoiceStatus} className="mt-6 flex justify-end gap-2">
                  <input type="hidden" name="invoice_id" value={invoice.id} />
                  <input type="hidden" name="status" value="voided" />
                  <button
                    type="button"
                    onClick={() => setVoidOpen(false)}
                    className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
                  >
                    Yes, Void Invoice
                  </button>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
