"use client";

import { useEffect, useState } from "react";
import {
  loadVisitWorkState,
  loadVisitWorkStateForStatus,
  saveVisitWorkState,
} from "@/components/crew-lead/crewLeadStorage";
import { CREW_CUSTOMER_NOTES_HELPER } from "@/lib/customer-notes";

/**
 * Compact: Customer Notes only.
 * Full: optional Customer Notes + optional Additional Notes (crew-typed for this visit).
 */
export function CrewSiteNotes({
  notes = [],
  jobId,
  status = "scheduled",
  compact = false,
  showCustomerNotes = true,
  showAdditionalNotes = true,
}: {
  /** Customer notes from profile/database for this property. */
  notes?: string[];
  /** Required for additional (crew) notes. */
  jobId?: string;
  status?: string;
  compact?: boolean;
  showCustomerNotes?: boolean;
  showAdditionalNotes?: boolean;
}) {
  const customerNotes = notes.filter(Boolean);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const isScheduled = status === "scheduled";
  const canEditAdditional = Boolean(jobId) && isScheduled;

  useEffect(() => {
    if (!jobId || !showAdditionalNotes) {
      setAdditionalNotes("");
      return;
    }
    // Completed visits may get demo additional notes via loadVisitWorkStateForStatus.
    const state =
      status === "completed"
        ? loadVisitWorkStateForStatus(jobId, "completed")
        : loadVisitWorkState(jobId);
    setAdditionalNotes(state.crewAdditionalNotes ?? "");
  }, [jobId, showAdditionalNotes, status]);

  function persistAdditionalNotes(value: string) {
    if (!jobId) return;
    const state = loadVisitWorkState(jobId);
    saveVisitWorkState(jobId, {
      ...state,
      crewAdditionalNotes: value,
    });
  }

  if (compact) {
    if (!showCustomerNotes || customerNotes.length === 0) return null;
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

  const customerBlock =
    showCustomerNotes && customerNotes.length > 0 ? (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-amber-950">
          Customer Notes
        </h4>
        <p className="mt-1 text-xs text-amber-900/80">
          {CREW_CUSTOMER_NOTES_HELPER}
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-amber-950">
          {customerNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>
    ) : null;

  const additionalBlock = showAdditionalNotes ? (
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
  ) : null;

  if (!customerBlock && !additionalBlock) return null;

  return (
    <div className="space-y-4">
      {customerBlock}
      {additionalBlock}
    </div>
  );
}
