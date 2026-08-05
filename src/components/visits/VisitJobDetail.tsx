import { StatusBadge } from "@/components/ui";
import { supplyCostBreakdown } from "@/components/crew-lead/visitWorkDefaults";
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

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-green-950">{job.companyName}</p>
          <p className="mt-1 text-sm font-medium text-stone-800">{job.jobLabel}</p>
          <p className="mt-1 text-sm text-stone-500">{formatDate(job.date)}</p>
          <p className="mt-1 text-xs text-stone-400">{job.location}</p>
        </div>
        <StatusBadge status={job.status} />
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
