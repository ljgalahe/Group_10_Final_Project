export type LeakSeverity = "low" | "medium" | "high";

export type ProfitLeakCategory =
  | "Excess labor costs"
  | "Repeat service visits"
  | "High material costs"
  | "Fuel or travel overages"
  | "Unbilled work"
  | "Equipment costs"
  | "Seasonal cost increases";

export type ProfitLeakItem = {
  category: ProfitLeakCategory;
  dollarImpact: number;
  percentImpact: number;
};

export type ContractProfitLeak = {
  contractId: string;
  title: string;
  customerName: string;
  revenue: number;
  totalCosts: number;
  leaks: ProfitLeakItem[];
  totalProfitLost: number;
  totalPercentImpact: number;
  severity: LeakSeverity;
};

type LeakInput = {
  contractId: string;
  title: string;
  customerName: string;
  monthlyFee: number;
  visitsPerWeek: number;
  seasonStart: string | null;
  seasonEnd: string | null;
  invoices: Array<{
    id: string;
    total: number;
    status: string;
    invoice_lines?:
      | Array<{ description: string | null; amount: number; line_type: string | null }>
      | null;
  }>;
  visits: Array<{
    id: string;
    scheduled_date: string;
    status: string;
    crew_notes: string | null;
  }>;
  visitCosts: Array<{
    visit_id: string;
    cost_type: string;
    description: string | null;
    amount: number;
  }>;
  extraWork: Array<{
    id: string;
    title: string;
    quoted_amount: number;
    status: string;
  }>;
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function weeksBetween(start: string | null, end: string | null) {
  if (!start || !end) return 12;
  const a = new Date(start + "T00:00:00");
  const b = new Date(end + "T00:00:00");
  const days = Math.max(1, (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, days / 7);
}

function severityFor(totalLost: number, revenue: number): LeakSeverity {
  const pct = revenue > 0 ? (totalLost / revenue) * 100 : 0;
  if (totalLost >= 1000 || pct >= 20) return "high";
  if (totalLost >= 350 || pct >= 10) return "medium";
  return "low";
}

function isFuelOrTravelDescription(description: string | null) {
  if (!description) return false;
  return /fuel|gas|travel|mileage|drive|transport|trip/i.test(description);
}

/**
 * Estimate profit leaks from existing contract, visit, cost, and extra-work data.
 * Uses peer averages and contract expectations where exact accounting is unavailable.
 */
export function detectProfitLeaks(inputs: LeakInput[]): ContractProfitLeak[] {
  const prepared = inputs.map((input) => {
    const revenue = (input.invoices ?? [])
      .filter((invoice) => invoice.status !== "canceled" && invoice.status !== "voided")
      .reduce((sum, invoice) => sum + Number(invoice.total), 0);

    const labor = input.visitCosts
      .filter((cost) => cost.cost_type === "labor")
      .reduce((sum, cost) => sum + Number(cost.amount), 0);
    const materials = input.visitCosts
      .filter((cost) => cost.cost_type === "materials")
      .reduce((sum, cost) => sum + Number(cost.amount), 0);
    const equipment = input.visitCosts
      .filter((cost) => cost.cost_type === "equipment")
      .reduce((sum, cost) => sum + Number(cost.amount), 0);
    const fuelTagged = input.visitCosts
      .filter((cost) => isFuelOrTravelDescription(cost.description))
      .reduce((sum, cost) => sum + Number(cost.amount), 0);

    const totalCosts = labor + materials + equipment;
    const completedVisits = input.visits.filter(
      (visit) => visit.status === "completed"
    ).length;

    return {
      input,
      revenue,
      labor,
      materials,
      equipment,
      fuelTagged,
      totalCosts,
      completedVisits,
    };
  });

  const withCosts = prepared.filter((row) => row.totalCosts > 0 || row.revenue > 0);
  const avgLaborShare =
    withCosts.length > 0
      ? withCosts.reduce(
          (sum, row) =>
            sum + (row.revenue > 0 ? row.labor / row.revenue : 0),
          0
        ) / withCosts.length
      : 0.2;
  const avgMaterialShare =
    withCosts.length > 0
      ? withCosts.reduce(
          (sum, row) =>
            sum + (row.revenue > 0 ? row.materials / row.revenue : 0),
          0
        ) / withCosts.length
      : 0.05;
  const avgEquipmentShare =
    withCosts.length > 0
      ? withCosts.reduce(
          (sum, row) =>
            sum + (row.revenue > 0 ? row.equipment / row.revenue : 0),
          0
        ) / withCosts.length
      : 0.03;
  const avgCostPerCompletedVisit =
    withCosts.reduce((sum, row) => sum + row.completedVisits, 0) > 0
      ? withCosts.reduce((sum, row) => sum + row.totalCosts, 0) /
        withCosts.reduce((sum, row) => sum + row.completedVisits, 0)
      : 150;

  const results: ContractProfitLeak[] = [];

  for (const row of prepared) {
    const { input, revenue, labor, materials, equipment, fuelTagged, totalCosts, completedVisits } =
      row;
    const leaks: ProfitLeakItem[] = [];
    const pushLeak = (category: ProfitLeakCategory, dollarImpact: number) => {
      const amount = roundMoney(Math.max(0, dollarImpact));
      if (amount < 25) return;
      leaks.push({
        category,
        dollarImpact: amount,
        percentImpact:
          revenue > 0 ? Math.round((amount / revenue) * 1000) / 10 : 0,
      });
    };

    // Excess labor: peer share of revenue OR above half of direct costs.
    const peerLaborExcess =
      labor - revenue * Math.max(avgLaborShare * 0.9, 0.08);
    const compositionLaborExcess =
      totalCosts > 0 && labor / totalCosts > 0.5
        ? labor - totalCosts * 0.5
        : 0;
    pushLeak(
      "Excess labor costs",
      Math.max(peerLaborExcess, compositionLaborExcess)
    );

    // High materials: peer share OR elevated share of direct costs.
    const peerMaterialsExcess =
      materials - revenue * Math.max(avgMaterialShare * 0.9, 0.025);
    const compositionMaterialsExcess =
      totalCosts > 0 && materials / totalCosts > 0.12
        ? materials - totalCosts * 0.12
        : 0;
    pushLeak(
      "High material costs",
      Math.max(peerMaterialsExcess, compositionMaterialsExcess)
    );

    // Equipment above peer share or elevated cost mix.
    const peerEquipmentExcess =
      equipment - revenue * Math.max(avgEquipmentShare * 0.9, 0.015);
    const compositionEquipmentExcess =
      totalCosts > 0 && equipment / totalCosts > 0.1
        ? equipment - totalCosts * 0.1
        : 0;
    pushLeak(
      "Equipment costs",
      Math.max(peerEquipmentExcess, compositionEquipmentExcess)
    );

    // Fuel/travel: tagged descriptions, else estimate from high visit intensity.
    const expectedWeeks = weeksBetween(input.seasonStart, input.seasonEnd);
    const expectedVisits =
      input.visitsPerWeek > 0
        ? Math.round(input.visitsPerWeek * Math.min(expectedWeeks, 16))
        : completedVisits;
    const repeatVisits = Math.max(0, completedVisits - Math.max(expectedVisits, 1));
    if (fuelTagged > 0) {
      pushLeak("Fuel or travel overages", fuelTagged);
    } else if (repeatVisits > 0 || completedVisits >= 2) {
      const travelEstimate = Math.min(
        labor * 0.1,
        (repeatVisits > 0 ? repeatVisits : Math.max(0, completedVisits - 1)) * 40
      );
      pushLeak("Fuel or travel overages", travelEstimate);
    }

    // Repeat service visits beyond contract cadence.
    if (repeatVisits > 0) {
      pushLeak(
        "Repeat service visits",
        repeatVisits * Math.max(avgCostPerCompletedVisit * 0.65, 80)
      );
    } else if (completedVisits >= 2 && input.visitsPerWeek <= 1) {
      // Dense short-window revisits still create rework pressure.
      pushLeak(
        "Repeat service visits",
        Math.max(0, completedVisits - 1) * 60
      );
    }

    // Unbilled extra work (quoted/approved/completed not reflected on invoices).
    const lineText = (input.invoices ?? [])
      .flatMap((invoice) => invoice.invoice_lines ?? [])
      .map((line) => (line.description ?? "").toLowerCase())
      .join(" | ");

    const hasInvoiceLines = (input.invoices ?? []).some(
      (invoice) => (invoice.invoice_lines?.length ?? 0) > 0
    );
    let unbilled = 0;
    for (const order of input.extraWork) {
      if (order.status === "declined") continue;
      const titled = order.title.toLowerCase();
      const billed = hasInvoiceLines && lineText.includes(titled);
      // If line items are unavailable, only treat still-quoted work as unbilled.
      const countable = hasInvoiceLines
        ? order.status === "quoted" ||
          order.status === "approved" ||
          order.status === "completed"
        : order.status === "quoted";
      if (!billed && countable) {
        unbilled += Number(order.quoted_amount);
      }
    }
    pushLeak("Unbilled work", unbilled);

    // Seasonal cost increases: peak summer months vs other months.
    const costsByMonth = new Map<string, number>();
    const visitDateById = new Map(
      input.visits.map((visit) => [visit.id, visit.scheduled_date])
    );
    for (const cost of input.visitCosts) {
      const date = visitDateById.get(cost.visit_id);
      if (!date) continue;
      const month = date.slice(0, 7);
      costsByMonth.set(month, (costsByMonth.get(month) ?? 0) + Number(cost.amount));
    }
    if (costsByMonth.size >= 1) {
      const monthlyValues = Array.from(costsByMonth.values());
      const avgMonthly =
        monthlyValues.reduce((sum, value) => sum + value, 0) /
        monthlyValues.length;
      let seasonal = 0;
      for (const [month, amount] of costsByMonth) {
        const monthNum = Number(month.slice(5, 7));
        const isPeak = monthNum >= 5 && monthNum <= 8;
        if (isPeak && amount > avgMonthly * 1.25) {
          seasonal += amount - avgMonthly;
        }
      }
      pushLeak("Seasonal cost increases", seasonal);
    }

    leaks.sort((a, b) => b.dollarImpact - a.dollarImpact);
    const topLeaks = leaks.slice(0, 4);
    const totalProfitLost = roundMoney(
      topLeaks.reduce((sum, leak) => sum + leak.dollarImpact, 0)
    );
    const totalPercentImpact =
      revenue > 0
        ? Math.min(
            100,
            Math.round((totalProfitLost / revenue) * 1000) / 10
          )
        : 0;

    results.push({
      contractId: input.contractId,
      title: input.title,
      customerName: input.customerName,
      revenue: roundMoney(revenue),
      totalCosts: roundMoney(totalCosts),
      leaks: topLeaks,
      totalProfitLost,
      totalPercentImpact,
      severity: severityFor(totalProfitLost, revenue),
    });
  }

  return results
    .filter((row) => row.totalProfitLost > 0 && row.leaks.length > 0)
    .sort((a, b) => b.totalProfitLost - a.totalProfitLost);
}
