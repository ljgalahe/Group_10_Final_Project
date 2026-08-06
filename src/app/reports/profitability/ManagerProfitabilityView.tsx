import { Card, EmptyState, StatCard } from "@/components/ui";
import { formatCurrency } from "@/lib/format";

type ProfitabilityRow = {
  contractId: string;
  title: string;
  customerName: string;
  revenue: number;
  costs: number;
  margin: number;
  marginPct: number;
  monthlyFee: number;
};

/** Original manager profitability layout — stats + contract table only. */
export function ManagerProfitabilityView({
  report,
}: {
  report: ProfitabilityRow[];
}) {
  const totalRevenue = report.reduce((s, r) => s + r.revenue, 0);
  const totalCosts = report.reduce((s, r) => s + r.costs, 0);
  const totalMargin = totalRevenue - totalCosts;
  const avgMarginPct =
    totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

  return (
    <>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Revenue" value={formatCurrency(totalRevenue)} />
        <StatCard label="Total Direct Costs" value={formatCurrency(totalCosts)} />
        <StatCard label="Total Margin" value={formatCurrency(totalMargin)} />
        <StatCard
          label="Average Margin %"
          value={`${avgMarginPct.toFixed(1)}%`}
        />
      </div>

      {report.length === 0 ? (
        <EmptyState message="No active contracts to analyze." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-50 text-left text-stone-600">
              <tr>
                <th className="px-4 py-3 font-medium">Contract</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Monthly Fee</th>
                <th className="px-4 py-3 font-medium">Revenue Billed</th>
                <th className="px-4 py-3 font-medium">Direct Costs</th>
                <th className="px-4 py-3 font-medium">Margin</th>
                <th className="px-4 py-3 font-medium">Margin %</th>
              </tr>
            </thead>
            <tbody>
              {report.map((row) => (
                <tr key={row.contractId} className="border-t border-stone-100">
                  <td className="px-4 py-3 font-medium">{row.title}</td>
                  <td className="px-4 py-3">{row.customerName}</td>
                  <td className="px-4 py-3">
                    {formatCurrency(row.monthlyFee)}
                  </td>
                  <td className="px-4 py-3">{formatCurrency(row.revenue)}</td>
                  <td className="px-4 py-3">{formatCurrency(row.costs)}</td>
                  <td
                    className={`px-4 py-3 font-medium ${
                      row.margin >= 0 ? "text-green-800" : "text-red-700"
                    }`}
                  >
                    {formatCurrency(row.margin)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.marginPct >= 25
                          ? "bg-green-100 text-green-800"
                          : row.marginPct >= 10
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {row.marginPct.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Card className="mt-8">
        <h2 className="text-lg font-semibold text-green-950">
          How to read this report
        </h2>
        <p className="mt-2 text-sm text-stone-600">
          <strong>Revenue</strong> comes from invoices billed on each contract.{" "}
          <strong>Direct costs</strong> are labor, materials, and equipment
          logged on service visits. A contract with high crew hours or mulch
          costs will show a lower margin — that helps managers decide whether to
          renegotiate pricing.
        </p>
      </Card>
    </>
  );
}
