"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);
  const displayStatus = getDisplayInvoiceStatus(invoice);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!voidOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setVoidOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [voidOpen]);

  return (
    <div className="flex flex-wrap gap-2">
      {displayStatus === "draft" && (
        <form action={updateInvoiceStatus}>
          <input type="hidden" name="invoice_id" value={invoice.id} />
          <input type="hidden" name="status" value="approved" />
          <button
            type="submit"
            className="gs-btn-approve rounded-lg px-4 py-2 text-sm font-medium"
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

          {voidOpen && mounted
            ? createPortal(
                <div
                  className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="void-invoice-title"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) setVoidOpen(false);
                  }}
                >
                  <div className="relative z-[201] w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                    <h3
                      id="void-invoice-title"
                      className="text-lg font-semibold text-green-950"
                    >
                      Void this invoice?
                    </h3>
                    <p className="mt-2 text-sm text-stone-600">
                      Are you sure you want to void invoice{" "}
                      <span className="font-medium">{invoiceNumber}</span>? This
                      removes it from active A/R and cannot be undone.
                    </p>
                    <form
                      action={updateInvoiceStatus}
                      className="mt-6 flex justify-end gap-2"
                    >
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
                </div>,
                document.body
              )
            : null}
        </>
      )}
    </div>
  );
}
