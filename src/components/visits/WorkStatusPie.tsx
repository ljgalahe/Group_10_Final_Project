import Link from "next/link";
import { formatCurrency } from "@/lib/format";

export function WorkStatusPie({
  completedCount,
  pendingCount,
  completedPay,
  pendingPay,
  completedHref,
  pendingHref,
}: {
  completedCount: number;
  pendingCount: number;
  completedPay: number;
  pendingPay: number;
  completedHref?: string;
  pendingHref?: string;
}) {
  const total = completedCount + pendingCount;
  const completedPct = total > 0 ? (completedCount / total) * 100 : 0;
  const pendingPct = total > 0 ? (pendingCount / total) * 100 : 0;

  const gradient =
    total === 0
      ? "conic-gradient(#e7e5e4 0% 100%)"
      : `conic-gradient(#166534 0% ${completedPct}%, #f59e0b ${completedPct}% 100%)`;

  const completedSquare = (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 transition hover:border-green-800 hover:bg-green-100">
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-green-800" />
        <div>
          <p className="font-medium text-stone-800">Completed</p>
          <p className="text-xs text-stone-500">
            {formatCurrency(completedPay)} crew pay
          </p>
          {completedHref ? (
            <p className="mt-1 text-xs font-medium text-green-800">
              Open completed →
            </p>
          ) : null}
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold text-green-900">{completedCount}</p>
        <p className="text-xs text-stone-500">{Math.round(completedPct)}%</p>
      </div>
    </div>
  );

  const pendingSquare = (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 transition hover:border-amber-600 hover:bg-amber-100">
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-amber-500" />
        <div>
          <p className="font-medium text-stone-800">Pending</p>
          <p className="text-xs text-stone-500">
            {formatCurrency(pendingPay)} crew pay planned
          </p>
          {pendingHref ? (
            <p className="mt-1 text-xs font-medium text-amber-800">
              Open pending →
            </p>
          ) : null}
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold text-amber-700">{pendingCount}</p>
        <p className="text-xs text-stone-500">{Math.round(pendingPct)}%</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-center sm:gap-10">
      <div className="relative h-44 w-44 shrink-0">
        <div
          className="h-full w-full rounded-full shadow-inner"
          style={{ background: gradient }}
          role="img"
          aria-label={`Work status: ${completedCount} completed, ${pendingCount} pending`}
        />
        <div className="absolute inset-8 flex flex-col items-center justify-center rounded-full bg-white text-center shadow-sm">
          <p className="text-2xl font-bold text-green-950">{total}</p>
          <p className="text-xs text-stone-500">total jobs</p>
        </div>
      </div>

      <div className="w-full max-w-xs space-y-3 text-sm">
        {completedHref ? (
          <Link href={completedHref} className="block">
            {completedSquare}
          </Link>
        ) : (
          completedSquare
        )}

        {pendingHref ? (
          <Link href={pendingHref} className="block">
            {pendingSquare}
          </Link>
        ) : (
          pendingSquare
        )}
      </div>
    </div>
  );
}
