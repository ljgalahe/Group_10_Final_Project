export type ProfitTrend = "up" | "down" | "stable";

export type PerformanceBadge =
  | "top_performer"
  | "strong"
  | "fair"
  | "needs_attention";

export type RankedContract = {
  contractId: string;
  title: string;
  customerName: string;
  revenue: number;
  margin: number;
  marginPct: number;
  trend: ProfitTrend;
  badge: PerformanceBadge;
  isBest: boolean;
  isWorst: boolean;
};

type ProfitabilityRow = {
  contractId: string;
  title: string;
  customerName: string;
  revenue: number;
  costs: number;
  margin: number;
  marginPct: number;
};

type TrendInput = {
  contractId: string;
  invoices: Array<{
    total: number;
    status: string;
    issue_date?: string | null;
  }>;
  visits: Array<{
    id: string;
    scheduled_date: string;
  }>;
  visitCosts: Array<{
    visit_id: string;
    amount: number;
  }>;
};

function performanceBadge(marginPct: number): PerformanceBadge {
  if (marginPct >= 40) return "top_performer";
  if (marginPct >= 25) return "strong";
  if (marginPct >= 10) return "fair";
  return "needs_attention";
}

function periodMarginPct(
  invoices: TrendInput["invoices"],
  visits: TrendInput["visits"],
  visitCosts: TrendInput["visitCosts"],
  start: string,
  end: string
) {
  const revenue = invoices
    .filter((invoice) => {
      if (invoice.status === "canceled" || invoice.status === "voided") {
        return false;
      }
      const date = invoice.issue_date;
      if (!date) return false;
      return date >= start && date <= end;
    })
    .reduce((sum, invoice) => sum + Number(invoice.total), 0);

  const visitIds = new Set(
    visits
      .filter(
        (visit) =>
          visit.scheduled_date >= start && visit.scheduled_date <= end
      )
      .map((visit) => visit.id)
  );

  const costs = visitCosts
    .filter((cost) => visitIds.has(cost.visit_id))
    .reduce((sum, cost) => sum + Number(cost.amount), 0);

  if (revenue <= 0) return null;
  return ((revenue - costs) / revenue) * 100;
}

function detectTrend(input: TrendInput | undefined): ProfitTrend {
  if (!input) return "stable";

  const datedInvoices = input.invoices.filter(
    (invoice) =>
      invoice.issue_date &&
      invoice.status !== "canceled" &&
      invoice.status !== "voided"
  );

  if (datedInvoices.length < 2) return "stable";

  const dates = datedInvoices
    .map((invoice) => invoice.issue_date as string)
    .sort();
  const midpoint = dates[Math.floor((dates.length - 1) / 2)];
  const latest = dates[dates.length - 1];
  const earliest = dates[0];

  if (!midpoint || earliest === latest) return "stable";

  // Earlier window: first date through midpoint; later window: day after midpoint through latest.
  const midDate = new Date(midpoint + "T00:00:00");
  const nextDay = new Date(midDate);
  nextDay.setDate(nextDay.getDate() + 1);
  const laterStart = nextDay.toISOString().slice(0, 10);

  const earlier = periodMarginPct(
    input.invoices,
    input.visits,
    input.visitCosts,
    earliest,
    midpoint
  );
  const later = periodMarginPct(
    input.invoices,
    input.visits,
    input.visitCosts,
    laterStart,
    latest
  );

  if (earlier === null || later === null) return "stable";

  const delta = later - earlier;
  if (delta >= 3) return "up";
  if (delta <= -3) return "down";
  return "stable";
}

export function buildContractRankings(
  report: ProfitabilityRow[],
  trendInputs: TrendInput[] = []
): { mostProfitable: RankedContract[]; leastProfitable: RankedContract[] } {
  if (report.length === 0) {
    return { mostProfitable: [], leastProfitable: [] };
  }

  const trendByContract = new Map(
    trendInputs.map((input) => [input.contractId, input])
  );

  const ranked = [...report]
    .map((row) => ({
      contractId: row.contractId,
      title: row.title,
      customerName: row.customerName,
      revenue: row.revenue,
      margin: row.margin,
      marginPct: row.marginPct,
      trend: detectTrend(trendByContract.get(row.contractId)),
      badge: performanceBadge(row.marginPct),
      isBest: false,
      isWorst: false,
    }))
    .sort((a, b) => {
      if (b.margin !== a.margin) return b.margin - a.margin;
      return b.marginPct - a.marginPct;
    });

  const bestId = ranked[0]?.contractId;
  const worstId = ranked[ranked.length - 1]?.contractId;

  const withHighlights = ranked.map((row) => ({
    ...row,
    isBest: row.contractId === bestId,
    isWorst: row.contractId === worstId && ranked.length > 1,
  }));

  const limit = Math.min(5, withHighlights.length);

  return {
    mostProfitable: withHighlights.slice(0, limit),
    leastProfitable: [...withHighlights]
      .reverse()
      .slice(0, limit)
      .map((row, index, arr) => ({
        ...row,
        // Keep highlight flags based on global best/worst, not list position.
        isBest: row.contractId === bestId,
        isWorst:
          row.contractId === worstId &&
          (arr.length > 1 || withHighlights.length > 1),
      })),
  };
}
