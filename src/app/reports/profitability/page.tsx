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

export default async function ProfitabilityPage() {
  await requireAppAccess();

  const role = await getViewRole();
  if (!roleCanViewReports(role)) redirect("/dashboard");
  const isAccountant = role === "accountant";

  const [
    report,
    leakInputs,
    financialStatementInputs,
    directCostsBreakdown,
    jobCostVariance,
    profitPerCrewHour,
  ] = await Promise.all([
    fetchProfitabilityReport({ useAccountantVisitCosts: isAccountant }),
    fetchProfitLeakInputs(),
    isAccountant ? fetchFinancialStatementInputs() : Promise.resolve(null),
    isAccountant ? fetchDirectCostsBreakdown() : Promise.resolve(null),
    isAccountant ? fetchJobCostVariance() : Promise.resolve(null),
    isAccountant ? fetchProfitPerCrewHour() : Promise.resolve(null),
  ]);
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

  const totalRevenue = report.reduce((s, r) => s + r.revenue, 0);
  // Match Total Direct Costs (actual visit_costs), not estimated scheduled costs.
  const totalCosts =
    isAccountant && directCostsBreakdown
      ? directCostsBreakdown.total
      : report.reduce((s, r) => s + r.costs, 0);
  const totalMargin = totalRevenue - totalCosts;
  const avgMarginPct = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
  const grossMarginColor =
    avgMarginPct >= 35
      ? "text-green-700"
      : avgMarginPct >= 20
        ? "text-yellow-600"
        : "text-red-700";

  return (
    <AppShell>
      <PageHeader
        title="Contract Profitability"
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

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            amount={directCostsBreakdown.total}
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

          <AllContractsTable
            rows={report}
            directCostsBreakdown={
              isAccountant ? directCostsBreakdown : null
            }
            costsLabel={isAccountant ? "Visit Costs" : "Direct Costs"}
          />
        </>
      )}

      <Card className="mt-8">
        <h2 className="text-lg font-semibold text-green-950">
          How to read this report
        </h2>
        <p className="mt-2 text-sm text-stone-600">
          <strong>Revenue</strong> comes from invoices billed on each contract.
          {isAccountant ? (
            <>
              {" "}
              <strong> Visit costs</strong> match the Visits tab: scheduled
              visits use estimated cost; completed visits use actual labor,
              materials, and equipment. Use{" "}
              <strong>Estimated vs. actual job cost</strong> to spot visits that
              blew past their quote, then Performance analysis for contract-level
              leaks and recommendations before renewal.
            </>
          ) : (
            <>
              {" "}
              <strong> Direct costs</strong> are labor, materials, and equipment
              logged on service visits. Use Contract Performance Analysis to
              select a contract, review estimated profit leaks, and act on
              manager recommendations before renewal.
            </>
          )}
        </p>
      </Card>
    </AppShell>
  );
}
