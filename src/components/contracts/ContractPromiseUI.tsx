import {
  promiseStatusLabel,
  trackStatusLabel,
  type ContractProgress,
  type PromiseRow,
  type PromiseRowStatus,
  type TrackStatus,
} from "@/lib/contract-controls";

function statusTone(status: PromiseRowStatus) {
  if (status === "complete") return "bg-green-100 text-green-900";
  if (status === "missed") return "bg-red-100 text-red-800";
  if (status === "unapproved_extra") return "bg-amber-100 text-amber-900";
  if (status === "scheduled") return "bg-sky-100 text-sky-900";
  return "bg-stone-100 text-stone-700";
}

function trackTone(status: TrackStatus) {
  if (status === "on_track" || status === "ahead")
    return "border-green-200 bg-green-50 text-green-900";
  return "border-red-200 bg-red-50 text-red-900";
}

export function ContractProgressChart({
  percentComplete,
  trackStatus,
  contractStatus,
  seasonElapsedPct,
  completedVisits,
  promisedVisits,
}: {
  percentComplete: number;
  trackStatus: TrackStatus;
  contractStatus: string;
  seasonElapsedPct?: number;
  completedVisits?: number;
  promisedVisits?: number;
}) {
  const remaining = Math.max(0, 100 - percentComplete);
  const gradient =
    percentComplete <= 0
      ? "conic-gradient(#e7e5e4 0% 100%)"
      : `conic-gradient(#166534 0% ${percentComplete}%, #e7e5e4 ${percentComplete}% 100%)`;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-center sm:gap-10">
      <div className="relative h-44 w-44 shrink-0">
        <div
          className="h-full w-full rounded-full shadow-inner"
          style={{ background: gradient }}
          role="img"
          aria-label={`Contract ${percentComplete}% complete`}
        />
        <div className="absolute inset-8 flex flex-col items-center justify-center rounded-full bg-white text-center shadow-sm">
          <p className="text-2xl font-bold text-green-950">{percentComplete}%</p>
          <p className="text-xs text-stone-500">complete</p>
        </div>
      </div>

      <div className="w-full max-w-sm space-y-3 text-sm">
        <div className={`rounded-lg border px-3 py-2 ${trackTone(trackStatus)}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">Track status</p>
              <p className="mt-0.5 text-xs opacity-80">
                {seasonElapsedPct != null
                  ? `${seasonElapsedPct}% of season elapsed`
                  : "Compared to season progress"}
              </p>
            </div>
            <p className="font-semibold">{trackStatusLabel(trackStatus)}</p>
          </div>
        </div>

        <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-stone-800">Contract status</p>
              <p className="mt-0.5 text-xs text-stone-500">
                {promisedVisits != null && completedVisits != null
                  ? `${completedVisits} of ${promisedVisits} promised visits done`
                  : "Agreement lifecycle"}
              </p>
            </div>
            <p className="font-semibold capitalize text-green-900">
              {contractStatus}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-stone-600">
          Remaining scope ~{remaining}%
        </div>
      </div>
    </div>
  );
}

export function PortfolioProgressChart({
  avgComplete,
  onTrack,
  atRisk,
  active,
  total,
}: {
  avgComplete: number;
  onTrack: number;
  atRisk: number;
  active: number;
  total: number;
}) {
  const gradient =
    avgComplete <= 0
      ? "conic-gradient(#e7e5e4 0% 100%)"
      : `conic-gradient(#166534 0% ${avgComplete}%, #dc2626 ${avgComplete}% 100%)`;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-center sm:gap-10">
      <div className="relative h-44 w-44 shrink-0">
        <div
          className="h-full w-full rounded-full shadow-inner"
          style={{ background: gradient }}
          role="img"
          aria-label={`Portfolio ${avgComplete}% complete on average`}
        />
        <div className="absolute inset-8 flex flex-col items-center justify-center rounded-full bg-white text-center shadow-sm">
          <p className="text-2xl font-bold text-green-950">{avgComplete}%</p>
          <p className="text-xs text-stone-500">avg complete</p>
        </div>
      </div>

      <div className="w-full max-w-xs space-y-3 text-sm">
        <div className="flex items-start justify-between gap-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
          <div>
            <p className="font-medium text-stone-800">On track</p>
            <p className="text-xs text-stone-500">Ahead or on schedule</p>
          </div>
          <p className="font-semibold text-green-900">{onTrack}</p>
        </div>
        <div className="flex items-start justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <div>
            <p className="font-medium text-stone-800">At risk / behind</p>
            <p className="text-xs text-stone-500">Needs Attention</p>
          </div>
          <p className="font-semibold text-red-800">{atRisk}</p>
        </div>
        <div className="flex items-start justify-between gap-4 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
          <div>
            <p className="font-medium text-stone-800">Active contracts</p>
            <p className="text-xs text-stone-500">
              {active} of {total} shown
            </p>
          </div>
          <p className="font-semibold text-stone-800">{active}</p>
        </div>
      </div>
    </div>
  );
}

export function PromiseVsActualTable({ rows }: { rows: PromiseRow[] }) {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-stone-200">
      <table className="min-w-full text-sm">
        <thead className="bg-green-950 text-left text-white">
          <tr>
            <th className="px-4 py-3 font-medium">Service</th>
            <th className="px-4 py-3 font-medium">Contract</th>
            <th className="px-4 py-3 font-medium">Completed</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {rows.map((row) => (
            <tr key={row.service} className="border-t border-stone-100">
              <td className="px-4 py-3 font-medium text-stone-900">
                {row.service}
              </td>
              <td className="px-4 py-3 text-stone-600">{row.contractLabel}</td>
              <td className="px-4 py-3 text-stone-800">{row.completed}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${statusTone(row.status)}`}
                >
                  {promiseStatusLabel(row.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ContractPromiseSummary({
  progress,
}: {
  progress: ContractProgress;
}) {
  const promised = progress.rows.filter((r) => r.contractedCount != null);
  const skipped = promised.reduce((s, r) => s + r.skipped, 0);
  const extras = progress.rows.filter((r) => r.status === "unapproved_extra");

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
      <SummaryTile label="Promised" value={String(progress.promisedVisits)} />
      <SummaryTile label="Scheduled" value={String(progress.scheduledVisits)} />
      <SummaryTile label="Completed" value={String(progress.completedVisits)} />
      <SummaryTile
        label="Skipped / extras"
        value={`${skipped} / ${extras.length}`}
      />
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-green-950">{value}</p>
    </div>
  );
}
