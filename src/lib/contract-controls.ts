import { formatCurrency } from "@/lib/format";
import type {
  Contract,
  ContractService,
  ExtraWorkOrder,
  ServiceVisit,
} from "@/lib/types";

export type PromiseRowStatus = "complete" | "missed" | "partial" | "unapproved_extra" | "scheduled";

export type PromiseVisitOutcome = "completed" | "scheduled" | "skipped" | "extra";

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
  skipped: number;
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
      skipped: 1,
      status: "missed",
      visits: [
        { date: "2026-06-09", outcome: "skipped", note: "Deferred — no crew time booked" },
      ],
    },
    {
      service: "Edging",
      contractLabel: "4 visits",
      contractedCount: 4,
      completed: 3,
      scheduled: 1,
      skipped: 0,
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
      completed: 1,
      scheduled: 0,
      skipped: 0,
      status: "unapproved_extra",
      visits: [
        { date: "2026-07-03", outcome: "extra", note: "Zone valve repair — not in contract" },
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
      completed: 2,
      scheduled: 0,
      skipped: 0,
      status: "unapproved_extra",
      visits: [
        { date: "2026-05-22", outcome: "extra" },
        { date: "2026-06-19", outcome: "extra" },
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
      status: "partial",
      visits: [
        { date: "2026-06-10", outcome: "completed" },
        { date: "2026-08-06", outcome: "scheduled" },
      ],
    },
    {
      service: "Bed weeding",
      contractLabel: "2 visits",
      contractedCount: 2,
      completed: 0,
      scheduled: 1,
      skipped: 1,
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
      status: "partial",
      visits: [
        { date: "2026-06-04", outcome: "completed", note: "Extra time on pond area" },
        { date: "2026-07-09", outcome: "skipped" },
      ],
    },
    {
      service: "Irrigation repair",
      contractLabel: "Not included",
      contractedCount: null,
      completed: 3,
      scheduled: 0,
      skipped: 0,
      status: "unapproved_extra",
      visits: [
        { date: "2026-06-04", outcome: "extra" },
        { date: "2026-06-25", outcome: "extra" },
        { date: "2026-07-16", outcome: "extra" },
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
    windowLabel: "last 60 days",
    detail: "Uncontracted irrigation and mulch bed work outside the seasonal agreement.",
    items: [
      {
        title: "Irrigation repair",
        amount: 420,
        reason: "Repeated 3 times without contract coverage",
        occurrences: [
          { label: "Visit 1 · Jun 12", amount: 140 },
          { label: "Visit 2 · Jul 3", amount: 155 },
          { label: "Visit 3 · Jul 28", amount: 125 },
        ],
      },
      {
        title: "Extra bed maintenance",
        amount: 240,
        reason: "New property section not in scope",
        occurrences: [{ label: "Visit 1 · Jul 15", amount: 240 }],
      },
      {
        title: "Materials without billing",
        amount: 800,
        reason: "Mulch/soil used, not invoiced as extra work",
        occurrences: [
          { label: "Delivery 1 · Jun 20", amount: 380 },
          { label: "Delivery 2 · Jul 18", amount: 420 },
        ],
      },
    ],
  },
  [SEED_CONTRACT.metro]: {
    amount: 980,
    windowLabel: "last 60 days",
    detail: "Crew repeatedly spent extra time on pond and irrigation outside contracted scope.",
    items: [
      {
        title: "Irrigation repair",
        amount: 560,
        reason: "Three uncontracted repair visits",
        occurrences: [
          { label: "Visit 1 · Jun 4", amount: 180 },
          { label: "Visit 2 · Jun 25", amount: 195 },
          { label: "Visit 3 · Jul 16", amount: 185 },
        ],
      },
      {
        title: "Storm debris removal",
        amount: 420,
        reason: "Monthly cleanup not in contract",
        occurrences: [
          { label: "Visit 1 · Jun 8", amount: 210 },
          { label: "Visit 2 · Jul 8", amount: 210 },
        ],
      },
    ],
  },
  [SEED_CONTRACT.summit]: {
    amount: 640,
    windowLabel: "last 60 days",
    detail: "Storm debris and frontage extras performed without change orders.",
    items: [
      {
        title: "Storm debris removal",
        amount: 640,
        reason: "Repeated monthly without billing",
        occurrences: [
          { label: "Visit 1 · May 22", amount: 210 },
          { label: "Visit 2 · Jun 19", amount: 215 },
          { label: "Visit 3 · Jul 17", amount: 215 },
        ],
      },
    ],
  },
};

export function promiseStatusLabel(status: PromiseRowStatus) {
  if (status === "complete") return "Complete";
  if (status === "missed") return "Missed";
  if (status === "partial") return "In progress";
  if (status === "scheduled") return "Scheduled";
  return "Unapproved extra";
}

export function trackStatusLabel(status: TrackStatus) {
  if (status === "on_track") return "On track";
  if (status === "ahead") return "Ahead";
  if (status === "at_risk") return "At risk";
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
    const skipped = Math.max(0, promised - completed - scheduled);
    let status: PromiseRowStatus = "partial";
    if (completed >= promised && promised > 0) status = "complete";
    else if (completed === 0 && scheduled === 0 && promised > 0) status = "missed";
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
      ...Array.from({ length: skipped }, (_, i) => ({
        date: `skipped-${index}-${i}`,
        outcome: "skipped" as const,
        note: "Promised visit not completed",
      })),
    ];

    return {
      service: service.service_name,
      contractLabel: `${promised} ${promised === 1 ? "visit" : "visits"}`,
      contractedCount: promised,
      completed,
      scheduled,
      skipped,
      status,
      visits: visitDetails,
    };
  });

  for (const extra of extras) {
    rows.push({
      service: extra.title,
      contractLabel: "Not included",
      contractedCount: null,
      completed: extra.status === "completed" || extra.status === "approved" ? 1 : 0,
      scheduled: extra.status === "quoted" ? 1 : 0,
      skipped: 0,
      status: "unapproved_extra",
      visits: [
        {
          date: extra.created_at?.slice(0, 10) ?? "2026-06-01",
          outcome: "extra",
          note: extra.description ?? undefined,
        },
      ],
    });
  }

  return rows;
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
  const rows = overlay ?? buildRowsFromData(services, visits, extras);

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
      continue;
    }

    const extras = (contract.extra_work_orders ?? []).filter(
      (e) => e.status === "quoted" || e.status === "approved"
    );
    if (extras.length === 0) continue;
    const amount = extras.reduce((s, e) => s + Number(e.quoted_amount), 0);
    if (amount <= 0) continue;
    alerts.push({
      contractId: contract.id,
      propertyName: contract.customers?.name ?? contract.title,
      amount,
      windowLabel: "open extra-work orders",
      detail: "Extra work outside the original agreement needs a change order or goodwill decision.",
      items: extras.map((e) => ({
        title: e.title,
        amount: Number(e.quoted_amount),
        reason: e.description ?? "Not included in contract",
      })),
    });
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
