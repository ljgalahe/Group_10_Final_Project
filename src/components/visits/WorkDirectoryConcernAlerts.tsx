"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDate } from "@/lib/format";
import type { JobRow } from "@/lib/visit-jobs";
import {
  decisionLabel,
  getConcernDecision,
  isActiveFieldConcern,
  loadConcernDecisions,
  saveConcernDecision,
  syncFieldConcerns,
  type ConcernDecision,
  type FieldConcernRecord,
} from "@/lib/concern-decisions";
import { chatHrefForCrewLead, personByName, crewLeadPersonId } from "@/lib/chat-demo";

function crewLeadFromJob(job: JobRow): { name: string; id: string } | null {
  const lead =
    job.crew.find((m) => /lead/i.test(m.role)) ?? job.crew[0] ?? null;
  if (!lead) return null;
  return {
    name: lead.name,
    id: personByName(lead.name)?.id ?? crewLeadPersonId(lead.name),
  };
}

function jobsToConcerns(jobs: JobRow[]): FieldConcernRecord[] {
  return jobs
    .filter((job) =>
      isActiveFieldConcern(job.proof?.concernLabel, job.proof?.concernImage)
    )
    .map((job) => {
      const lead = crewLeadFromJob(job);
      return {
        visitId: job.visitId,
        companyName: job.companyName,
        jobLabel: job.jobLabel,
        location: job.location,
        date: job.date,
        concernLabel: job.proof?.concernLabel ?? "Potential concern noted",
        concernImage: job.proof?.concernImage,
        submittedAt: job.proof?.submittedAt,
        crewLeadName: lead?.name,
        crewLeadId: lead?.id,
      };
    });
}

function DecisionBadge({ decision }: { decision: ConcernDecision }) {
  const styles =
    decision === "approved"
      ? "bg-green-100 text-green-800"
      : decision === "on_hold"
        ? "bg-amber-100 text-amber-900"
        : "bg-rose-100 text-rose-900";
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${styles}`}
    >
      {decisionLabel(decision)}
    </span>
  );
}

export function WorkDirectoryConcernAlerts({
  jobs,
  onFollowVisit,
}: {
  jobs: JobRow[];
  onFollowVisit?: (visitId: string) => void;
}) {
  const concerns = useMemo(() => jobsToConcerns(jobs), [jobs]);
  const [decisions, setDecisions] = useState<Record<string, ConcernDecision>>(
    {}
  );
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  function refresh() {
    setDecisions(loadConcernDecisions());
  }

  useEffect(() => {
    refresh();
    syncFieldConcerns(concerns);
    const onUpdate = () => refresh();
    window.addEventListener("storage", onUpdate);
    window.addEventListener("focus", onUpdate);
    window.addEventListener("greenscape-concerns-updated", onUpdate);
    return () => {
      window.removeEventListener("storage", onUpdate);
      window.removeEventListener("focus", onUpdate);
      window.removeEventListener("greenscape-concerns-updated", onUpdate);
    };
  }, [concerns]);

  const openConcerns = useMemo(
    () =>
      concerns.filter(
        (c) => (decisions[c.visitId] ?? getConcernDecision(c.visitId)) === "open"
      ),
    [concerns, decisions]
  );

  const heldConcerns = useMemo(
    () =>
      concerns.filter(
        (c) =>
          (decisions[c.visitId] ?? getConcernDecision(c.visitId)) === "on_hold"
      ),
    [concerns, decisions]
  );

  const selected =
    concerns.find((c) => c.visitId === selectedId) ??
    openConcerns[0] ??
    heldConcerns[0] ??
    concerns[0] ??
    null;

  const selectedDecision = selected
    ? (decisions[selected.visitId] ?? "open")
    : "open";

  function setDecision(visitId: string, decision: ConcernDecision) {
    saveConcernDecision(visitId, decision);
    setDecisions(loadConcernDecisions());
  }

  if (concerns.length === 0) return null;

  const alertCount = openConcerns.length + heldConcerns.length;
  const showBanner = !dismissed && alertCount > 0;

  return (
    <div className="mb-4 space-y-3">
      {showBanner ? (
        <div
          role="status"
          className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 shadow-sm"
        >
          <div>
            <p className="text-sm font-semibold text-rose-950">
              {openConcerns.length > 0
                ? `${openConcerns.length} field ${openConcerns.length === 1 ? "concern needs" : "concerns need"} review`
                : `${heldConcerns.length} job ${heldConcerns.length === 1 ? "is" : "are"} on hold`}
            </p>
            <p className="mt-0.5 text-xs text-rose-800/80">
              Open a concern to review the photo, then approve to proceed or
              place the job on hold.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setPanelOpen(true);
                setSelectedId(openConcerns[0]?.visitId ?? heldConcerns[0]?.visitId ?? null);
              }}
              className="rounded-md bg-rose-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700"
            >
              Review concerns
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-900 hover:bg-rose-100"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {panelOpen && selected ? (
        <div className="rounded-xl border border-stone-300 bg-white p-4 shadow-md">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 className="text-base font-semibold text-green-950">
                Field concern review
              </h4>
              <p className="mt-1 text-sm text-stone-500">
                Approve to proceed with the job, or place it on hold until the
                issue is resolved.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="text-xs font-medium text-stone-500 hover:text-stone-800"
            >
              Close
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[14rem_1fr]">
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {concerns.map((concern) => {
                const decision = decisions[concern.visitId] ?? "open";
                const active = concern.visitId === selected.visitId;
                return (
                  <li key={concern.visitId}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(concern.visitId)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                        active
                          ? "border-rose-700 bg-rose-50"
                          : "border-stone-200 bg-stone-50 hover:border-rose-400"
                      }`}
                    >
                      <p className="font-medium text-green-950">
                        {concern.companyName}
                      </p>
                      <p className="mt-0.5 text-xs text-stone-500">
                        {concern.jobLabel}
                      </p>
                      <div className="mt-2">
                        <DecisionBadge decision={decision} />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-green-950">
                    {selected.companyName}
                  </p>
                  <p className="mt-1 text-sm font-medium text-stone-800">
                    {selected.jobLabel}
                  </p>
                  <p className="mt-1 text-sm text-stone-500">
                    {formatDate(selected.date)} · {selected.location}
                  </p>
                </div>
                <DecisionBadge decision={selectedDecision} />
              </div>

              <p className="mt-3 text-sm text-stone-700">
                {selected.concernLabel}
              </p>

              {selected.concernImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selected.concernImage}
                  alt={selected.concernLabel}
                  className="mt-3 h-48 w-full rounded-lg border border-stone-200 object-cover"
                />
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setDecision(selected.visitId, "approved")}
                  className="rounded-md bg-green-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                >
                  Approve & clear
                </button>
                <button
                  type="button"
                  onClick={() => setDecision(selected.visitId, "on_hold")}
                  className="rounded-md border border-amber-700 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-50"
                >
                  Place on hold
                </button>
                {selected.crewLeadName ? (
                  <a
                    href={chatHrefForCrewLead({
                      crewLeadName: selected.crewLeadName,
                      visitId: selected.visitId,
                      jobLabel: selected.jobLabel,
                      companyName: selected.companyName,
                      concernLabel: selected.concernLabel,
                    })}
                    className="rounded-md border border-sky-700 px-3 py-1.5 text-xs font-medium text-sky-900 hover:bg-sky-50"
                  >
                    Contact crew leader
                    {selected.crewLeadName
                      ? ` (${selected.crewLeadName})`
                      : ""}
                  </a>
                ) : null}
                {selectedDecision !== "open" ? (
                  <button
                    type="button"
                    onClick={() => setDecision(selected.visitId, "open")}
                    className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-white"
                  >
                    Reopen
                  </button>
                ) : null}
                {onFollowVisit ? (
                  <button
                    type="button"
                    onClick={() => {
                      onFollowVisit(selected.visitId);
                      setPanelOpen(false);
                    }}
                    className="rounded-md border border-green-800 px-3 py-1.5 text-xs font-medium text-green-900 hover:bg-green-50"
                  >
                    Open in work directory
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
