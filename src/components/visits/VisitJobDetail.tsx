"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui";
import { supplyCostBreakdown } from "@/components/crew-lead/visitWorkDefaults";
import {
  decisionLabel,
  getConcernDecision,
  isActiveFieldConcern,
  loadConcernDecisions,
  saveConcernDecision,
  type ConcernDecision,
} from "@/lib/concern-decisions";
import { chatHrefForCrewLead } from "@/lib/chat-demo";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ProofOverlay } from "@/lib/visit-demo";
import type { JobRow } from "@/lib/visit-jobs";

function ProofPhoto({
  label,
  src,
  caption,
}: {
  label: string;
  src?: string;
  caption?: string;
}) {
  return (
    <figure className="overflow-hidden rounded-lg border border-stone-200 bg-white">
      <p className="border-b border-stone-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">
        {label}
      </p>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={caption ?? label}
          className="h-36 w-full object-cover"
        />
      ) : (
        <div className="flex h-36 items-center justify-center bg-stone-100 text-xs text-stone-400">
          No photo
        </div>
      )}
      {caption ? (
        <figcaption className="px-3 py-2 text-xs text-stone-600">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

/** Shared visit detail: crew, pay/cost, supplies with costs, and photo proof. */
export function VisitJobDetail({ job }: { job: JobRow }) {
  const proof = job.proof as ProofOverlay | null;
  const visitTotal = job.crewPay + job.costTotal;
  const supplies = supplyCostBreakdown(
    [job.jobLabel],
    job.costTotal,
    job.visitId
  );
  const hasConcern = isActiveFieldConcern(
    proof?.concernLabel,
    proof?.concernImage
  );
  const [concernDecision, setConcernDecision] =
    useState<ConcernDecision>("open");

  useEffect(() => {
    setConcernDecision(getConcernDecision(job.visitId));
    const onUpdate = () => setConcernDecision(getConcernDecision(job.visitId));
    window.addEventListener("greenscape-concerns-updated", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("greenscape-concerns-updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [job.visitId]);

  function setDecision(decision: ConcernDecision) {
    saveConcernDecision(job.visitId, decision);
    setConcernDecision(loadConcernDecisions()[job.visitId] ?? decision);
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-green-950">{job.companyName}</p>
          <p className="mt-1 text-sm font-medium text-stone-800">{job.jobLabel}</p>
          <p className="mt-1 text-sm text-stone-500">{formatDate(job.date)}</p>
          <p className="mt-1 text-xs text-stone-400">{job.location}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={job.status} />
          {hasConcern ? (
            <span
              className={`rounded-md border px-2.5 py-0.5 text-[10px] font-semibold ${
                concernDecision === "approved"
                  ? "gs-complete-badge"
                  : concernDecision === "on_hold"
                    ? "border-amber-200 bg-amber-100 text-amber-900"
                    : "border-rose-200 bg-rose-100 text-rose-900"
              }`}
            >
              {decisionLabel(concernDecision)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Crew
          </p>
          {job.crew.length === 0 ? (
            <p className="mt-1 text-sm text-stone-400">No crew assigned</p>
          ) : (
            <ul className="mt-1 space-y-1 text-sm text-stone-700">
              {job.crew.map((m) => (
                <li key={`${job.visitId}-${m.name}`}>
                  {m.name} · {m.role} · {m.hours}h @ {formatCurrency(m.payRate)}{" "}
                  ={" "}
                  <span className="font-medium">
                    {formatCurrency(m.hours * m.payRate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-sm text-stone-700">
            Crew pay:{" "}
            <span className="font-medium text-green-900">
              {formatCurrency(job.crewPay)}
            </span>
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Job cost calculation
          </p>
          <p className="mt-1 text-sm text-stone-700">
            Materials:{" "}
            <span className="font-medium text-green-900">
              {formatCurrency(supplies.materialsTotal)}
            </span>
          </p>
          <p className="mt-1 text-sm text-stone-700">
            Equipment:{" "}
            <span className="font-medium text-green-900">
              {formatCurrency(supplies.equipmentTotal)}
            </span>
          </p>
          <p className="mt-1 text-sm text-stone-700">
            Job costs:{" "}
            <span className="font-medium text-green-900">
              {formatCurrency(job.costTotal)}
            </span>
          </p>
          <p className="mt-2 text-sm font-semibold text-green-950">
            Visit total: {formatCurrency(visitTotal)}
          </p>
          <p className="mt-0.5 text-xs text-stone-500">
            Crew pay + materials + equipment
          </p>
          {job.weather ? (
            <p className="mt-2 text-xs text-sky-800">
              Weather: {job.weather.label}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
          Supplies used
        </p>
        <div className="mt-2 grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-xs font-medium text-stone-500">Materials</p>
            {supplies.materials.length === 0 ? (
              <p className="mt-1 text-stone-400">None</p>
            ) : (
              <ul className="mt-1 space-y-1 text-stone-700">
                {supplies.materials.map((row) => (
                  <li
                    key={row.name}
                    className="flex items-start justify-between gap-3"
                  >
                    <span>{row.name}</span>
                    <span className="shrink-0 font-medium text-green-900">
                      {formatCurrency(row.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-sm text-stone-700">
              Materials total:{" "}
              <span className="font-medium text-green-900">
                {formatCurrency(supplies.materialsTotal)}
              </span>
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-stone-500">Equipment</p>
            {supplies.equipment.length === 0 ? (
              <p className="mt-1 text-stone-400">None</p>
            ) : (
              <ul className="mt-1 space-y-1 text-stone-700">
                {supplies.equipment.map((row) => (
                  <li
                    key={row.name}
                    className="flex items-start justify-between gap-3"
                  >
                    <span>{row.name}</span>
                    <span className="shrink-0 font-medium text-green-900">
                      {formatCurrency(row.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-sm text-stone-700">
              Equipment total:{" "}
              <span className="font-medium text-green-900">
                {formatCurrency(supplies.equipmentTotal)}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
          Photo proof
        </p>
        {proof ? (
          <>
            <p className="mt-1 text-xs text-stone-500">
              Submitted {new Date(proof.submittedAt).toLocaleString("en-US")}
              {" · "}
              {proof.acknowledged
                ? "Customer acknowledged"
                : "Awaiting acknowledgment"}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <ProofPhoto
                label="Before"
                src={proof.beforeImage}
                caption={proof.before}
              />
              <ProofPhoto
                label="After"
                src={proof.afterImage}
                caption={proof.after}
              />
              <ProofPhoto
                label="Concern"
                src={proof.concernImage}
                caption={proof.concernLabel ?? "No concerns noted"}
              />
            </div>
            {hasConcern ? (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50/60 p-3">
                <p className="text-sm font-medium text-rose-950">
                  Manager decision
                </p>
                <p className="mt-1 text-xs text-rose-800/80">
                  Approve & clear to proceed, place this job on hold, or contact
                  the crew leader for this visit.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setDecision("approved")}
                    className="gs-btn-approve rounded-md px-3 py-1.5 text-xs font-medium"
                  >
                    Approve & clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecision("on_hold")}
                    className="rounded-md border border-amber-700 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-50"
                  >
                    Place on hold
                  </button>
                  {(() => {
                    const lead =
                      job.crew.find((m) => /lead/i.test(m.role)) ??
                      job.crew[0];
                    if (!lead) return null;
                    return (
                      <a
                        href={chatHrefForCrewLead({
                          crewLeadName: lead.name,
                          visitId: job.visitId,
                          jobLabel: job.jobLabel,
                          companyName: job.companyName,
                          concernLabel:
                            proof?.concernLabel ?? "Potential concern noted",
                        })}
                        className="rounded-md border border-sky-700 px-3 py-1.5 text-xs font-medium text-sky-900 hover:bg-sky-50"
                      >
                        Contact crew leader ({lead.name})
                      </a>
                    );
                  })()}
                  {concernDecision !== "open" ? (
                    <button
                      type="button"
                      onClick={() => setDecision("open")}
                      className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-white"
                    >
                      Reopen
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <p className="mt-2 text-sm text-stone-500">
            No photo proof on file for this visit.
          </p>
        )}
      </div>
    </div>
  );
}
