"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  approveInvoice,
  markInvoiceReviewed,
  rejectInvoice,
  resolveInvoiceException,
  sendInvoice,
} from "@/app/actions/business";
import { InvoiceEvidencePanel } from "@/components/invoices/InvoiceEvidencePanel";
import { InvoiceProfitPreview } from "@/components/invoices/InvoiceProfitPreview";
import { formatDate } from "@/lib/format";
import type { ManagerInvoiceRow } from "@/lib/invoice-controls";

export function InvoiceDetailManagerExtras({
  row,
}: {
  row: ManagerInvoiceRow;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [checksOpen, setChecksOpen] = useState(false);

  function runAction(
    label: string,
    fn: () => Promise<{ ok: boolean; message: string }>
  ) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.ok) setMessage(result.message || label);
      else setError(result.message || "Action failed.");
    });
  }

  return (
    <div className="mt-6 space-y-4">
      {(message || error) && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-green-200 bg-green-50 text-green-900"
          }`}
        >
          {error ?? message}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Readiness
          </p>
          <p
            className={`mt-2 gs-metric-value text-3xl ${
              row.readinessScore >= 90
                ? "text-green-800"
                : row.readinessScore >= 70
                  ? "text-amber-700"
                  : "text-red-700"
            }`}
          >
            {row.readinessScore}
          </p>
          <p className="text-sm text-stone-600">{row.readinessLabel}</p>
          <button
            type="button"
            onClick={() => setChecksOpen((v) => !v)}
            className="mt-3 text-sm text-green-800 underline"
          >
            {checksOpen ? "Hide checks" : "View checks"}
          </button>
          {checksOpen ? (
            <ul className="mt-3 space-y-2 border-t border-stone-100 pt-3 text-sm">
              {row.checks.map((c) => (
                <li key={c.id} className="flex gap-2">
                  <span>{c.passed ? "✓" : "!"}</span>
                  <span>
                    <span className="font-medium">{c.label}</span>
                    <span className="block text-xs text-stone-500">
                      {c.detail}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {row.duplicateShield.blocked ? (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-800">
              {row.duplicateShield.message}
            </p>
          ) : (
            <p className="mt-3 text-xs text-green-800">
              Duplicate Billing Shield clear
            </p>
          )}
        </div>

        <InvoiceProfitPreview row={row} />

        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Why different
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {row.whyDifferent.map((item) => (
              <li
                key={item.message}
                className={
                  item.kind === "warning" ? "text-amber-800" : "text-stone-700"
                }
              >
                {item.message}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm lg:col-span-2">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Explainable summary
          </p>
          <p className="mt-2 text-sm leading-relaxed text-stone-700">
            {row.explainableSummary}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEvidenceOpen(true)}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50"
            >
              View service evidence
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50"
            >
              Export / print summary
            </button>
            <Link
              href="/invoices"
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50"
            >
              Back to Invoice Management
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Approval controls
          </p>
          {row.approval.required ? (
            <div className="mt-2 text-sm text-stone-700">
              <p>
                Requires {row.approval.approver} ({row.approval.status})
              </p>
              <ul className="mt-1 list-inside list-disc text-xs text-stone-500">
                {row.approval.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-2 text-sm text-stone-600">
              No elevated approval required.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                runAction("Reviewed", () => markInvoiceReviewed(row.invoiceId))
              }
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50 disabled:opacity-60"
            >
              Mark reviewed
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                runAction("Approved", () => approveInvoice(row.invoiceId))
              }
              className="gs-btn-approve rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-60"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                runAction("Rejected", () =>
                  rejectInvoice(row.invoiceId, "Needs correction")
                )
              }
              className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-800 hover:bg-red-50 disabled:opacity-60"
            >
              Reject
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                runAction("Send", () => sendInvoice(row.invoiceId))
              }
              className="rounded-lg border border-green-800 px-3 py-1.5 text-sm font-medium text-green-900 hover:bg-green-50 disabled:opacity-60"
            >
              Send invoice
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                runAction("Resolved", () =>
                  resolveInvoiceException(row.invoiceId, row.exception)
                )
              }
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50 disabled:opacity-60"
            >
              Resolve exception
            </button>
          </div>
          {(row.readinessScore < 70 || row.duplicateShield.blocked) && (
            <p className="mt-3 text-xs font-medium text-red-700">
              Send is blocked until readiness is at least 70 and the duplicate
              shield is clear.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm lg:col-span-3">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Timeline
          </p>
          <ol className="mt-3 flex flex-wrap gap-4">
            {row.timeline.map((step) => (
              <li key={step.id} className="flex items-center gap-2 text-sm">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    step.done
                      ? "bg-green-700"
                      : step.current
                        ? "bg-amber-500"
                        : "bg-stone-300"
                  }`}
                />
                <span className={step.current ? "font-semibold" : ""}>
                  {step.label}
                </span>
                {step.at ? (
                  <span className="text-xs text-stone-500">
                    {formatDate(step.at)}
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <InvoiceEvidencePanel
        evidence={row.evidence}
        open={evidenceOpen}
        onClose={() => setEvidenceOpen(false)}
      />
    </div>
  );
}
