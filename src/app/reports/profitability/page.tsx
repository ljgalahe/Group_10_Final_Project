import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ContractPerformanceAnalysis } from "@/components/ContractPerformanceAnalysis";
import { Card, EmptyState, PageHeader, SectionHeading, StatCard } from "@/components/ui";
import { WeatherAffectedTiles } from "@/components/visits/WeatherAffectedTiles";
import { requireAppAccess } from "@/lib/auth-access";
import { buildContractRankings } from "@/lib/contract-rankings";
import { getViewRole, roleCanViewReports } from "@/lib/demo-role";
import { formatCurrency } from "@/lib/format";
import { buildManagerRecommendations } from "@/lib/manager-recommendations";
import { detectProfitLeaks } from "@/lib/profit-leaks";
import {
  fetchAllVisitCosts,
  fetchProfitabilityReport,
  fetchProfitLeakInputs,
  fetchVisits,
} from "@/lib/queries";
import { buildJobRows, summaryFromJobs } from "@/lib/visit-jobs";
import { defaultVisitPeriod } from "@/lib/visit-period";
import type { VisitCost } from "@/lib/types";
import { AccountantDirectCostsStatButton } from "@/app/reports/profitability/components/AccountantDirectCostsButton";
import { AccountantJobCostVariance } from "@/app/reports/profitability/components/AccountantJobCostVariance";
import { AccountantPerformanceTwinPanel } from "@/app/reports/profitability/components/AccountantPerformanceTwinPanel";
import { AccountantProfitPerCrewHour } from "@/app/reports/profitability/components/AccountantProfitPerCrewHour";
import { AccountantTotalRevenueButton } from "@/app/reports/profitability/components/AccountantTotalRevenueButton";
import { AllContractsTable } from "@/app/reports/profitability/components/AllContractsTable";
import { CreateFinancialStatementButton } from "@/app/reports/profitability/components/CreateFinancialStatementButton";
import {
  fetchDirectCostsBreakdown,
  fetchFinancialStatementInputs,
  fetchJobCostVariance,
  fetchProfitPerCrewHour,
  fetchRevenueSeasonality,
  fetchServiceLineGrossMargins,
} from "@/app/reports/profitability/queries";

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
  const isAccountant = role === "accountant";
  const isManager = role === "manager";

  const [
    report,
    leakInputs,
    financialStatementInputs,
    directCostsBreakdown,
    jobCostVariance,
    profitPerCrewHour,
    visitsResult,
    costsResult,
  ] = await Promise.all([
    fetchProfitabilityReport(),
    fetchProfitLeakInputs(),
    isAccountant ? fetchFinancialStatementInputs() : Promise.resolve(null),
    isAccountant ? fetchDirectCostsBreakdown() : Promise.resolve(null),
    isAccountant ? fetchJobCostVariance() : Promise.resolve(null),
    isAccountant ? fetchProfitPerCrewHour() : Promise.resolve(null),
    isManager ? fetchVisits() : Promise.resolve({ data: [] as never[] }),
    isManager
      ? fetchAllVisitCosts()
      : Promise.resolve({ data: [] as VisitCost[] }),
  ]);

  let weatherAffected: ReturnType<typeof summaryFromJobs>["weatherAffected"] =
    [];
  if (isManager) {
    const visits = visitsResult.data ?? [];
    const allCosts = (costsResult.data ?? []) as VisitCost[];
    const costsByVisit = new Map<string, VisitCost[]>();
    for (const cost of allCosts) {
      const list = costsByVisit.get(cost.visit_id) ?? [];
      list.push(cost);
      costsByVisit.set(cost.visit_id, list);
    }
    const jobs = buildJobRows(visits, costsByVisit, defaultVisitPeriod());
    weatherAffected = summaryFromJobs(jobs).weatherAffected;
  }
  const serviceLineMargins = isAccountant
    ? await fetchServiceLineGrossMargins(report)
    : [];
  const revenueSeasonality = isAccountant
    ? await fetchRevenueSeasonality(report.map((r) => r.contractId))
    : [];
  const profitLeaks = detectProfitLeaks(leakInputs);
  const rankings = buildContractRankings(report, leakInputs);
  const recommendations = buildManagerRecommendations(
    report,
    profitLeaks,
    [...rankings.mostProfitable, ...rankings.leastProfitable]
  );

  // Shared KPI math for Manager and Accountant — same report rows, same totals.
  const totalRevenue = report.reduce((s, r) => s + r.revenue, 0);
  const totalCosts = report.reduce((s, r) => s + r.costs, 0);
  const totalMargin = totalRevenue - totalCosts;
  const avgMarginPct = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
  const grossMarginColor =
    avgMarginPct >= 35
      ? "text-green-700"
      : avgMarginPct >= 20
        ? "text-yellow-600"
        : "text-red-700";

  const tableRows = (
    lowOnly
      ? report.filter((row) => row.margin < 0 || row.marginPct < 15)
      : report
  ).slice().sort((a, b) => a.marginPct - b.marginPct);

  return (
    <AppShell>
      <PageHeader
        title="Profitability"
        description={
          isAccountant
            ? "Revenue billed minus visit costs — scheduled visits use estimated cost; completed visits use actual cost."
            : "Revenue billed minus direct visit costs, by active contract."
        }
        action={
          isAccountant && financialStatementInputs ? (
            <CreateFinancialStatementButton inputs={financialStatementInputs} />
          ) : undefined
        }
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

      <div className="mb-8 gs-kpi-grid">
        {isAccountant ? (
          <AccountantTotalRevenueButton
            amount={totalRevenue}
            serviceLines={serviceLineMargins}
            seasonality={revenueSeasonality}
          />
        ) : (
          <StatCard label="Total Revenue" value={formatCurrency(totalRevenue)} />
        )}
        {isAccountant && directCostsBreakdown ? (
          <AccountantDirectCostsStatButton
            amount={totalCosts}
            breakdown={directCostsBreakdown}
          />
        ) : (
          <StatCard
            label={isAccountant ? "Total Visit Costs" : "Total Direct Costs"}
            value={formatCurrency(totalCosts)}
          />
        )}
        <StatCard label="Total Margin" value={formatCurrency(totalMargin)} />
        <StatCard
          label="Gross Margin %"
          value={`${avgMarginPct.toFixed(1)}%`}
          valueClassName={grossMarginColor}
        />
      </div>

      {report.length === 0 ? (
        <EmptyState message="No active contracts to analyze." />
      ) : (
        <>
          {isAccountant && jobCostVariance ? (
            <AccountantJobCostVariance report={jobCostVariance} />
          ) : null}

          {isAccountant ? (
            <AccountantPerformanceTwinPanel
              serviceLines={serviceLineMargins}
              report={report}
              profitLeaks={profitLeaks}
              recommendations={recommendations}
            />
          ) : (
            <ContractPerformanceAnalysis
              report={report}
              profitLeaks={profitLeaks}
              recommendations={recommendations}
            />
          )}

          {isAccountant && profitPerCrewHour ? (
            <AccountantProfitPerCrewHour report={profitPerCrewHour} />
          ) : null}

          {lowOnly && tableRows.length === 0 ? (
            <EmptyState message="No low-profitability contracts match this filter." />
          ) : (
            <AllContractsTable
              rows={tableRows}
              directCostsBreakdown={
                isAccountant ? directCostsBreakdown : null
              }
              costsLabel={isAccountant ? "Visit Costs" : "Direct Costs"}
              scrollBody={isManager}
            />
          )}
        </>
      )}

      {isManager ? (
        <section id="weather-affected" className="gs-section mt-8 scroll-mt-24">
          <SectionHeading
            mark="Weather"
            title="Weather Affected"
            description="Original planned date, rescheduled date, and any cost over the original plan."
          />
          <WeatherAffectedTiles jobs={weatherAffected} />
        </section>
      ) : null}

      {isAccountant ? (
        <Card className="mt-8">
          <h2 className="text-lg font-semibold text-green-950">
            How to Read This Report
          </h2>
          <p className="mt-2 text-sm text-stone-600">
            <strong>Revenue</strong> comes from invoices billed on each contract.{" "}
            <strong> Visit costs</strong> match the Visits tab: scheduled
            visits use estimated cost; completed visits use actual labor,
            materials, and equipment. Use{" "}
            <strong>Estimated vs. actual job cost</strong> to spot visits that
            blew past their quote, then Performance analysis for contract-level
            leaks and recommendations before renewal.
          </p>
        </Card>
      ) : null}
    </AppShell>
  );
}
