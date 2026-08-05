import type {
  ContractProfitLeak,
  LeakSeverity,
  ProfitLeakCategory,
  ProfitLeakItem,
} from "@/lib/profit-leaks";
import type { ContractRecommendations } from "@/lib/manager-recommendations";

export type ContractHealthStatus =
  | "Healthy Contract"
  | "Needs Attention"
  | "High Risk";

export type ProfitabilityAnalysisRow = {
  contractId: string;
  title: string;
  customerName: string;
  revenue: number;
  costs: number;
  margin: number;
  marginPct: number;
  monthlyFee?: number;
};

export type AnalyzedProfitLeak = {
  category: string;
  explanation: string;
  dollarImpact: number | null;
  severity: LeakSeverity;
  confidence: "estimated";
};

const LEAK_EXPLANATIONS: Record<ProfitLeakCategory, string> = {
  "Excess labor costs":
    "Labor costs look high relative to billed revenue or peer contracts. Estimated from visit labor totals — confirm crew hours before changing staffing.",
  "Repeat service visits":
    "Completed visits appear above the expected contract cadence. This may indicate rework, callbacks, or a customer needing more service than contracted.",
  "High material costs":
    "Materials are elevated versus a typical share of revenue or direct costs. Estimated insight — audit product mix and quantities on recent visits.",
  "Fuel or travel overages":
    "Fuel or travel-related spend (or an estimate from dense visit activity) may be trimming margin. Treat as a possible risk until trip logs are reviewed.",
  "Unbilled work":
    "Quoted or approved extra work may not yet appear on invoices. Estimated unbilled exposure — verify what was delivered and bill approved work.",
  "Equipment costs":
    "Equipment charges look high relative to peer cost mix. Estimated insight — review rentals, utilization, and allocation to this contract.",
  "Seasonal cost increases":
    "Peak-season months show costs above the contract’s own monthly average. Possible seasonal pressure rather than a permanent structural issue.",
};

function leakItemSeverity(
  item: ProfitLeakItem,
  revenue: number
): LeakSeverity {
  const pct = revenue > 0 ? (item.dollarImpact / revenue) * 100 : 0;
  if (item.dollarImpact >= 1000 || pct >= 15) return "high";
  if (item.dollarImpact >= 350 || pct >= 8) return "medium";
  return "low";
}

export function contractHealthStatus(
  row: ProfitabilityAnalysisRow
): ContractHealthStatus {
  if (row.margin < 0 || row.marginPct < 10) return "High Risk";
  if (row.marginPct < 25) return "Needs Attention";
  return "Healthy Contract";
}

export function managerSummarySentence(
  row: ProfitabilityAnalysisRow,
  leaks: AnalyzedProfitLeak[],
  status: ContractHealthStatus
): string {
  const top = leaks[0]?.category?.toLowerCase();
  const second = leaks[1]?.category?.toLowerCase();

  if (status === "Healthy Contract") {
    if (top) {
      return `This contract remains profitable at ${row.marginPct.toFixed(1)}% margin, but ${top}${second ? ` and ${second}` : ""} may be reducing its margin.`;
    }
    return `This contract is performing well with a ${row.marginPct.toFixed(1)}% margin and $${row.margin.toFixed(0)} in contribution profit.`;
  }

  if (status === "Needs Attention") {
    if (top) {
      return `Margin is soft at ${row.marginPct.toFixed(1)}%. ${top.charAt(0).toUpperCase()}${top.slice(1)} is the leading estimated pressure point to investigate first.`;
    }
    return `This contract is still contributing, but its ${row.marginPct.toFixed(1)}% margin is below a healthy target and needs closer cost review.`;
  }

  if (top) {
    return `High risk: margin is ${row.marginPct.toFixed(1)}% with estimated pressure from ${top}. Prioritize cost and pricing review before renewal.`;
  }
  return `High risk: this contract’s ${row.marginPct.toFixed(1)}% margin leaves little room for service overruns. Review scope, visits, and pricing promptly.`;
}

export function analyzeContractLeaks(
  row: ProfitabilityAnalysisRow,
  leakRow: ContractProfitLeak | undefined
): AnalyzedProfitLeak[] {
  if (!leakRow || leakRow.leaks.length === 0) return [];

  const analyzed: AnalyzedProfitLeak[] = leakRow.leaks.map((item) => ({
    category: item.category,
    explanation: LEAK_EXPLANATIONS[item.category],
    dollarImpact: item.dollarImpact,
    severity: leakItemSeverity(item, row.revenue),
    confidence: "estimated" as const,
  }));

  // Soft estimated insight when repeat visits suggest over-service demand.
  const hasRepeat = leakRow.leaks.some(
    (item) => item.category === "Repeat service visits"
  );
  if (
    hasRepeat &&
    !analyzed.some((item) =>
      item.category.toLowerCase().includes("more service")
    )
  ) {
    analyzed.push({
      category: "Customer requiring more service than contracted",
      explanation:
        "Visit volume versus contract cadence suggests the site may need more frequent service than priced. Possible risk — confirm scope with the customer before treating as confirmed fact.",
      dollarImpact: null,
      severity: row.marginPct < 25 ? "medium" : "low",
      confidence: "estimated",
    });
  }

  const severityRank = { high: 3, medium: 2, low: 1 } as const;
  return analyzed.sort(
    (a, b) =>
      severityRank[b.severity] - severityRank[a.severity] ||
      (b.dollarImpact ?? 0) - (a.dollarImpact ?? 0)
  );
}

export function recommendationsForContract(
  contractId: string,
  recommendations: ContractRecommendations[]
) {
  return (
    recommendations.find((row) => row.contractId === contractId)
      ?.recommendations ?? []
  );
}

/** Sort every contract highest margin % → lowest (stable tie-break by title). */
export function sortByMarginPctDesc(rows: ProfitabilityAnalysisRow[]) {
  return [...rows].sort((a, b) => {
    if (b.marginPct !== a.marginPct) return b.marginPct - a.marginPct;
    return a.title.localeCompare(b.title);
  });
}
