import { Card } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import type { ContractProfitLeak, LeakSeverity } from "@/lib/profit-leaks";

export function ProfitLeakDetector({ rows }: { rows: ContractProfitLeak[] }) {
  return (
    <section className="mt-10 space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-green-950">
          Profit Leak Detector
        </h2>
        <p className="text-sm text-stone-500">
          Biggest estimated contributors to reduced profitability by contract,
          based on visit costs, service cadence, and extra work.
        </p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <p className="text-sm text-stone-500">
            No meaningful profit leaks detected from the current data.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <article
              key={row.contractId}
              className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-green-950">
                    {row.title}
                  </h3>
                  <p className="text-sm text-stone-500">{row.customerName}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge level={row.severity} />
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
                    Est. profit lost {formatCurrency(row.totalProfitLost)}
                    {row.revenue > 0 ? ` · ${row.totalPercentImpact}% of revenue` : ""}
                  </span>
                </div>
              </div>

              {row.leaks.length === 0 ? (
                <p className="mt-4 text-sm text-stone-500">
                  No major leak categories identified for this contract.
                </p>
              ) : (
                <div className="mt-4 overflow-hidden rounded-lg border border-stone-100">
                  <table className="min-w-full text-sm">
                    <thead className="bg-stone-50 text-left text-stone-600">
                      <tr>
                        <th className="px-3 py-2 font-medium">
                          Top Profit Leak
                        </th>
                        <th className="px-3 py-2 font-medium">
                          Est. $ Impact
                        </th>
                        <th className="px-3 py-2 font-medium">
                          Est. % Impact
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {row.leaks.map((leak) => (
                        <tr
                          key={`${row.contractId}-${leak.category}`}
                          className="border-t border-stone-100"
                        >
                          <td className="px-3 py-2 font-medium text-stone-800">
                            {leak.category}
                          </td>
                          <td className="px-3 py-2 text-stone-700">
                            {formatCurrency(leak.dollarImpact)}
                          </td>
                          <td className="px-3 py-2 text-stone-700">
                            {leak.percentImpact.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function SeverityBadge({ level }: { level: LeakSeverity }) {
  const styles: Record<LeakSeverity, string> = {
    low: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-900",
    high: "bg-red-100 text-red-800",
  };
  const labels: Record<LeakSeverity, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[level]}`}
    >
      {labels[level]} severity
    </span>
  );
}
