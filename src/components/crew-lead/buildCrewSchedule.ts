import type { ScheduleJob } from "@/components/crew-lead/schedule-types";
import { customerNotesForCrew } from "@/lib/customer-notes";
import {
  OXFORD_CUSTOMER_COORDS,
  generateDailySampleJobs,
  oxfordAddressForCustomer,
} from "@/lib/visit-demo";

export { oxfordAddressForCustomer };

/** Approximate Oxford, Mississippi coordinates for demo customer sites */
const CUSTOMER_COORDS = OXFORD_CUSTOMER_COORDS;

type CustomerInfo = {
  id: string;
  name: string;
  address: string | null;
  customer_notes?: string | null;
};

type ContractRow = {
  id: string;
  title: string;
  status: string;
  visits_per_week: number | null;
  season_start: string;
  season_end: string;
  customer_id: string;
  customers: CustomerInfo | CustomerInfo[] | null;
  contract_services:
    | { service_name: string; included: boolean }[]
    | null;
};

type VisitRow = {
  id: string;
  scheduled_date: string;
  status: string;
  contract_id: string;
  contracts:
    | {
        id: string;
        title: string;
        customer_id: string;
        customers: CustomerInfo | CustomerInfo[] | null;
        contract_services:
          | { service_name: string; included: boolean }[]
          | null;
      }
    | {
        id: string;
        title: string;
        customer_id: string;
        customers: CustomerInfo | CustomerInfo[] | null;
        contract_services:
          | { service_name: string; included: boolean }[]
          | null;
      }[]
    | null;
};

function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function coordsFor(customerId: string, index: number) {
  return (
    CUSTOMER_COORDS[customerId] ?? {
      lat: 34.3665 + index * 0.008,
      lng: -89.5192 - index * 0.006,
    }
  );
}

function sampleJobsAsScheduleJobs(existing: ScheduleJob[]): ScheduleJob[] {
  const seen = new Set(
    existing.map((j) => `${j.scheduledDate}::${j.customerName}`)
  );
  const siteByCompany = new Map(
    [
      {
        companyName: "Riverside Office Park",
        customerId: "11111111-1111-1111-1111-111111111101",
        contractId: "22222222-2222-2222-2222-222222222201",
      },
      {
        companyName: "Summit Retail Center",
        customerId: "11111111-1111-1111-1111-111111111102",
        contractId: "22222222-2222-2222-2222-222222222202",
      },
      {
        companyName: "Harbor View HOA",
        customerId: "11111111-1111-1111-1111-111111111103",
        contractId: "22222222-2222-2222-2222-222222222203",
      },
      {
        companyName: "Metro Industrial Complex",
        customerId: "11111111-1111-1111-1111-111111111104",
        contractId: "22222222-2222-2222-2222-222222222204",
      },
    ].map((s) => [s.companyName, s] as const)
  );

  return generateDailySampleJobs()
    .filter((j) => !seen.has(`${j.date}::${j.companyName}`))
    .map((j) => {
      const site = siteByCompany.get(j.companyName);
      const customerId =
        site?.customerId ?? "11111111-1111-1111-1111-111111111101";
      const coords = coordsFor(customerId, 0);
      return {
        id: j.visitId,
        contractId:
          site?.contractId ?? "22222222-2222-2222-2222-222222222201",
        scheduledDate: j.date,
        status: j.status,
        customerId,
        customerName: j.companyName,
        customerIdShort: customerId.slice(-4),
        address: j.location,
        contractTitle: j.jobLabel,
        services: [j.jobLabel],
        customerNotes: customerNotesForCrew(null),
        lat: coords.lat,
        lng: coords.lng,
        source: "projected" as const,
      };
    });
}

/** Title-case and dedupe service names (fixes Bed Weeding / Bed weeding). */
export function normalizeServiceName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function servicesFrom(
  rows: { service_name: string; included: boolean }[] | null | undefined
): string[] {
  const map = new Map<string, string>();
  for (const row of rows ?? []) {
    if (!row.included) continue;
    const normalized = normalizeServiceName(row.service_name);
    map.set(normalized.toLowerCase(), normalized);
  }
  return Array.from(map.values());
}

export function buildCrewSchedule(
  contracts: ContractRow[],
  visits: VisitRow[],
  today = new Date()
): ScheduleJob[] {
  const start = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  const end = addDays(start, 90);
  const jobs: ScheduleJob[] = [];
  const seen = new Set<string>();

  visits.forEach((visit, index) => {
    const contract = unwrapOne(visit.contracts);
    const customer = unwrapOne(contract?.customers);
    if (!contract || !customer) return;

    const date = visit.scheduled_date.slice(0, 10);
    if (date < toDateOnly(start) || date > toDateOnly(end)) return;

    const key = `${contract.id}:${date}`;
    seen.add(key);
    const coords = coordsFor(customer.id, index);

    jobs.push({
      id: visit.id,
      contractId: contract.id,
      scheduledDate: date,
      status: visit.status,
      customerId: customer.id,
      customerName: customer.name,
      customerIdShort: customer.id.slice(-4),
      address: oxfordAddressForCustomer(customer.id, customer.address),
      contractTitle: contract.title,
      services: servicesFrom(contract.contract_services),
      customerNotes: customerNotesForCrew(customer.customer_notes),
      lat: coords.lat,
      lng: coords.lng,
      source: "visit",
    });
  });

  contracts
    .filter((c) => c.status === "active")
    .forEach((contract, contractIndex) => {
      const customer = unwrapOne(contract.customers);
      if (!customer) return;

      const perWeek = Math.max(1, contract.visits_per_week ?? 1);
      const intervalDays = Math.max(1, Math.round(7 / perWeek));
      const services = servicesFrom(contract.contract_services);
      const coords = coordsFor(customer.id, contractIndex);
      const notes = customerNotesForCrew(customer.customer_notes);

      let cursor = new Date(start);
      const seasonStart = contract.season_start?.slice(0, 10);
      const seasonEnd = contract.season_end?.slice(0, 10);

      const offset = contractIndex % intervalDays;
      cursor = addDays(cursor, offset);

      while (cursor <= end) {
        const date = toDateOnly(cursor);
        if (
          (!seasonStart || date >= seasonStart) &&
          (!seasonEnd || date <= seasonEnd)
        ) {
          const key = `${contract.id}:${date}`;
          if (!seen.has(key)) {
            seen.add(key);
            jobs.push({
              id: `projected-${contract.id}-${date}`,
              contractId: contract.id,
              scheduledDate: date,
              status: "scheduled",
              customerId: customer.id,
              customerName: customer.name,
              customerIdShort: customer.id.slice(-4),
              address: oxfordAddressForCustomer(customer.id, customer.address),
              contractTitle: contract.title,
              services,
              customerNotes: notes,
              lat: coords.lat,
              lng: coords.lng,
              source: "projected",
            });
          }
        }
        cursor = addDays(cursor, intervalDays);
      }
    });

  const withSamples = [...jobs, ...sampleJobsAsScheduleJobs(jobs)];

  return withSamples.sort((a, b) =>
    a.scheduledDate === b.scheduledDate
      ? a.customerName.localeCompare(b.customerName)
      : a.scheduledDate.localeCompare(b.scheduledDate)
  );
}

export function todayDateOnly(today = new Date()): string {
  return toDateOnly(
    new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
    )
  );
}
