import { todayDateOnly } from "@/components/crew-lead/buildCrewSchedule";
import {
  fetchPendingContractApprovals,
  fetchQuoteRequests,
  fetchVisits,
} from "@/lib/queries";
import { countJobsNeedingReschedule } from "@/lib/needs-reschedule";
import type { VisitCost } from "@/lib/types";
import { buildJobRows } from "@/lib/visit-jobs";
import { defaultVisitPeriod } from "@/lib/visit-period";

const UPCOMING_LIMIT = 40;

export type OpsUpcomingVisitItem = {
  id: string;
  scheduledDate: string;
  customerName: string;
  contractTitle: string;
  address: string | null;
  crewLeadName: string | null;
  href: string;
};

export type OpsSurveyVisitItem = {
  id: string;
  scheduledDate: string;
  customerName: string;
  title: string;
  address: string | null;
  quoteId: string | null;
  href: string;
};

export type OperationsDashboardData = {
  today: string;
  openQuotesCount: number;
  pendingApprovalsCount: number;
  upcomingServiceVisits: OpsUpcomingVisitItem[];
  upcomingSurveyVisits: OpsSurveyVisitItem[];
  scheduledServiceCount: number;
  scheduledSurveyCount: number;
  /** Same JobRow / buildJobRows set and rule as Scheduling → Needs Rescheduling. */
  needsRescheduleCount: number;
};

type VisitRow = {
  id: string;
  scheduled_date: string;
  status: string;
  visit_kind?: string | null;
  crew_lead_name?: string | null;
  quote_id?: string | null;
  crew_notes?: string | null;
  contracts?: {
    title?: string;
    customers?:
      | { name?: string; address?: string | null }
      | { name?: string; address?: string | null }[]
      | null;
  } | null;
};

function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function isSurveyVisit(row: VisitRow): boolean {
  if (row.visit_kind === "survey") return true;
  if (row.quote_id && row.crew_lead_name === "Operations") return true;
  if (row.crew_notes && /ops site survey/i.test(row.crew_notes)) {
    return true;
  }
  return false;
}

export async function fetchOperationsDashboardData(): Promise<OperationsDashboardData> {
  const today = todayDateOnly();

  // Same visit source as Ops/Manager Visits (fetchVisits → buildJobRows).
  const [{ data: quotes }, { data: pending }, { data: visits }] =
    await Promise.all([
      fetchQuoteRequests(),
      fetchPendingContractApprovals(),
      fetchVisits(),
    ]);

  const openQuotesCount = (quotes ?? []).filter(
    (q) =>
      q.status === "new" ||
      q.status === "survey_scheduled" ||
      q.status === "budgeted"
  ).length;

  const emptyCosts = new Map<string, VisitCost[]>();
  const jobs = buildJobRows(visits, emptyCosts, defaultVisitPeriod());
  const needsRescheduleCount = countJobsNeedingReschedule(jobs, today);
  const scheduledJobs = jobs
    .filter((j) => j.status === "scheduled" && j.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  const visitById = new Map(
    (visits as VisitRow[]).map((v) => [v.id, v] as const)
  );

  const upcomingServiceVisits: OpsUpcomingVisitItem[] = [];
  const upcomingSurveyVisits: OpsSurveyVisitItem[] = [];
  let scheduledServiceCount = 0;
  let scheduledSurveyCount = 0;

  for (const job of scheduledJobs) {
    const row = visitById.get(job.visitId);
    const survey = row ? isSurveyVisit(row) : false;
    if (survey) {
      scheduledSurveyCount += 1;
      if (upcomingSurveyVisits.length >= UPCOMING_LIMIT) continue;
      const quoteId = row?.quote_id ?? null;
      upcomingSurveyVisits.push({
        id: job.visitId,
        scheduledDate: job.date,
        customerName: job.companyName,
        title: unwrapOne(row?.contracts)?.title ?? job.jobLabel,
        address: job.location || null,
        quoteId,
        href: quoteId ? `/quotes/${quoteId}` : "/quotes",
      });
    } else {
      scheduledServiceCount += 1;
      if (upcomingServiceVisits.length >= UPCOMING_LIMIT) continue;
      upcomingServiceVisits.push({
        id: job.visitId,
        scheduledDate: job.date,
        customerName: job.companyName,
        contractTitle: unwrapOne(row?.contracts)?.title ?? job.jobLabel,
        address: job.location || null,
        crewLeadName: row?.crew_lead_name ?? job.crew[0]?.name ?? null,
        href: "/visits",
      });
    }
  }

  // Catch DB survey rows that may not appear in the shared job fill.
  for (const row of visits as VisitRow[]) {
    if (row.status !== "scheduled" || row.scheduled_date.slice(0, 10) < today) {
      continue;
    }
    if (!isSurveyVisit(row)) continue;
    if (upcomingSurveyVisits.some((v) => v.id === row.id)) continue;
    if (!scheduledJobs.some((j) => j.visitId === row.id)) {
      scheduledSurveyCount += 1;
    }
    if (upcomingSurveyVisits.length >= UPCOMING_LIMIT) continue;
    const contract = unwrapOne(row.contracts);
    const customer = unwrapOne(contract?.customers);
    const quoteId = row.quote_id ?? null;
    upcomingSurveyVisits.push({
      id: row.id,
      scheduledDate: row.scheduled_date.slice(0, 10),
      customerName: customer?.name ?? "Prospect / customer",
      title: contract?.title ?? "Site survey",
      address: customer?.address ?? null,
      quoteId,
      href: quoteId ? `/quotes/${quoteId}` : "/quotes",
    });
  }

  return {
    today,
    openQuotesCount,
    pendingApprovalsCount: (pending ?? []).length,
    upcomingServiceVisits,
    upcomingSurveyVisits,
    scheduledServiceCount,
    scheduledSurveyCount,
    needsRescheduleCount,
  };
}
