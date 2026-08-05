"use client";

import { useEffect, useState } from "react";
import {
  loadVisitWorkState,
  saveVisitWorkState,
} from "@/components/crew-lead/crewLeadStorage";
import { customerNotesForCustomer } from "@/components/crew-lead/visitWorkDefaults";

/**
 * Compact: Customer Notes (shown once at the top of a visit).
 * Full: Additional Notes only (crew-lead notes at the bottom of visit details).
 */
export function CrewSiteNotes({
  customerId,
  jobId,
  status = "scheduled",
  compact = false,
}: {
  customerId: string;
  /** Required for additional (crew) notes in the full visit panel. */
  jobId?: string;
  status?: string;
  compact?: boolean;
}) {
  const customerNotes = customerNotesForCustomer(customerId);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const isScheduled = status === "scheduled";
  const canEditAdditional = Boolean(jobId) && isScheduled;

  useEffect(() => {
    if (!jobId) {
      setAdditionalNotes("");
      return;
    }
    // Crew-entered notes only — never prefilled from customer notes.
    setAdditionalNotes(loadVisitWorkState(jobId).crewAdditionalNotes ?? "");
  }, [jobId]);

  function persistAdditionalNotes(value: string) {
    if (!jobId) return;
    const state = loadVisitWorkState(jobId);
    saveVisitWorkState(jobId, {
      ...state,
      crewAdditionalNotes: value,
    });
  }

  if (compact) {
    return (
      <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-900">
          Customer Notes
        </p>
        <ul className="mt-1 list-inside list-disc text-xs text-amber-950/90">
          {customerNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-stone-800">
        Additional Notes
      </h4>
      {canEditAdditional ? (
        <textarea
          value={additionalNotes}
          onChange={(e) => {
            const value = e.target.value;
            setAdditionalNotes(value);
            persistAdditionalNotes(value);
          }}
          rows={3}
          placeholder="Add notes from this visit (blank until you write something)…"
          className="mt-3 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800"
        />
      ) : additionalNotes.trim() ? (
        <p className="mt-3 whitespace-pre-wrap text-sm text-stone-700">
          {additionalNotes}
        </p>
      ) : (
        <p className="mt-3 text-sm text-stone-500">
          No additional notes taken for this visit.
        </p>
      )}
    </div>
  );
}
