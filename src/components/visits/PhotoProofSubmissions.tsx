"use client";

import { useMemo, useState } from "react";
import { SectionSearch, matchesJobSearch } from "@/components/visits/SectionSearch";
import { ViewAllToggle } from "@/components/visits/ViewAllToggle";
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
    <figure className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <div className="border-b border-stone-200 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">
          {label}
        </p>
      </div>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={caption ?? label}
          className="h-40 w-full object-cover"
        />
      ) : (
        <div className="flex h-40 items-center justify-center bg-stone-100 text-sm text-stone-400">
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

export function PhotoProofSubmissions({ jobs }: { jobs: JobRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [viewAll, setViewAll] = useState(false);
  const [query, setQuery] = useState("");

  const filteredJobs = useMemo(
    () => jobs.filter((j) => matchesJobSearch(j, query)),
    [jobs, query]
  );

  if (jobs.length === 0) {
    return (
      <p className="mt-4 text-sm text-stone-400">
        No proof packages in this range.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <SectionSearch
        value={query}
        onChange={(value) => {
          setQuery(value);
          setOpenId(null);
        }}
        placeholder="Search proof by customer, job, or crew…"
        label="Search photo proof"
      />
      <div className="flex justify-end">
        <ViewAllToggle
          viewAll={viewAll}
          onToggle={() => setViewAll((v) => !v)}
          count={filteredJobs.length}
        />
      </div>
      {filteredJobs.length === 0 ? (
        <p className="text-sm text-stone-500">No proof submissions match this search.</p>
      ) : null}
      <ul
        className={
          viewAll
            ? "space-y-3"
            : "max-h-96 space-y-3 overflow-y-auto pr-2"
        }
      >
        {filteredJobs.map((job) => {
          const proof = job.proof as ProofOverlay | null;
          const open = openId === job.visitId;

          return (
            <li key={job.visitId}>
              <button
                type="button"
                onClick={() =>
                  setOpenId((current) =>
                    current === job.visitId ? null : job.visitId
                  )
                }
                className={`w-full rounded-lg border p-3 text-left text-sm transition ${
                  open
                    ? "border-emerald-700 bg-emerald-50"
                    : "border-stone-100 bg-stone-50 hover:border-emerald-600"
                }`}
              >
                <p className="font-medium text-stone-800">
                  {job.companyName} · {job.jobLabel}
                </p>
                <p className="mt-1 text-stone-600">
                  {proof?.arrival} · {proof?.before} · {proof?.after}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  Submitted{" "}
                  {proof
                    ? new Date(proof.submittedAt).toLocaleString("en-US")
                    : "—"}
                  {" · "}
                  {proof?.acknowledged
                    ? "Customer acknowledged"
                    : "Awaiting acknowledgment"}
                  {" · "}
                  <span className="font-medium text-emerald-800">
                    {open ? "Hide photos" : "View photos"}
                  </span>
                </p>
              </button>

              {open && proof ? (
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
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
                    label="Potential concerns"
                    src={proof.concernImage}
                    caption={proof.concernLabel ?? "No concerns noted"}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
