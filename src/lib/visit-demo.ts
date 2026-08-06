/** Demo overlays for schedule/crew/weather/proof — keyed to seed visit IDs. */

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

export const SCHEDULE_CREW: Record<string, ScheduleOverlay> = {
  [SEED_VISIT.riverside1]: {
    visitId: SEED_VISIT.riverside1,
    jobLabel: "Mowing & edging",
    crew: [
      { name: "Alex Rivera", role: "Crew lead", hours: 3, payRate: 28 },
      { name: "Jordan Lee", role: "Crew", hours: 3, payRate: 22 },
    ],
  },
  [SEED_VISIT.riverside2]: {
    visitId: SEED_VISIT.riverside2,
    jobLabel: "Hedge trimming",
    crew: [
      { name: "Alex Rivera", role: "Crew lead", hours: 2.5, payRate: 28 },
      { name: "Sam Ortiz", role: "Crew", hours: 2.5, payRate: 22 },
    ],
  },
  [SEED_VISIT.riversideSched]: {
    visitId: SEED_VISIT.riversideSched,
    jobLabel: "Weekly grounds",
    crew: [
      { name: "Alex Rivera", role: "Crew lead", hours: 3, payRate: 28 },
      { name: "Jordan Lee", role: "Crew", hours: 3, payRate: 22 },
      { name: "Casey Ng", role: "Crew", hours: 3, payRate: 22 },
    ],
  },
  [SEED_VISIT.summit1]: {
    visitId: SEED_VISIT.summit1,
    jobLabel: "Retail frontage mow",
    crew: [
      { name: "Taylor Brooks", role: "Crew lead", hours: 4, payRate: 30 },
      { name: "Morgan Diaz", role: "Crew", hours: 4, payRate: 22 },
      { name: "Riley Chen", role: "Crew", hours: 4, payRate: 22 },
    ],
  },
  [SEED_VISIT.metro1]: {
    visitId: SEED_VISIT.metro1,
    jobLabel: "Pond & industrial grounds",
    crew: [
      { name: "Taylor Brooks", role: "Crew lead", hours: 5, payRate: 30 },
      { name: "Morgan Diaz", role: "Crew", hours: 5, payRate: 22 },
      { name: "Riley Chen", role: "Crew", hours: 5, payRate: 22 },
      { name: "Jamie Park", role: "Crew", hours: 5, payRate: 22 },
    ],
  },
  [SEED_VISIT.harborSched]: {
    visitId: SEED_VISIT.harborSched,
    jobLabel: "HOA common areas",
    crew: [
      { name: "Sam Ortiz", role: "Crew lead", hours: 2, payRate: 26 },
      { name: "Casey Ng", role: "Crew", hours: 2, payRate: 22 },
    ],
  },
  [SEED_VISIT.summitSched]: {
    visitId: SEED_VISIT.summitSched,
    jobLabel: "Retail maintenance",
    crew: [
      { name: "Taylor Brooks", role: "Crew lead", hours: 3, payRate: 30 },
      { name: "Jordan Lee", role: "Crew", hours: 3, payRate: 22 },
    ],
  },
};

export const WEATHER_EVENTS: WeatherOverlay[] = [
  {
    visitId: SEED_VISIT.riversideWeatherReschedule,
    label: "Storm reschedule",
    detail:
      "Severe thunderstorms and lightning safety moved Riverside weekly grounds; now first on the open schedule.",
    severity: "rescheduled",
  },
  {
    visitId: SEED_VISIT.riversideSched,
    label: "Rain delay",
    detail: "Thunderstorms postponed Riverside weekly grounds.",
    severity: "delayed",
  },
  {
    visitId: SEED_VISIT.harborSched,
    label: "Heat reschedule",
    detail: "Heat advisory moved Harbor View to an early slot.",
    severity: "rescheduled",
  },
  {
    visitId: SEED_VISIT.summitSched,
    label: "Wind safety hold",
    detail: "High winds paused Summit edging — still outstanding.",
    severity: "delayed",
  },
  {
    visitId: SEED_VISIT.summit1,
    label: "Storm cleanup",
    detail: "Post-storm debris cleared during Summit visit.",
    severity: "completed_response",
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

export function inferJobLabel(
  visitId: string,
  crewNotes: string | null
): string {
  const schedule = SCHEDULE_CREW[visitId];
  if (schedule?.jobLabel) return schedule.jobLabel;
  if (crewNotes?.trim()) {
    const first = crewNotes.split(/[—-]/)[0]?.trim();
    if (first) return first;
  }
  return "Service visit";
}

const SAMPLE_SITES = [
  {
    companyName: "Riverside Office Park",
    customerId: "11111111-1111-1111-1111-111111111101",
    contractId: "22222222-2222-2222-2222-222222222201",
    location: "1200 University Ave, Oxford, MS",
    lat: 34.3702,
    lng: -89.5251,
    jobs: ["Mowing & edging", "Hedge trimming", "Weekly grounds", "Bed cleanup"],
  },
  {
    companyName: "Summit Retail Center",
    customerId: "11111111-1111-1111-1111-111111111102",
    contractId: "22222222-2222-2222-2222-222222222202",
    location: "450 Jackson Ave W, Oxford, MS",
    lat: 34.3624,
    lng: -89.5128,
    jobs: ["Retail frontage mow", "Fertilization", "Retail maintenance", "Edging pass"],
  },
  {
    companyName: "Harbor View HOA",
    customerId: "11111111-1111-1111-1111-111111111103",
    contractId: "22222222-2222-2222-2222-222222222203",
    location: "88 South Lamar Blvd, Oxford, MS",
    lat: 34.3756,
    lng: -89.5084,
    jobs: ["HOA common areas", "Entrance beds", "Bed weeding", "Leaf cleanup"],
  },
  {
    companyName: "Metro Industrial Complex",
    customerId: "11111111-1111-1111-1111-111111111104",
    contractId: "22222222-2222-2222-2222-222222222204",
    location: "900 Molly Barr Rd, Oxford, MS",
    lat: 34.3558,
    lng: -89.5302,
    jobs: [
      "Pond & industrial grounds",
      "Lot perimeter mow",
      "Detention pond check",
      "Fence-line trim",
    ],
  },
] as const;

/** Canonical Oxford, MS site addresses keyed by customer id (shared manager + crew lead). */
export const OXFORD_CUSTOMER_ADDRESSES: Record<string, string> = Object.fromEntries(
  SAMPLE_SITES.map((s) => [s.customerId, s.location])
);

export const OXFORD_CUSTOMER_COORDS: Record<string, { lat: number; lng: number }> =
  Object.fromEntries(SAMPLE_SITES.map((s) => [s.customerId, { lat: s.lat, lng: s.lng }]));

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

const WEATHER_ROTATION: Omit<WeatherOverlay, "visitId">[] = [
  {
    label: "Rain delay",
    detail: "Afternoon storms delayed fieldwork.",
    severity: "delayed",
  },
  {
    label: "Heat reschedule",
    detail: "Heat advisory moved crew to early morning.",
    severity: "rescheduled",
  },
  {
    label: "Wind safety hold",
    detail: "High winds paused trimming work.",
    severity: "delayed",
  },
  {
    label: "Storm cleanup",
    detail: "Crew cleared storm debris during the visit.",
    severity: "completed_response",
  },
];

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

/** Dense demo jobs: at least one job every day from June–August 2026. */
export function generateDailySampleJobs(): DailySampleJob[] {
  const jobs: DailySampleJob[] = [];
  const start = new Date(2026, 5, 1); // June 1
  const end = new Date(2026, 7, 31); // August 31
  const today = new Date(2026, 7, 4); // demo "today" for completed vs pending

  for (
    let cursor = new Date(start);
    cursor <= end;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    const dateStr = formatDateKey(cursor);
    const dayIndex =
      Math.floor((cursor.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const jobsToday = dayIndex % 5 === 0 ? 2 : 1;

    for (let slot = 0; slot < jobsToday; slot++) {
      const site = SAMPLE_SITES[(dayIndex + slot) % SAMPLE_SITES.length];
      const jobLabel = site.jobs[(dayIndex + slot) % site.jobs.length];
      const crew = SAMPLE_CREWS[(dayIndex + slot) % SAMPLE_CREWS.length];
      const visitId = `demo-day-${dateStr}-${slot}`;
      const isPast = cursor < today;
      const status: "scheduled" | "completed" = isPast ? "completed" : "scheduled";
      const pay = crewPayTotal(crew);
      const costTotal = Math.round(pay * (status === "completed" ? 1.15 : 0));

      let weather: WeatherOverlay | null = null;
      if (dayIndex % 7 === 3 && slot === 0) {
        const template = WEATHER_ROTATION[dayIndex % WEATHER_ROTATION.length];
        weather = { visitId, ...template };
      }

      let proof: ProofOverlay | null = null;
      if (status === "completed" && dayIndex % 3 === 0 && slot === 0) {
        proof = {
          visitId,
          arrival: "Crew arrival photo",
          before: `${jobLabel} before`,
          after: `${jobLabel} after`,
          submittedAt: `${dateStr}T16:00:00.000Z`,
          acknowledged: dayIndex % 6 === 0,
          beforeImage: PROOF_IMAGES.before,
          afterImage: PROOF_IMAGES.after,
          concernImage: dayIndex % 6 === 0 ? PROOF_IMAGES.concern : undefined,
          concernLabel:
            dayIndex % 6 === 0
              ? "Potential concern — dry edge near curb"
              : "Potential concern — none noted",
        };
      }

      jobs.push({
        visitId,
        companyName: site.companyName,
        location: site.location,
        jobLabel,
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

