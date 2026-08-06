/** Demo overlays for schedule/crew/weather/proof — keyed to seed visit IDs. */

import {
  DEMO_SITES,
  DEMO_TODAY,
  crewLabel,
  employeesForCrew,
  isWinterMonth,
  weeklyHourTarget,
  type DemoCrewId,
} from "@/lib/demo-org";

export const SEED_VISIT = {
  riverside1: "33333333-3333-3333-3333-333333333301",
  riverside2: "33333333-3333-3333-3333-333333333302",
  riversideSched: "33333333-3333-3333-3333-333333333303",
  /** Customer demo: weather-rescheduled Riverside grounds visit */
  riversideWeatherReschedule: "33333333-3333-3333-3333-333333333320",
  summit1: "33333333-3333-3333-3333-333333333304",
  metro1: "33333333-3333-3333-3333-333333333305",
  harborSched: "33333333-3333-3333-3333-333333333306",
  summitSched: "33333333-3333-3333-3333-333333333307",
} as const;

export interface CrewMember {
  name: string;
  role: string;
  hours: number;
  payRate: number;
}

export interface ScheduleOverlay {
  visitId: string;
  jobLabel: string;
  crew: CrewMember[];
}

export interface WeatherOverlay {
  visitId: string;
  label: string;
  detail: string;
  severity: "delayed" | "rescheduled" | "completed_response";
  /** Originally scheduled work date before the weather move. */
  originalDate: string;
  /** New date after reschedule; null when still delayed / not moved yet. */
  rescheduledDate: string | null;
  /** Crew pay budgeted before the weather change. */
  plannedCrewPay: number;
  /** Materials/equipment budgeted before the weather change. */
  plannedCost: number;
}

export interface ProofOverlay {
  visitId: string;
  arrival: string;
  before: string;
  after: string;
  submittedAt: string;
  acknowledged: boolean;
  beforeImage: string;
  afterImage: string;
  concernImage?: string;
  concernLabel?: string;
}

function crewMembersFor(
  crew: DemoCrewId,
  dateIso: string,
  hoursOverride?: number
): CrewMember[] {
  const target = weeklyHourTarget(dateIso);
  const hours = hoursOverride ?? Number((target / 5).toFixed(1));
  return employeesForCrew(crew, { dateIso, forVisit: true }).map((e) => ({
    name: e.name,
    role: e.role,
    hours: e.role === "Crew lead" ? hours : Number((hours * 0.92).toFixed(1)),
    payRate: e.payRate,
  }));
}

export const SCHEDULE_CREW: Record<string, ScheduleOverlay> = {
  [SEED_VISIT.riverside1]: {
    visitId: SEED_VISIT.riverside1,
    jobLabel: "Mowing & edging",
    crew: crewMembersFor("A", "2026-06-02", 3),
  },
  [SEED_VISIT.riverside2]: {
    visitId: SEED_VISIT.riverside2,
    jobLabel: "Hedge trimming",
    crew: crewMembersFor("A", "2026-06-09", 2.5),
  },
  [SEED_VISIT.riversideSched]: {
    visitId: SEED_VISIT.riversideSched,
    jobLabel: "Weekly grounds",
    crew: crewMembersFor("A", "2026-08-05", 3),
  },
  [SEED_VISIT.summit1]: {
    visitId: SEED_VISIT.summit1,
    jobLabel: "Retail frontage mow",
    crew: crewMembersFor("B", "2026-06-03", 4),
  },
  [SEED_VISIT.metro1]: {
    visitId: SEED_VISIT.metro1,
    jobLabel: "Pond & industrial grounds",
    crew: crewMembersFor("C", "2026-06-04", 5),
  },
  [SEED_VISIT.harborSched]: {
    visitId: SEED_VISIT.harborSched,
    jobLabel: "HOA common areas",
    crew: crewMembersFor("A", "2026-08-06", 2),
  },
  [SEED_VISIT.summitSched]: {
    visitId: SEED_VISIT.summitSched,
    jobLabel: "Retail maintenance",
    crew: crewMembersFor("B", "2026-08-07", 3),
  },
};

export const WEATHER_EVENTS: WeatherOverlay[] = [
  {
    visitId: SEED_VISIT.riversideWeatherReschedule,
    label: "Storm reschedule",
    detail:
      "Severe thunderstorms and lightning safety moved Riverside weekly grounds; now first on the open schedule.",
    severity: "rescheduled",
    originalDate: "2026-08-04",
    rescheduledDate: "2026-08-05",
    plannedCrewPay: 216,
    plannedCost: 80,
  },
  {
    visitId: SEED_VISIT.riversideSched,
    label: "Rain delay",
    detail: "Thunderstorms postponed Riverside weekly grounds.",
    severity: "delayed",
    originalDate: "2026-08-05",
    rescheduledDate: null,
    plannedCrewPay: 216,
    plannedCost: 80,
  },
  {
    visitId: SEED_VISIT.harborSched,
    label: "Heat reschedule",
    detail: "Heat advisory moved Harbor View to an early slot.",
    severity: "rescheduled",
    originalDate: "2026-08-04",
    rescheduledDate: "2026-08-06",
    plannedCrewPay: 96,
    plannedCost: 40,
  },
  {
    visitId: SEED_VISIT.summitSched,
    label: "Wind safety hold",
    detail: "High winds paused Summit edging — still outstanding.",
    severity: "delayed",
    originalDate: "2026-08-07",
    rescheduledDate: null,
    plannedCrewPay: 156,
    plannedCost: 55,
  },
  {
    visitId: SEED_VISIT.summit1,
    label: "Storm cleanup",
    detail: "Post-storm debris cleared during Summit visit.",
    severity: "completed_response",
    originalDate: "2026-06-03",
    rescheduledDate: "2026-06-03",
    plannedCrewPay: 296,
    plannedCost: 120,
  },
];

export const PROOF_PACKAGES: ProofOverlay[] = [
  {
    visitId: SEED_VISIT.riverside1,
    arrival: "Gate camera arrival",
    before: "North lawn before",
    after: "North lawn after mow",
    submittedAt: "2026-06-02T14:05:00.000Z",
    acknowledged: true,
    beforeImage:
      "https://images.unsplash.com/photo-1558904541-efa843a96f01?w=600&h=400&fit=crop",
    afterImage:
      "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&h=400&fit=crop",
    concernImage:
      "https://images.unsplash.com/photo-1466692476866-aef5c9b2e6d6?w=600&h=400&fit=crop",
    concernLabel: "Potential concern — dry patch near walkway",
  },
  {
    visitId: SEED_VISIT.riverside2,
    arrival: "Entrance arrival",
    before: "Hedges before trim",
    after: "Hedges after trim",
    submittedAt: "2026-06-09T15:35:00.000Z",
    acknowledged: true,
    beforeImage:
      "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&h=400&fit=crop",
    afterImage:
      "https://images.unsplash.com/photo-1557429287-b2e26487fc22?w=600&h=400&fit=crop",
    concernLabel: "Potential concern — none noted",
  },
  {
    visitId: SEED_VISIT.summit1,
    arrival: "Lot arrival",
    before: "Frontage before",
    after: "Frontage after + debris cleared",
    submittedAt: "2026-06-03T10:10:00.000Z",
    acknowledged: false,
    beforeImage:
      "https://images.unsplash.com/photo-1592419044706-39796d40f98c?w=600&h=400&fit=crop",
    afterImage:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop",
    concernImage:
      "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=600&h=400&fit=crop",
    concernLabel: "Potential concern — storm debris near entrance",
  },
];

export function crewPayTotal(crew: CrewMember[]) {
  return crew.reduce((sum, m) => sum + m.hours * m.payRate, 0);
}

/** One-word / vague crew-note fragments → readable landscaping job names. */
const VAGUE_JOB_LABELS: Record<string, string> = {
  busy: "Campus grounds maintenance",
  winter: "Winter grounds prep",
  summer: "Summer grounds maintenance",
  spring: "Spring cleanup",
  fall: "Fall leaf cleanup",
  autumn: "Fall leaf cleanup",
  routine: "Routine grounds visit",
  regular: "Regular maintenance visit",
  weekly: "Weekly grounds maintenance",
  monthly: "Monthly grounds visit",
  mow: "Mowing & edging",
  mowing: "Mowing & edging",
  trim: "Hedge trimming",
  trimming: "Hedge trimming",
  cleanup: "Site cleanup",
  clean: "Site cleanup",
  irrigation: "Irrigation check",
  beds: "Bed maintenance",
  weeding: "Bed weeding",
  fertilize: "Fertilization",
  fertilization: "Fertilization",
  work: "Grounds maintenance visit",
  visit: "Grounds maintenance visit",
  job: "Grounds maintenance visit",
  done: "Completed grounds visit",
  ok: "Routine grounds visit",
  good: "Routine grounds visit",
};

function titleCaseWords(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((w) =>
      w.length <= 2 && w.toLowerCase() !== "of"
        ? w.toUpperCase()
        : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    )
    .join(" ");
}

function polishContractTitle(title: string): string {
  const cleaned = title
    .replace(/^20\d{2}\s+/i, "")
    .replace(/\s*[—–-]\s*.*$/, "")
    .trim();
  if (!cleaned) return "Grounds maintenance visit";
  if (/grounds|mow|maint|landscape|lawn|bed|irrig/i.test(cleaned)) {
    return titleCaseWords(cleaned);
  }
  return `${titleCaseWords(cleaned)} grounds visit`;
}

function polishCrewNoteJobLabel(
  raw: string,
  contractTitle?: string | null
): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return contractTitle
      ? polishContractTitle(contractTitle)
      : "Grounds maintenance visit";
  }

  const vague = VAGUE_JOB_LABELS[trimmed.toLowerCase()];
  if (vague) return vague;

  // "Scheduled commercial grounds" → "Commercial grounds maintenance"
  if (/^scheduled\b/i.test(trimmed)) {
    const rest = trimmed.replace(/^scheduled\s+/i, "").trim();
    if (!rest) return "Scheduled grounds visit";
    if (/grounds$/i.test(rest) && !/maintenance/i.test(rest)) {
      return `${titleCaseWords(rest)} maintenance`;
    }
    return titleCaseWords(rest);
  }

  // Single short token with no landscaping context → use contract or a clear default
  const words = trimmed.split(/\s+/);
  if (words.length === 1 && trimmed.length <= 12) {
    if (contractTitle) return polishContractTitle(contractTitle);
    return `${titleCaseWords(trimmed)} service visit`;
  }

  return titleCaseWords(trimmed);
}

export function inferJobLabel(
  visitId: string,
  crewNotes: string | null,
  contractTitle?: string | null
): string {
  const schedule = SCHEDULE_CREW[visitId];
  if (schedule?.jobLabel) return schedule.jobLabel;

  if (crewNotes?.trim()) {
    const first = crewNotes.split(/[—–-]/)[0]?.trim();
    if (first) return polishCrewNoteJobLabel(first, contractTitle);
  }

  if (contractTitle?.trim()) {
    return polishContractTitle(contractTitle);
  }

  return "Grounds maintenance visit";
}

const SAMPLE_SITES = DEMO_SITES.map((s) => ({
  companyName: s.companyName,
  customerId: s.customerId,
  contractId: `crew-${s.crew}`,
  location: s.location,
  lat: s.lat,
  lng: s.lng,
  crew: s.crew,
  jobs: s.summerJobs,
  winterJobs: s.winterJobs,
}));

/** Canonical Oxford, MS site addresses keyed by customer id (shared manager + crew lead). */
export const OXFORD_CUSTOMER_ADDRESSES: Record<string, string> =
  Object.fromEntries(DEMO_SITES.map((s) => [s.customerId, s.location]));

export const OXFORD_CUSTOMER_COORDS: Record<
  string,
  { lat: number; lng: number }
> = Object.fromEntries(
  DEMO_SITES.map((s) => [s.customerId, { lat: s.lat, lng: s.lng }])
);

export function oxfordAddressForCustomer(
  customerId: string,
  fallback?: string | null
): string {
  if (OXFORD_CUSTOMER_ADDRESSES[customerId]) {
    return OXFORD_CUSTOMER_ADDRESSES[customerId];
  }
  if (!fallback) return "Oxford, MS";
  return fallback
    .replace(/Austin,\s*TX/gi, "Oxford, MS")
    .replace(/,\s*TX\b/gi, ", MS");
}

/** Demo crew lead assigned to a customer site (matches SCHEDULE_CREW). */
export function crewLeadNameForCustomer(
  customerName?: string | null
): string {
  const key = (customerName ?? "").trim().toLowerCase();
  if (key.includes("riverside")) return "Alex Rivera";
  if (key.includes("summit")) return "Taylor Brooks";
  if (key.includes("harbor")) return "Sam Ortiz";
  if (key.includes("metro")) return "Taylor Brooks";
  return "Alex Rivera";
}

/** Crew lead for a scheduled visit, falling back to customer assignment. */
export function crewLeadNameForVisit(
  visitId?: string | null,
  customerName?: string | null
): string {
  if (visitId) {
    const schedule = SCHEDULE_CREW[visitId];
    const lead = schedule?.crew.find((m) => /lead/i.test(m.role));
    if (lead?.name) return lead.name;
  }
  return crewLeadNameForCustomer(customerName);
}

const SAMPLE_CREWS: CrewMember[][] = [
  [
    { name: "Alex Rivera", role: "Crew lead", hours: 3, payRate: 28 },
    { name: "Jordan Lee", role: "Crew", hours: 3, payRate: 22 },
  ],
  [
    { name: "Taylor Brooks", role: "Crew lead", hours: 4, payRate: 30 },
    { name: "Morgan Diaz", role: "Crew", hours: 4, payRate: 22 },
    { name: "Riley Chen", role: "Crew", hours: 4, payRate: 22 },
  ],
  [
    { name: "Sam Ortiz", role: "Crew lead", hours: 2.5, payRate: 26 },
    { name: "Casey Ng", role: "Crew", hours: 2.5, payRate: 22 },
  ],
  [
    { name: "Taylor Brooks", role: "Crew lead", hours: 5, payRate: 30 },
    { name: "Jamie Park", role: "Crew", hours: 5, payRate: 22 },
    { name: "Morgan Diaz", role: "Crew", hours: 5, payRate: 22 },
  ],
];

/** Stable demo crew when a visit has no schedule overlay / assignment. */
export function demoCrewForSeed(seed: string): CrewMember[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const crew = SAMPLE_CREWS[hash % SAMPLE_CREWS.length] ?? SAMPLE_CREWS[0];
  return crew.map((member) => ({ ...member }));
}

/** Demo materials/equipment total when visit_costs are empty. */
export function demoJobCostTotal(crewPay: number, status: string) {
  if (crewPay <= 0) return 0;
  const factor = status === "completed" ? 1.15 : 0.85;
  return Math.round(crewPay * factor);
}

const WEATHER_ROTATION: Pick<
  WeatherOverlay,
  "label" | "detail" | "severity"
>[] = [
  {
    label: "Rain delay",
    detail: "Afternoon storms delayed fieldwork — make-up hours later in the week.",
    severity: "delayed",
  },
  {
    label: "Heat reschedule",
    detail: "Heat advisory moved crew to early morning (still ~40h week).",
    severity: "rescheduled",
  },
  {
    label: "Wind safety hold",
    detail: "High winds paused trimming — overtime week to catch variance.",
    severity: "delayed",
  },
  {
    label: "Storm cleanup",
    detail: "Crew cleared storm debris during the visit (busy-season OT).",
    severity: "completed_response",
  },
];

function shiftDateKey(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return formatDateKey(d);
}

/** Build weather overlay with plan dates and budget for a sample visit day. */
export function weatherOverlayForSample(
  visitId: string,
  dateStr: string,
  template: (typeof WEATHER_ROTATION)[number],
  crewPay: number,
  costTotal: number
): WeatherOverlay {
  const originalDate =
    template.severity === "rescheduled"
      ? shiftDateKey(dateStr, -2)
      : template.severity === "delayed"
        ? dateStr
        : shiftDateKey(dateStr, 0);
  const rescheduledDate =
    template.severity === "delayed" ? null : dateStr;
  // Storm / heat moves often burn overtime + extra materials vs the original plan.
  const overageFactor =
    template.severity === "completed_response"
      ? 0.72
      : template.severity === "rescheduled"
        ? 0.88
        : 1;
  const plannedCrewPay = Math.round(crewPay * overageFactor);
  const plannedCost = Math.round(costTotal * overageFactor);

  return {
    visitId,
    ...template,
    originalDate,
    rescheduledDate,
    plannedCrewPay,
    plannedCost,
  };
}

const PROOF_IMAGES = {
  before:
    "https://images.unsplash.com/photo-1558904541-efa843a96f01?w=600&h=400&fit=crop",
  after:
    "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&h=400&fit=crop",
  concern:
    "https://images.unsplash.com/photo-1466692476866-aef5c9b2e6d6?w=600&h=400&fit=crop",
};

function formatDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface DailySampleJob {
  visitId: string;
  companyName: string;
  location: string;
  jobLabel: string;
  date: string;
  status: "scheduled" | "completed";
  crew: CrewMember[];
  crewPay: number;
  costTotal: number;
  weather: WeatherOverlay | null;
  proof: ProofOverlay | null;
}

/**
 * Dense demo calendar: Apr 2024 → Nov 2026.
 * Mar–Nov = full crews; Dec–Feb = crew leads / year-round staff (leaf blow, shop).
 * Hours track ~40h weeks with occasional ~50h busy-season OT.
 */
export function generateDailySampleJobs(): DailySampleJob[] {
  const jobs: DailySampleJob[] = [];
  const start = new Date(2024, 3, 1); // Apr 1, 2024
  const end = new Date(2026, 10, 30); // Nov 30, 2026
  const [ty, tm, td] = DEMO_TODAY.split("-").map(Number);
  const today = new Date(ty, tm - 1, td);

  for (
    let cursor = new Date(start);
    cursor <= end;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    const dateStr = formatDateKey(cursor);
    const month = cursor.getMonth() + 1;
    const dow = cursor.getDay();
    const winter = isWinterMonth(month);
    const dayIndex = Math.floor(
      (cursor.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Winter: Tue/Thu only, one job; full season: weekdays, 1–3 jobs
    if (winter) {
      if (dow !== 2 && dow !== 4) continue;
    } else if (dow === 0 || dow === 6) {
      continue;
    }

    const jobsToday = winter ? 1 : dayIndex % 5 === 0 ? 3 : dayIndex % 3 === 0 ? 2 : 1;

    for (let slot = 0; slot < jobsToday; slot++) {
      const site = SAMPLE_SITES[(dayIndex + slot) % SAMPLE_SITES.length];
      const catalog = winter ? site.winterJobs : site.jobs;
      const jobLabel = catalog[(dayIndex + slot) % catalog.length];
      const crew = crewMembersFor(site.crew, dateStr);
      const visitId = `demo-day-${dateStr}-${slot}`;
      const isPast = cursor < today;
      const status: "scheduled" | "completed" = isPast ? "completed" : "scheduled";
      const pay = crewPayTotal(crew);
      const costTotal = demoJobCostTotal(pay, status);

      let weather: WeatherOverlay | null = null;
      if (!winter && dayIndex % 11 === 3 && slot === 0) {
        const template = WEATHER_ROTATION[dayIndex % WEATHER_ROTATION.length];
        weather = weatherOverlayForSample(
          visitId,
          dateStr,
          template,
          pay,
          costTotal
        );
      }

      let proof: ProofOverlay | null = null;
      if (status === "completed" && dayIndex % 5 === 0 && slot === 0) {
        proof = {
          visitId,
          arrival: "Crew arrival photo",
          before: `${jobLabel} before`,
          after: `${jobLabel} after`,
          submittedAt: `${dateStr}T16:00:00.000Z`,
          acknowledged: dayIndex % 10 === 0,
          beforeImage: PROOF_IMAGES.before,
          afterImage: PROOF_IMAGES.after,
          concernImage: dayIndex % 10 === 0 ? PROOF_IMAGES.concern : undefined,
          concernLabel:
            dayIndex % 10 === 0
              ? "Potential concern — dry edge near curb"
              : "Potential concern — none noted",
        };
      }

      jobs.push({
        visitId,
        companyName: site.companyName,
        location: site.location,
        jobLabel: winter
          ? `${jobLabel} (${crewLabel(site.crew)} winter)`
          : jobLabel,
        date: dateStr,
        status,
        crew,
        crewPay: pay,
        costTotal,
        weather,
        proof,
      });
    }
  }

  return jobs;
}
