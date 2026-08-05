import type { ContractProfitLeak, ProfitLeakCategory } from "@/lib/profit-leaks";
import type { ProfitTrend } from "@/lib/contract-rankings";

export type RecommendationPriority = "high" | "medium" | "low";

export type RecommendationIcon =
  | "labor"
  | "visits"
  | "price"
  | "materials"
  | "renewal"
  | "scope"
  | "equipment"
  | "star"
  | "monitor";

export type ManagerRecommendation = {
  id: string;
  title: string;
  detail: string;
  priority: RecommendationPriority;
  icon: RecommendationIcon;
};

export type ContractRecommendations = {
  contractId: string;
  title: string;
  customerName: string;
  marginPct: number;
  margin: number;
  recommendations: ManagerRecommendation[];
};

type ProfitabilityRow = {
  contractId: string;
  title: string;
  customerName: string;
  revenue: number;
  costs: number;
  margin: number;
  marginPct: number;
  monthlyFee?: number;
};

type TrendRow = {
  contractId: string;
  trend: ProfitTrend;
  isBest?: boolean;
  isWorst?: boolean;
};

function hasLeak(
  leak: ContractProfitLeak | undefined,
  category: ProfitLeakCategory
) {
  return Boolean(
    leak?.leaks.some(
      (item) => item.category === category && item.dollarImpact >= 25
    )
  );
}

function leakAmount(
  leak: ContractProfitLeak | undefined,
  category: ProfitLeakCategory
) {
  return (
    leak?.leaks.find((item) => item.category === category)?.dollarImpact ?? 0
  );
}

/**
 * Build manager-facing recommendations from profitability + leak signals.
 */
export function buildManagerRecommendations(
  report: ProfitabilityRow[],
  leaks: ContractProfitLeak[],
  trends: TrendRow[] = []
): ContractRecommendations[] {
  const leakById = new Map(leaks.map((row) => [row.contractId, row]));
  const trendById = new Map(trends.map((row) => [row.contractId, row]));
  const avgMarginPct =
    report.length > 0
      ? report.reduce((sum, row) => sum + row.marginPct, 0) / report.length
      : 0;

  const results: ContractRecommendations[] = [];

  for (const row of report) {
    const leak = leakById.get(row.contractId);
    const trend = trendById.get(row.contractId);
    const recommendations: ManagerRecommendation[] = [];
    const costRatio = row.revenue > 0 ? row.costs / row.revenue : 0;

    if (hasLeak(leak, "Excess labor costs") || costRatio > 0.2) {
      const amount = leakAmount(leak, "Excess labor costs");
      recommendations.push({
        id: `${row.contractId}-labor`,
        title: "Review labor costs",
        detail:
          amount > 0
            ? `Labor is an estimated $${amount.toFixed(0)} drag on margin. Check crew hours and visit productivity.`
            : "Direct costs are elevated relative to billed revenue. Review crew hours on recent visits.",
        priority: amount >= 150 || row.marginPct < 20 ? "high" : "medium",
        icon: "labor",
      });
    }

    if (hasLeak(leak, "Repeat service visits")) {
      recommendations.push({
        id: `${row.contractId}-visits`,
        title: "Investigate repeat visits",
        detail:
          "Visit volume looks high versus the contract cadence. Confirm callbacks are warranted before they erode profit.",
        priority: "high",
        icon: "visits",
      });
    }

    if (hasLeak(leak, "High material costs")) {
      recommendations.push({
        id: `${row.contractId}-materials`,
        title: "Review material usage",
        detail: `Materials are contributing an estimated $${leakAmount(leak, "High material costs").toFixed(0)} in margin pressure. Audit product mix and quantities.`,
        priority: "medium",
        icon: "materials",
      });
    }

    if (hasLeak(leak, "Equipment costs")) {
      recommendations.push({
        id: `${row.contractId}-equipment`,
        title: "Monitor equipment costs",
        detail: `Equipment charges look elevated (about $${leakAmount(leak, "Equipment costs").toFixed(0)} above a healthy mix). Review rentals and utilization.`,
        priority: "medium",
        icon: "equipment",
      });
    }

    if (hasLeak(leak, "Unbilled work")) {
      recommendations.push({
        id: `${row.contractId}-scope`,
        title: "Review scope of work",
        detail: `About $${leakAmount(leak, "Unbilled work").toFixed(0)} in extra work may be unbilled or still quoted. Align scope, approvals, and invoicing.`,
        priority: "high",
        icon: "scope",
      });
    }

    if (
      row.marginPct < 25 ||
      (row.marginPct < avgMarginPct - 15 && row.marginPct < 55)
    ) {
      recommendations.push({
        id: `${row.contractId}-price`,
        title: "Consider a contract price increase",
        detail: `Margin is ${row.marginPct.toFixed(1)}% versus a portfolio average near ${avgMarginPct.toFixed(1)}%. Pricing may not cover current service intensity.`,
        priority: row.marginPct < 15 ? "high" : "medium",
        icon: "price",
      });
    }

    if (trend?.trend === "down" || (row.marginPct < 35 && row.costs > 0)) {
      recommendations.push({
        id: `${row.contractId}-renewal-adjust`,
        title: "Consider a renewal price adjustment",
        detail:
          trend?.trend === "down"
            ? "Margin trend is softening. Build a renewal adjustment into the next contract conversation."
            : "Protect contribution margin at renewal by testing a modest fee adjustment against current costs.",
        priority: trend?.trend === "down" ? "high" : "low",
        icon: "renewal",
      });
    }

    if (
      row.marginPct >= 40 &&
      row.margin > 0 &&
      !trend?.isWorst &&
      recommendations.filter((item) => item.priority === "high").length === 0
    ) {
      recommendations.push({
        id: `${row.contractId}-high-performing`,
        title: "High-performing contract",
        detail: `Strong ${row.marginPct.toFixed(1)}% margin and $${row.margin.toFixed(0)} profit. Keep service quality steady and use as a pricing benchmark.`,
        priority: "low",
        icon: "star",
      });
      recommendations.push({
        id: `${row.contractId}-renewal-candidate`,
        title: "Candidate for renewal",
        detail:
          "This account is contributing healthy profit. Prioritize relationship touchpoints ahead of renewal.",
        priority: "low",
        icon: "renewal",
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        id: `${row.contractId}-monitor`,
        title: "Monitor equipment costs",
        detail:
          "No urgent profitability flags. Continue monitoring direct costs and visit patterns through the season.",
        priority: "low",
        icon: "monitor",
      });
    }

    const priorityRank = { high: 3, medium: 2, low: 1 } as const;
    recommendations.sort(
      (a, b) => priorityRank[b.priority] - priorityRank[a.priority]
    );

    results.push({
      contractId: row.contractId,
      title: row.title,
      customerName: row.customerName,
      marginPct: row.marginPct,
      margin: row.margin,
      recommendations: recommendations.slice(0, 4),
    });
  }

  return results.sort((a, b) => {
    const aHigh = a.recommendations.filter((r) => r.priority === "high").length;
    const bHigh = b.recommendations.filter((r) => r.priority === "high").length;
    if (bHigh !== aHigh) return bHigh - aHigh;
    return a.marginPct - b.marginPct;
  });
}
