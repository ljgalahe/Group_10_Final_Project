import { formatCurrency } from "@/lib/format";
import {
  PROOF_PACKAGES,
  SCHEDULE_CREW,
  WEATHER_EVENTS,
  crewPayTotal,
  demoCrewForSeed,
  demoJobCostTotal,
  generateDailySampleJobs,
  inferJobLabel,
  oxfordAddressForCustomer,
  type CrewMember,
  type ProofOverlay,
  type WeatherOverlay,
} from "@/lib/visit-demo";
import { dateInPeriod, type VisitPeriod } from "@/lib/visit-period";
import type { ServiceVisit, VisitCost } from "@/lib/types";

export interface JobRow {
  visitId: string;
  companyName: string;
  location: string;
  jobLabel: string;
  date: string;
  status: string;
  crew: CrewMember[];
  crewPay: number;
  costTotal: number;
  weather: WeatherOverlay | null;
  proof: ProofOverlay | null;
}

type VisitRow = ServiceVisit & {
  contracts?: {
    title?: string;
    customer_id?: string;
    customers?: {
      name?: string;
      property_type?: string;
      address?: string;
    } | null;
  } | null;
};

export function buildJobRows(
  visits: VisitRow[],
  costsByVisit: Map<string, VisitCost[]>,
  period: VisitPeriod
): JobRow[] {
  const fromDb: JobRow[] = visits
    .filter((v) => dateInPeriod(v.scheduled_date, period))
    .map((visit) => {
      const customer = visit.contracts?.customers;
      const companyName =
        customer?.name ?? visit.contracts?.title ?? "Unknown company";
      const customerId = visit.contracts?.customer_id ?? "";
      const location = oxfordAddressForCustomer(
        customerId,
        customer?.address ??
          customer?.property_type ??
          visit.contracts?.title ??
          "Oxford, MS"
      );
      const schedule = SCHEDULE_CREW[visit.id];
      const crew = schedule?.crew?.length
        ? schedule.crew
        : demoCrewForSeed(visit.id);
      const costs = costsByVisit.get(visit.id) ?? [];
      const recordedCosts = costs.reduce((s, c) => s + Number(c.amount), 0);
      const crewPay = crewPayTotal(crew);
      const costTotal =
        recordedCosts > 0
          ? recordedCosts
          : demoJobCostTotal(crewPay, visit.status);

      return {
        visitId: visit.id,
        companyName,
        location,
        jobLabel: inferJobLabel(
          visit.id,
          visit.crew_notes,
          visit.contracts?.title
        ),
        date: visit.scheduled_date,
        status: visit.status,
        crew,
        crewPay,
        costTotal,
        weather: WEATHER_EVENTS.find((w) => w.visitId === visit.id) ?? null,
        proof: PROOF_PACKAGES.find((p) => p.visitId === visit.id) ?? null,
      };
    });

  // Dense sample fill: every day June–August 2026 (filtered to selected period).
  // Skip a generated row when DB already has the same company on that date.
  const dbKeys = new Set(fromDb.map((j) => `${j.date}::${j.companyName}`));
  const generated = generateDailySampleJobs()
    .filter((j) => dateInPeriod(j.date, period))
    .filter((j) => !dbKeys.has(`${j.date}::${j.companyName}`))
    .map((j) => ({ ...j } satisfies JobRow));

  return [...fromDb, ...generated].sort((a, b) => a.date.localeCompare(b.date));
}

export function groupJobsByCompany(jobs: JobRow[]) {
  const map = new Map<string, JobRow[]>();
  for (const job of jobs) {
    const list = map.get(job.companyName) ?? [];
    list.push(job);
    map.set(job.companyName, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([title, list]) => [
      title,
      [...list].sort((a, b) => a.date.localeCompare(b.date)),
    ] as [string, JobRow[]]);
}

export function groupJobsByTask(jobs: JobRow[]) {
  const map = new Map<string, JobRow[]>();
  for (const job of jobs) {
    const list = map.get(job.jobLabel) ?? [];
    list.push(job);
    map.set(job.jobLabel, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([title, list]) => [
      title,
      [...list].sort((a, b) => a.date.localeCompare(b.date)),
    ] as [string, JobRow[]]);
}

export function groupJobsByDate(jobs: JobRow[]) {
  const map = new Map<string, JobRow[]>();
  for (const job of jobs) {
    const list = map.get(job.date) ?? [];
    list.push(job);
    map.set(job.date, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([title, list]) => [
      title,
      [...list].sort((a, b) => a.companyName.localeCompare(b.companyName)),
    ] as [string, JobRow[]]);
}

export function groupCompletedJobs(
  jobs: JobRow[],
  sortBy: "date" | "company" | "job"
): [string, JobRow[]][] {
  if (sortBy === "date") return groupJobsByDate(jobs);
  if (sortBy === "job") return groupJobsByTask(jobs);
  return groupJobsByCompany(jobs);
}

export function summaryFromJobs(jobs: JobRow[]) {
  const scheduled = jobs.filter((j) => j.status === "scheduled");
  const completed = jobs.filter((j) => j.status === "completed");
  const weatherAffected = jobs.filter((j) => j.weather);
  const proofs = jobs.filter((j) => j.proof);
  const schedulePay = scheduled.reduce((s, j) => s + j.crewPay, 0);
  const completedPay = completed.reduce((s, j) => s + j.crewPay, 0);

  return {
    scheduledCount: scheduled.length,
    completedCount: completed.length,
    weatherCount: weatherAffected.length,
    proofCount: proofs.length,
    schedulePay,
    completedPay,
    scheduled,
    completed,
    weatherAffected,
    proofs,
    totalJobs: jobs.length,
    formatPay: formatCurrency,
  };
}
