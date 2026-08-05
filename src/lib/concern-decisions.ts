import { PROOF_PACKAGES, SCHEDULE_CREW } from "@/lib/visit-demo";
import { crewLeadPersonId, personByName } from "@/lib/chat-demo";

export type ConcernDecision = "open" | "approved" | "on_hold";

export type FieldConcernRecord = {
  visitId: string;
  companyName: string;
  jobLabel: string;
  location: string;
  date: string;
  concernLabel: string;
  concernImage?: string;
  submittedAt?: string;
  crewLeadName?: string;
  crewLeadId?: string;
};

const DECISIONS_KEY = "greenscape-field-concern-decisions";
const CONCERNS_KEY = "greenscape-field-concerns";

const SEED_SITE_BY_VISIT: Record<
  string,
  { companyName: string; location: string; date: string }
> = {
  "33333333-3333-3333-3333-333333333301": {
    companyName: "Riverside Office Park",
    location: "1200 University Ave, Oxford, MS",
    date: "2026-06-02",
  },
  "33333333-3333-3333-3333-333333333304": {
    companyName: "Summit Retail Center",
    location: "4500 Jackson Ave W, Oxford, MS",
    date: "2026-06-03",
  },
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadConcernDecisions(): Record<string, ConcernDecision> {
  return readJson<Record<string, ConcernDecision>>(DECISIONS_KEY, {});
}

export function saveConcernDecision(
  visitId: string,
  decision: ConcernDecision
) {
  if (typeof window === "undefined") return;
  const next = { ...loadConcernDecisions(), [visitId]: decision };
  window.localStorage.setItem(DECISIONS_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("greenscape-concerns-updated"));
}

export function getConcernDecision(visitId: string): ConcernDecision {
  return loadConcernDecisions()[visitId] ?? "open";
}

export function isActiveFieldConcern(label?: string, image?: string): boolean {
  if (!image) return false;
  const text = (label ?? "").toLowerCase();
  if (!text) return true;
  return !text.includes("none noted");
}

export function syncFieldConcerns(records: FieldConcernRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONCERNS_KEY, JSON.stringify(records));
}

function seedFieldConcerns(): FieldConcernRecord[] {
  return PROOF_PACKAGES.filter((proof) =>
    isActiveFieldConcern(proof.concernLabel, proof.concernImage)
  ).map((proof) => {
    const site = SEED_SITE_BY_VISIT[proof.visitId];
    const schedule = SCHEDULE_CREW[proof.visitId];
    const lead =
      schedule?.crew.find((m) => /lead/i.test(m.role)) ?? schedule?.crew[0];
    const crewLeadName = lead?.name;
    const crewLeadId = crewLeadName
      ? personByName(crewLeadName)?.id ?? crewLeadPersonId(crewLeadName)
      : undefined;
    return {
      visitId: proof.visitId,
      companyName: site?.companyName ?? "Customer site",
      jobLabel: schedule?.jobLabel ?? "Service visit",
      location: site?.location ?? "Oxford, MS",
      date: site?.date ?? proof.submittedAt.slice(0, 10),
      concernLabel: proof.concernLabel ?? "Potential concern noted",
      concernImage: proof.concernImage,
      submittedAt: proof.submittedAt,
      crewLeadName,
      crewLeadId,
    };
  });
}

export function loadFieldConcerns(): FieldConcernRecord[] {
  const stored = readJson<FieldConcernRecord[]>(CONCERNS_KEY, []);
  const seed = seedFieldConcerns();
  if (stored.length === 0) return seed;

  const seedByVisit = new Map(seed.map((c) => [c.visitId, c]));
  return stored.map((concern) => {
    if (concern.crewLeadName && concern.crewLeadId) return concern;
    const fromSeed = seedByVisit.get(concern.visitId);
    return {
      ...concern,
      crewLeadName: concern.crewLeadName ?? fromSeed?.crewLeadName,
      crewLeadId: concern.crewLeadId ?? fromSeed?.crewLeadId,
    };
  });
}

export function decisionLabel(decision: ConcernDecision): string {
  if (decision === "approved") return "Approved to proceed";
  if (decision === "on_hold") return "On hold";
  return "Needs review";
}
