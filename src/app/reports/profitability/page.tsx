import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ContractPerformanceAnalysis } from "@/components/ContractPerformanceAnalysis";
import { Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { requireAppAccess } from "@/lib/auth-access";
import { buildContractRankings } from "@/lib/contract-rankings";
import { getViewRole, roleCanViewReports } from "@/lib/demo-role";
import { formatCurrency } from "@/lib/format";
import { buildManagerRecommendations } from "@/lib/manager-recommendations";
import { detectProfitLeaks } from "@/lib/profit-leaks";
import {
  fetchProfitabilityReport,
  fetchProfitLeakInputs,
} from "@/lib/queries";

export default async function ProfitabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ low?: string }>;
}) {
  await requireAppAccess();

  const role = await getViewRole();
  if (!roleCanViewReports(role)) redirect("/dashboard");
  const params = await searchParams;
  const lowOnly = params.low === "1";

  const [report, leakInputs] = await Promise.all([
    fetchProfitabilityReport(),
    fetchProfitLeakInputs(),
  ]);
  const profitLeaks = detectProfitLeaks(leakInputs);
  const rankings = buildContractRankings(report, leakInputs);
  const recommendations = buildManagerRecommendations(
    report,
    profitLeaks,
    [...rankings.mostProfitable, ...rankings.leastProfitable]
  );

  const totalRevenue = report.reduce((s, r) => s + r.revenue, 0);
  const totalCosts = report.reduce((s, r) => s + r.costs, 0);
  const totalMargin = totalRevenue - totalCosts;
  const avgMarginPct = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

  const tableRows = (
    lowOnly
      ? report.filter((row) => row.margin < 0 || row.marginPct < 15)
      : report
  ).slice().sort((a, b) => a.marginPct - b.marginPct);

  return (
    <AppShell>
      <PageHeader
        title="Contract Profitability"
        description="Revenue billed minus direct visit costs, by active contract."
      />

      {lowOnly ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Showing{" "}
          {tableRows.length === 1
            ? "1 contract"
            : `${tableRows.length} contracts`}{" "}
          with low profitability (negative margin or under 15% margin).{" "}
          <a
            href="/reports/profitability"
            className="font-medium text-green-800 underline hover:text-green-950"
          >
            Clear filter
          </a>
        </div>
      ) : null}

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
        <>
          <ContractPerformanceAnalysis
            report={report}
            profitLeaks={profitLeaks}
            recommendations={recommendations}
          />

          <section className="mt-10 space-y-3">
            <div>
              <h2 className="text-base font-semibold text-stone-700">
                {lowOnly ? "Low profitability contracts" : "All contracts"}
              </h2>
              <p className="text-sm text-stone-500">
                Reference table of billed revenue, direct costs, and margin for
                {lowOnly
                  ? " contracts flagged by Manager Alerts."
                  : " every active contract."}
              </p>
            </div>
            {tableRows.length === 0 ? (
              <EmptyState message="No low-profitability contracts match this filter." />
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
                  {tableRows.map((row) => (
                    <tr
                      key={row.contractId}
                      className={`border-t border-stone-100 ${
                        row.margin < 0 || row.marginPct < 15
                          ? "bg-amber-50/40"
                          : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-medium">{row.title}</td>
                      <td className="px-4 py-3">{row.customerName}</td>
                      <td className="px-4 py-3">
                        {formatCurrency(row.monthlyFee)}
                      </td>
                      <td className="px-4 py-3">
                        {formatCurrency(row.revenue)}
                      </td>
                      <td className="px-4 py-3">
                        {formatCurrency(row.costs)}
                      </td>
                      <td
                        className={`px-4 py-3 font-medium ${row.margin >= 0 ? "text-green-800" : "text-red-700"}`}
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
          </section>
        </>
      )}

      <Card className="mt-8">
        <h2 className="text-lg font-semibold text-green-950">
          How to read this report
        </h2>
        <p className="mt-2 text-sm text-stone-600">
          <strong>Revenue</strong> comes from invoices billed on each contract.
          <strong> Direct costs</strong> are labor, materials, and equipment
          logged on service visits. Use Contract Performance Analysis to select
          a contract, review estimated profit leaks, and act on manager
          recommendations before renewal.
        </p>
      </Card>
    </AppShell>
  );
}
