import { fetchEquipment } from "@/app/equipment/queries";
import type { FinancialStatementInputs } from "@/app/reports/profitability/lib/financial-statement-data";
import { fetchPaymentsSummary, fetchProfitabilityReport } from "@/lib/queries";

export async function fetchFinancialStatementInputs(): Promise<FinancialStatementInputs> {
  const [report, summary, equipment] = await Promise.all([
    fetchProfitabilityReport(),
    fetchPaymentsSummary(),
    fetchEquipment(),
  ]);

  const totalRevenue = report.reduce((sum, row) => sum + row.revenue, 0);
  const totalCosts = report.reduce((sum, row) => sum + row.costs, 0);
  const equipmentAssetValue = equipment
    .filter((item) => item.status === "active")
    .reduce((sum, item) => sum + item.cost, 0);

  return {
    report: report.map((row) => ({
      title: row.title,
      customerName: row.customerName,
      revenue: row.revenue,
      costs: row.costs,
      margin: row.margin,
    })),
    totalRevenue,
    totalCosts,
    totalMargin: totalRevenue - totalCosts,
    outstandingBalance: summary.outstandingBalance,
    collectedThisMonth: summary.collectedThisMonth,
    equipmentAssetValue,
  };
}
