"use client";

import type { EvidencePackage } from "@/lib/invoice-controls";
import { formatDate } from "@/lib/format";

export function InvoiceEvidencePanel({
  evidence,
  open,
  onClose,
}: {
  evidence: EvidencePackage;
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Service evidence"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-stone-200 bg-white p-5 shadow-lg"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-green-950">
              Service evidence package
            </h3>
            <p className="mt-1 text-sm text-stone-600">
              {evidence.scheduledService}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50"
          >
            Close
          </button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <figure>
            <img
              src={evidence.beforeImage}
              alt="Before service"
              className="h-40 w-full rounded-lg object-cover"
            />
            <figcaption className="mt-1 text-xs text-stone-500">Before</figcaption>
          </figure>
          <figure>
            <img
              src={evidence.afterImage}
              alt="After service"
              className="h-40 w-full rounded-lg object-cover"
            />
            <figcaption className="mt-1 text-xs text-stone-500">After</figcaption>
          </figure>
        </div>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-stone-500">Crew</dt>
            <dd className="font-medium text-stone-800">
              {evidence.crew.join(", ")}
            </dd>
          </div>
          <div>
            <dt className="text-stone-500">Arrival / completion</dt>
            <dd className="font-medium text-stone-800">
              {formatDate(evidence.arrival.slice(0, 10))} →{" "}
              {formatDate(evidence.completion.slice(0, 10))}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-stone-500">Contract requirements</dt>
            <dd className="font-medium text-stone-800">
              {evidence.contractRequirements.join(" · ")}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-stone-500">Crew notes</dt>
            <dd className="text-stone-800">{evidence.crewNotes}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Materials</dt>
            <dd className="text-stone-800">
              {evidence.materials.length
                ? evidence.materials.join(", ")
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-stone-500">Equipment</dt>
            <dd className="text-stone-800">
              {evidence.equipment.length
                ? evidence.equipment.join(", ")
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-stone-500">Customer approval</dt>
            <dd className="text-stone-800">{evidence.customerApproval}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Extra work approval</dt>
            <dd className="text-stone-800">{evidence.extraWorkApproval}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Customer acknowledgment</dt>
            <dd className="text-stone-800">{evidence.customerAck}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-stone-500">Related invoice lines</dt>
            <dd className="text-stone-800">
              <ul className="list-inside list-disc">
                {evidence.relatedLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
