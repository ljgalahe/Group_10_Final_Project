export type BillableStatus =
  | "billable"
  | "pending_approval"
  | "missing_labor";

export type ContractVisitSummary = {
  id: string;
  contract_id: string;
  status: string;
};

export type VisitCostSummary = {
  visit_id: string;
  cost_type: string;
  amount: number | string;
};

export function contractBillableStatus(input: {
  visits: ContractVisitSummary[];
  costs: VisitCostSummary[];
  hasPendingApproval?: boolean;
}): BillableStatus {
  const laborVisitIds = new Set(
    input.costs
      .filter((cost) => cost.cost_type === "labor" && Number(cost.amount) > 0)
      .map((cost) => cost.visit_id)
  );

  const missingLabor = input.visits.some(
    (visit) => visit.status === "completed" && !laborVisitIds.has(visit.id)
  );
  if (missingLabor) return "missing_labor";

  if (
    input.hasPendingApproval ||
    input.visits.some((visit) => visit.status === "scheduled")
  ) {
    return "pending_approval";
  }

  return "billable";
}
