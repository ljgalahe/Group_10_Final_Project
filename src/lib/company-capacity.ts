/**
 * Company capacity: crew headcount × weekly available hours
 * vs contracted visits/week (labor hours demanded).
 */

import {
  DEMO_EMPLOYEES,
  DEMO_SITES,
  DEMO_TODAY,
  weeklyHourTarget,
} from "@/lib/demo-org";

/** Typical commercial stop: ~4–5 crew × ~10 on-site hours. */
export const LABOR_HOURS_PER_VISIT = 48;

/** Alert when booked utilization reaches this percent. */
export const CAPACITY_ALERT_THRESHOLD_PCT = 95;

export type CompanyCapacity = {
  today: string;
  crewCount: number;
  hoursPerPerson: number;
  availableHours: number;
  contractedVisitsPerWeek: number;
  demandHours: number;
  /** 0–100+ utilization of crew labor by contracted weekly visits. */
  bookedPct: number;
  remainingPct: number;
  isLow: boolean;
  thresholdPct: number;
};

export type ActiveContractCapacityInput = {
  customerId?: string | null;
  visits_per_week?: number | null;
  status?: string | null;
};

/**
 * Weekly visit demand from active contracts, enriched with demo site
 * visits/week. Falls back to the full demo site book so roster-scale
 * capacity reflects GreenScape’s commercial portfolio.
 */
export function contractedVisitsPerWeek(
  contracts: ActiveContractCapacityInput[]
): number {
  const active = contracts.filter(
    (c) => !c.status || c.status.toLowerCase() === "active"
  );

  let fromContracts = 0;
  for (const contract of active) {
    if (contract.visits_per_week != null && Number(contract.visits_per_week) > 0) {
      fromContracts += Number(contract.visits_per_week);
      continue;
    }
    const site = DEMO_SITES.find((s) => s.customerId === contract.customerId);
    if (site) fromContracts += site.visitsPerWeek;
  }

  const fromDemoBook = DEMO_SITES.reduce(
    (sum, site) => sum + site.visitsPerWeek,
    0
  );

  return Math.max(fromContracts, fromDemoBook);
}

export function buildCompanyCapacity(options?: {
  today?: string;
  contracts?: ActiveContractCapacityInput[];
  crewCount?: number;
}): CompanyCapacity {
  const today = options?.today ?? DEMO_TODAY;
  const crewCount = options?.crewCount ?? DEMO_EMPLOYEES.length;
  const hoursPerPerson = weeklyHourTarget(today);
  const availableHours = Math.max(1, crewCount * hoursPerPerson);
  const visits = Math.max(
    0,
    options?.contracts
      ? contractedVisitsPerWeek(options.contracts)
      : DEMO_SITES.reduce((sum, site) => sum + site.visitsPerWeek, 0)
  );
  const demandHours = visits * LABOR_HOURS_PER_VISIT;
  const bookedPct = Math.round((demandHours / availableHours) * 1000) / 10;
  const remainingPct = Math.max(0, Math.round((100 - bookedPct) * 10) / 10);

  return {
    today,
    crewCount,
    hoursPerPerson,
    availableHours,
    contractedVisitsPerWeek: visits,
    demandHours,
    bookedPct,
    remainingPct,
    isLow: bookedPct >= CAPACITY_ALERT_THRESHOLD_PCT,
    thresholdPct: CAPACITY_ALERT_THRESHOLD_PCT,
  };
}

export type ReferralPartner = {
  id: string;
  name: string;
  focus: string;
  area: string;
  contact: string;
  phone: string;
};

/** Local partners for overflow / new-customer referrals. */
export const REFERRAL_PARTNERS: ReferralPartner[] = [
  {
    id: "partner-grove",
    name: "Grove & Lot Maintenance",
    focus: "Small commercial lots & HOA common areas",
    area: "Oxford · Batesville",
    contact: "Dana Grove",
    phone: "(662) 555-0198",
  },
  {
    id: "partner-northline",
    name: "Northline Grounds Co.",
    focus: "Retail frontage & parking-lot islands",
    area: "Tupelo · New Albany",
    contact: "Chris North",
    phone: "(662) 555-0174",
  },
  {
    id: "partner-pines",
    name: "Pines Outdoor Services",
    focus: "Office parks & light industrial yards",
    area: "Oxford · Water Valley",
    contact: "Sam Pines",
    phone: "(662) 555-0112",
  },
  {
    id: "partner-delta",
    name: "Delta Edge Landscaping",
    focus: "Seasonal color beds & irrigation checks",
    area: "Southaven · Hernando",
    contact: "Lee Delta",
    phone: "(662) 555-0160",
  },
];

