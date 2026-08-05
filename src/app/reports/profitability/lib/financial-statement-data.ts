export type FinancialStatementReportRow = {
  title: string;
  customerName: string;
  revenue: number;
  costs: number;
  margin: number;
};

export type FinancialStatementInputs = {
  report: FinancialStatementReportRow[];
  totalRevenue: number;
  totalCosts: number;
  totalMargin: number;
  outstandingBalance: number;
  collectedThisMonth: number;
  equipmentAssetValue: number;
};

export type StatementType = "balance_sheet" | "income_statement" | "cash_flows";
export type PeriodType = "monthly" | "year_end";

export function scaleForPeriod(
  inputs: FinancialStatementInputs,
  periodType: PeriodType
): {
  revenue: number;
  costs: number;
  margin: number;
  outstandingBalance: number;
  collected: number;
  equipment: number;
  operatingExpenses: number;
} {
  const factor =
    periodType === "year_end"
      ? 1
      : inputs.totalRevenue > 0
        ? Math.min(1, inputs.collectedThisMonth / inputs.totalRevenue)
        : 1 / 12;

  const revenue =
    periodType === "year_end"
      ? inputs.totalRevenue
      : inputs.collectedThisMonth;
  const costs = inputs.totalCosts * factor;
  const margin = revenue - costs;
  const outstandingBalance = inputs.outstandingBalance * factor;
  const collected =
    periodType === "year_end"
      ? Math.max(0, inputs.totalRevenue - inputs.outstandingBalance)
      : inputs.collectedThisMonth;
  const equipment = inputs.equipmentAssetValue * (periodType === "year_end" ? 1 : 1);
  const operatingExpenses = Math.max(0, revenue * 0.08);

  return {
    revenue,
    costs,
    margin,
    outstandingBalance,
    collected,
    equipment,
    operatingExpenses,
  };
}

export function periodLabel(periodType: PeriodType, asOf = new Date()): string {
  if (periodType === "year_end") {
    return `For the Year Ended December 31, ${asOf.getFullYear()}`;
  }
  return `For the Month Ended ${asOf.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })}`;
}

export function statementTitle(type: StatementType): string {
  switch (type) {
    case "balance_sheet":
      return "Balance Sheet";
    case "income_statement":
      return "Income Statement";
    case "cash_flows":
      return "Statement of Cash Flows";
  }
}
