import { formatCurrency } from "@/lib/format";
import type {
  Contract,
  ContractService,
  ExtraWorkOrder,
  ServiceVisit,
} from "@/lib/types";

export type PromiseRowStatus =
  | "complete"
  | "missed"
  | "not_scheduled"
  | "partially_scheduled"
  | "partial"
  | "unapproved_extra"
  | "scheduled";

export type PromiseVisitOutcome =
  | "completed"
  | "scheduled"
  | "skipped"
  | "not_scheduled"
  | "extra";

export interface PromiseVisitDetail {
  date: string;
  outcome: PromiseVisitOutcome;
  note?: string;
  companyName?: string;
}

export interface PromiseRow {
  service: string;
  contractLabel: string;
  contractedCount: number | null;
  completed: number;
  scheduled: number;
  /** Visits that were on the schedule but not completed. */
  skipped: number;
  /** Promised visits that were never placed on the schedule. */
  notScheduled: number;
  status: PromiseRowStatus;
  visits: PromiseVisitDetail[];
}

export type TrackStatus = "on_track" | "ahead" | "at_risk" | "behind";

export interface ContractProgress {
  contractId: string;
  title: string;
  customerName: string;
  contractStatus: string;
  percentComplete: number;
  trackStatus: TrackStatus;
  promisedVisits: number;
  completedVisits: number;
  scheduledVisits: number;
  seasonElapsedPct: number;
  rows: PromiseRow[];
  uncontractedAmount: number;
  uncontractedLabel: string;
}

export interface ScopeCreepOccurrence {
  label: string;
  amount: number;
}

export interface ScopeCreepItem {
  /** Present for DB extra_work_orders awaiting approval. */
  id?: string;
  title: string;
  amount: number;
  reason: string;
  occurrences?: ScopeCreepOccurrence[];
}

export interface ScopeCreepAlert {
  contractId: string;
  propertyName: string;
  amount: number;
  windowLabel: string;
  detail: string;
  items: ScopeCreepItem[];
}

const SEED_CONTRACT = {
  riverside: "22222222-2222-2222-2222-222222222201",
  summit: "22222222-2222-2222-2222-222222222202",
  harbor: "22222222-2222-2222-2222-222222222203",
  metro: "22222222-2222-2222-2222-222222222204",
} as const;

/** Demo promise maps aligned to seed contracts (screenshot-style rows). */
const PROMISE_OVERLAYS: Record<string, PromiseRow[]> = {
  [SEED_CONTRACT.riverside]: [
    {
      service: "Mowing",
      contractLabel: "4 visits",
      contractedCount: 4,
      completed: 4,
      scheduled: 0,
      skipped: 0,
      notScheduled: 0,
      status: "complete",
      visits: [
        { date: "2026-05-12", outcome: "completed", note: "Front lawn + courtyard" },
        { date: "2026-06-02", outcome: "completed", note: "Standard mow and edge" },
        { date: "2026-06-16", outcome: "completed", note: "All zones" },
        { date: "2026-06-30", outcome: "completed", note: "Seasonal cut" },
      ],
    },
    {
      service: "Shrub trimming",
      contractLabel: "1 visit",
      contractedCount: 1,
      completed: 0,
      scheduled: 0,
      skipped: 0,
      notScheduled: 1,
      status: "not_scheduled",
      visits: [
        {
          date: "not-scheduled-riverside-shrub",
          outcome: "not_scheduled",
          note: "Promised in contract but never placed on the crew schedule",
        },
      ],
    },
    {
      service: "Edging",
      contractLabel: "4 visits",
      contractedCount: 4,
      completed: 3,
      scheduled: 1,
      skipped: 0,
      notScheduled: 0,
      status: "partial",
      visits: [
        { date: "2026-05-12", outcome: "completed" },
        { date: "2026-06-02", outcome: "completed" },
        { date: "2026-06-16", outcome: "completed" },
        { date: "2026-08-05", outcome: "scheduled", note: "Upcoming weekly grounds" },
      ],
    },
      {
        service: "Irrigation repair",
        contractLabel: "Not included",
        contractedCount: null,
        completed: 0,
        scheduled: 0,
        skipped: 0,
        notScheduled: 0,
        status: "unapproved_extra",
        visits: [
          {
            date: "2026-07-03",
            outcome: "extra",
            note: "Crew request — zone valve repair (awaiting manager approval)",
          },
        ],
      },
  ],
  [SEED_CONTRACT.summit]: [
    {
      service: "Mowing",
      contractLabel: "6 visits",
      contractedCount: 6,
      completed: 4,
      scheduled: 2,
      skipped: 0,
      notScheduled: 0,
      status: "partial",
      visits: [
        { date: "2026-05-06", outcome: "completed" },
        { date: "2026-05-20", outcome: "completed" },
        { date: "2026-06-03", outcome: "completed", note: "Retail frontage" },
        { date: "2026-06-17", outcome: "completed" },
        { date: "2026-08-07", outcome: "scheduled" },
        { date: "2026-08-21", outcome: "scheduled" },
      ],
    },
    {
      service: "Fertilization",
      contractLabel: "2 visits",
      contractedCount: 2,
      completed: 1,
      scheduled: 0,
      skipped: 1,
      notScheduled: 0,
      status: "partial",
      visits: [
        { date: "2026-05-20", outcome: "completed", note: "Spring application" },
        { date: "2026-07-15", outcome: "skipped", note: "Missed mid-season pass" },
      ],
    },
    {
      service: "Storm debris removal",
      contractLabel: "Not included",
      contractedCount: null,
      completed: 0,
      scheduled: 0,
      skipped: 0,
      notScheduled: 0,
      status: "unapproved_extra",
      visits: [
        {
          date: "2026-05-22",
          outcome: "extra",
          note: "Crew request — awaiting manager approval",
        },
        {
          date: "2026-06-19",
          outcome: "extra",
          note: "Crew request — awaiting manager approval",
        },
      ],
    },
  ],
  [SEED_CONTRACT.harbor]: [
    {
      service: "Mowing",
      contractLabel: "2 visits",
      contractedCount: 2,
      completed: 1,
      scheduled: 1,
      skipped: 0,
      notScheduled: 0,
      status: "partial",
      visits: [
        { date: "2026-06-10", outcome: "completed" },
        { date: "2026-08-06", outcome: "scheduled" },
      ],
    },
    {
      service: "Bed Weeding",
      contractLabel: "2 visits",
      contractedCount: 2,
      completed: 0,
      scheduled: 1,
      skipped: 1,
      notScheduled: 0,
      status: "missed",
      visits: [
        { date: "2026-06-10", outcome: "skipped", note: "Not completed with mow" },
        { date: "2026-08-06", outcome: "scheduled" },
      ],
    },
  ],
  [SEED_CONTRACT.metro]: [
    {
      service: "Mowing",
      contractLabel: "4 visits",
      contractedCount: 4,
      completed: 2,
      scheduled: 1,
      skipped: 1,
      notScheduled: 0,
      status: "partial",
      visits: [
        { date: "2026-05-14", outcome: "completed" },
        { date: "2026-06-04", outcome: "completed" },
        { date: "2026-06-25", outcome: "skipped", note: "Weather delay — not rescheduled" },
        { date: "2026-08-12", outcome: "scheduled" },
      ],
    },
    {
      service: "Detention pond maintenance",
      contractLabel: "2 visits",
      contractedCount: 2,
      completed: 1,
      scheduled: 0,
      skipped: 1,
      notScheduled: 0,
      status: "partial",
      visits: [
        { date: "2026-06-04", outcome: "completed", note: "Extra time on pond area" },
        {
          date: "2026-07-09",
          outcome: "skipped",
          note: "Pond visit skipped — equipment unavailable",
        },
      ],
    },
    {
      service: "Irrigation repair",
      contractLabel: "Not included",
      contractedCount: null,
      completed: 0,
      scheduled: 0,
      skipped: 0,
      notScheduled: 0,
      status: "unapproved_extra",
      visits: [
        {
          date: "2026-06-04",
          outcome: "extra",
          note: "Crew request — awaiting manager approval",
        },
        {
          date: "2026-06-25",
          outcome: "extra",
          note: "Crew request — awaiting manager approval",
        },
        {
          date: "2026-07-16",
          outcome: "extra",
          note: "Crew request — awaiting manager approval",
        },
      ],
    },
  ],
};

const SCOPE_OVERLAYS: Record<
  string,
  { amount: number; windowLabel: string; detail: string; items: ScopeCreepAlert["items"] }
> = {
  [SEED_CONTRACT.riverside]: {
    amount: 1460,
    windowLabel: "awaiting manager approval",
    detail:
      "Crew lead extra-cost requests outside the seasonal agreement (separate from the approved $2,850 mulch WO already billed on INV-0553). Do not treat as completed until management approves.",
    items: [
      {
        title: "Irrigation repair",
        amount: 420,
        reason: "Crew request — zone valve repair not in contract (pending approval)",
        occurrences: [
          { label: "Requested · estimated", amount: 420 },
        ],
      },
      {
        title: "Extra bed maintenance",
        amount: 240,
        reason: "Crew request — new property section not in scope (pending approval)",
        occurrences: [{ label: "Requested · estimated", amount: 240 }],
      },
      {
        title: "Materials (soil amendment)",
        amount: 800,
        reason: "Crew request — soil/amendment for extra beds (pending approval; not the billed mulch WO)",
        occurrences: [
          { label: "Requested · estimated", amount: 800 },
        ],
      },
    ],
  },
  [SEED_CONTRACT.metro]: {
    amount: 980,
    windowLabel: "awaiting manager approval",
    detail:
      "Crew lead requested pond and irrigation extras. Approval required before work is completed or billed.",
    items: [
      {
        title: "Irrigation repair",
        amount: 560,
        reason: "Crew request — uncontracted repair (pending approval)",
        occurrences: [
          { label: "Requested · estimated", amount: 560 },
        ],
      },
      {
        title: "Storm debris removal",
        amount: 420,
        reason: "Crew request — cleanup not in contract (pending approval)",
        occurrences: [
          { label: "Requested · estimated", amount: 420 },
        ],
      },
    ],
  },
  [SEED_CONTRACT.summit]: {
    amount: 640,
    windowLabel: "awaiting manager approval",
    detail:
      "Crew lead requested storm debris removal. Awaiting manager approval before treating as completed work.",
    items: [
      {
        title: "Storm debris removal",
        amount: 640,
        reason: "Crew request — monthly cleanup not in contract (pending approval)",
        occurrences: [
          { label: "Requested · estimated", amount: 640 },
        ],
      },
    ],
  },
};

export function promiseStatusLabel(status: PromiseRowStatus) {
  if (status === "complete") return "Completed";
  if (status === "missed") return "Missed";
  if (status === "not_scheduled") return "Not Scheduled";
  if (status === "partially_scheduled") return "Partially Scheduled";
  if (status === "partial") return "In Progress";
  if (status === "scheduled") return "Scheduled";
  return "Unapproved Extra";
}

/** Prefer Partially scheduled when some visits are on the calendar and some are not. */
export function effectivePromiseStatus(
  row: Pick<
    PromiseRow,
    | "status"
    | "completed"
    | "scheduled"
    | "skipped"
    | "notScheduled"
    | "visits"
  >
): PromiseRowStatus {
  if (row.status === "unapproved_extra" || row.status === "complete") {
    return row.status;
  }

  const notScheduled =
    Number(row.notScheduled ?? 0) ||
    (row.visits ?? []).filter((v) => isNotScheduledVisit(v)).length;
  const onCalendar =
    Number(row.completed ?? 0) +
    Number(row.scheduled ?? 0) +
    Number(row.skipped ?? 0);

  if (notScheduled > 0 && onCalendar > 0) return "partially_scheduled";
  if (notScheduled > 0 && onCalendar === 0) return "not_scheduled";
  return row.status;
}

export function promiseVisitOutcomeLabel(outcome: PromiseVisitOutcome) {
  if (outcome === "completed") return "Completed";
  if (outcome === "scheduled") return "Scheduled";
  if (outcome === "extra") return "Unapproved Extra";
  if (outcome === "not_scheduled") return "Not Scheduled";
  return "Missed After Scheduled";
}

/** Synthetic / never-calendared visits (not the same as skipped after scheduling). */
export function isNotScheduledVisit(visit: PromiseVisitDetail) {
  return (
    visit.outcome === "not_scheduled" ||
    visit.date.startsWith("skipped-") ||
    visit.date.startsWith("not-scheduled-")
  );
}

export function trackStatusLabel(status: TrackStatus) {
  if (status === "on_track") return "On Track";
  if (status === "ahead") return "Ahead";
  if (status === "at_risk") return "At Risk";
  return "Behind";
}

function seasonElapsedPct(start: string, end: string, asOf = new Date("2026-08-04")) {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return 0;
  const t = asOf.getTime();
  if (t <= s) return 0;
  if (t >= e) return 100;
  return ((t - s) / (e - s)) * 100;
}

function deriveTrack(percentComplete: number, elapsed: number): TrackStatus {
  const delta = percentComplete - elapsed;
  if (delta >= 8) return "ahead";
  if (delta >= -5) return "on_track";
  if (delta >= -15) return "at_risk";
  return "behind";
}

function buildRowsFromData(
  services: ContractService[],
  visits: ServiceVisit[],
  extras: ExtraWorkOrder[]
): PromiseRow[] {
  const completedList = visits.filter((v) => v.status === "completed");
  const scheduledList = visits.filter((v) => v.status === "scheduled");
  const completedVisits = completedList.length;
  const scheduledVisits = scheduledList.length;
  const included = services.filter((s) => s.included);

  const rows: PromiseRow[] = included.map((service, index) => {
    const promised = Math.max(
      1,
      Math.round((completedVisits + scheduledVisits) / Math.max(1, included.length)) +
        (index === 0 ? 1 : 0)
    );
    const completed =
      index === 0
        ? Math.min(promised, completedVisits)
        : index === 1
          ? Math.max(0, completedVisits - promised)
          : 0;
    const scheduled = index === 0 ? scheduledVisits : 0;
    const notScheduled = Math.max(0, promised - completed - scheduled);
    let status: PromiseRowStatus = "partial";
    if (completed >= promised && promised > 0) status = "complete";
    else if (notScheduled > 0 && (completed > 0 || scheduled > 0))
      status = "partially_scheduled";
    else if (completed === 0 && scheduled === 0 && promised > 0)
      status = "not_scheduled";
    else if (completed === 0 && scheduled > 0) status = "scheduled";

    const visitDetails: PromiseVisitDetail[] = [
      ...completedList.slice(0, completed).map((v) => ({
        date: v.scheduled_date,
        outcome: "completed" as const,
        note: v.crew_notes ?? undefined,
      })),
      ...scheduledList.slice(0, scheduled).map((v) => ({
        date: v.scheduled_date,
        outcome: "scheduled" as const,
      })),
      ...Array.from({ length: notScheduled }, (_, i) => ({
        date: `not-scheduled-${index}-${i}`,
        outcome: "not_scheduled" as const,
        note: "Promised in the contract but not yet placed on the schedule",
      })),
    ];

    return {
      service: service.service_name,
      contractLabel: `${promised} ${promised === 1 ? "visit" : "visits"}`,
      contractedCount: promised,
      completed,
      scheduled,
      skipped: 0,
      notScheduled,
      status,
      visits: visitDetails,
    };
  });

  for (const extra of extras) {
    rows.push(rowFromExtraWork(extra));
  }

  return rows;
}

function rowFromExtraWork(extra: ExtraWorkOrder): PromiseRow {
  const approved =
    extra.status === "completed" || extra.status === "approved";
  return {
    service: extra.title,
    contractLabel: "Not included",
    contractedCount: null,
    completed: approved ? 1 : 0,
    scheduled: extra.status === "quoted" ? 1 : 0,
    skipped: 0,
    notScheduled: 0,
    status: "unapproved_extra",
    visits: [
      {
        date: extra.created_at?.slice(0, 10) ?? "2026-06-01",
        outcome: "extra",
        note: extra.description ?? undefined,
      },
    ],
  };
}

/** Overlay demo rows, with extras taken from real extra_work_orders so names match. */
function mergeOverlayExtras(
  overlay: PromiseRow[],
  extras: ExtraWorkOrder[]
): PromiseRow[] {
  const withoutExtras = overlay.filter((r) => r.status !== "unapproved_extra");
  const overlayExtras = overlay.filter((r) => r.status === "unapproved_extra");
  const quoted = extras.filter((e) => e.status === "quoted");
  const decided = extras.filter(
    (e) => e.status === "approved" || e.status === "completed"
  );

  // Quoted DB orders are the real pending approvals — show those (+ already decided).
  if (quoted.length > 0) {
    return [
      ...withoutExtras,
      ...quoted.map(rowFromExtraWork),
      ...decided.map(rowFromExtraWork),
    ];
  }

  // Contract already has DB extras (e.g. approved) — don't invent a second pending set.
  if (extras.length > 0) {
    return [...withoutExtras, ...extras.map(rowFromExtraWork)];
  }

  // No DB extras: keep overlay pending extras so this chart matches Extra work approval.
  return [...withoutExtras, ...overlayExtras];
}

export function buildContractProgress(
  contract: Contract & {
    customers?: { name?: string } | null;
    contract_services?: ContractService[];
    extra_work_orders?: ExtraWorkOrder[];
  },
  visits: ServiceVisit[]
): ContractProgress {
  const services = contract.contract_services ?? [];
  const extras = contract.extra_work_orders ?? [];
  const overlay = PROMISE_OVERLAYS[contract.id];
  const rows = overlay
    ? mergeOverlayExtras(overlay, extras)
    : buildRowsFromData(services, visits, extras);

  const contracted = rows.filter((r) => r.contractedCount != null);
  const promisedVisits = contracted.reduce((s, r) => s + (r.contractedCount ?? 0), 0);
  const completedTowardPromise = contracted.reduce(
    (s, r) => s + Math.min(r.completed, r.contractedCount ?? 0),
    0
  );
  const completedVisits = visits.filter((v) => v.status === "completed").length;
  const scheduledVisits = visits.filter((v) => v.status === "scheduled").length;
  const percentComplete =
    promisedVisits > 0
      ? Math.round((completedTowardPromise / promisedVisits) * 100)
      : visits.length === 0
        ? 0
        : Math.round((completedVisits / visits.length) * 100);

  const elapsed = seasonElapsedPct(contract.season_start, contract.season_end);
  const trackStatus = deriveTrack(percentComplete, elapsed);
  const scope = SCOPE_OVERLAYS[contract.id];
  const uncontractedAmount =
    scope?.amount ??
    extras.reduce((s, e) => s + Number(e.quoted_amount), 0);

  return {
    contractId: contract.id,
    title: contract.title,
    customerName: contract.customers?.name ?? "Customer",
    contractStatus: contract.status,
    percentComplete,
    trackStatus,
    promisedVisits,
    completedVisits: Math.max(completedVisits, completedTowardPromise),
    scheduledVisits,
    seasonElapsedPct: Math.round(elapsed),
    rows,
    uncontractedAmount,
    uncontractedLabel: scope
      ? formatCurrency(scope.amount)
      : formatCurrency(uncontractedAmount),
  };
}

export function buildScopeCreepAlerts(
  contracts: (Contract & {
    customers?: { name?: string } | null;
    extra_work_orders?: ExtraWorkOrder[];
  })[]
): ScopeCreepAlert[] {
  const alerts: ScopeCreepAlert[] = [];

  for (const contract of contracts) {
    const allExtras = contract.extra_work_orders ?? [];
    const quoted = allExtras.filter((e) => e.status === "quoted");

    // Same source as the contract promise chart: real quoted orders first.
    if (quoted.length > 0) {
      const amount = quoted.reduce((s, e) => s + Number(e.quoted_amount), 0);
      if (amount > 0) {
        alerts.push({
          contractId: contract.id,
          propertyName: contract.customers?.name ?? contract.title,
          amount,
          windowLabel: "awaiting manager approval",
          detail:
            "Extra-cost requests outside the original agreement. Approve before crew completes or bills this work.",
          items: quoted.map((e) => ({
            id: e.id,
            title: e.title,
            amount: Number(e.quoted_amount),
            reason:
              e.description ?? "Not included in contract — pending approval",
          })),
        });
      }
      continue;
    }

    // If the contract already has decided extras, don't re-surface demo pending items.
    if (allExtras.length > 0) continue;

    // Match promise-chart overlay extras when there is no DB order yet.
    const overlay = SCOPE_OVERLAYS[contract.id];
    if (overlay) {
      alerts.push({
        contractId: contract.id,
        propertyName: contract.customers?.name ?? contract.title,
        amount: overlay.amount,
        windowLabel: overlay.windowLabel,
        detail: overlay.detail,
        items: overlay.items,
      });
    }
  }

  return alerts.sort((a, b) => b.amount - a.amount);
}

export function portfolioSummary(progressList: ContractProgress[]) {
  const avgComplete =
    progressList.length === 0
      ? 0
      : Math.round(
          progressList.reduce((s, p) => s + p.percentComplete, 0) /
            progressList.length
        );
  const onTrack = progressList.filter(
    (p) => p.trackStatus === "on_track" || p.trackStatus === "ahead"
  ).length;
  const atRisk = progressList.filter(
    (p) => p.trackStatus === "at_risk" || p.trackStatus === "behind"
  ).length;
  const active = progressList.filter((p) => p.contractStatus === "active").length;

  return { avgComplete, onTrack, atRisk, active, total: progressList.length };
}
