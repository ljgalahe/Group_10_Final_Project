"use server";

import { revalidatePath } from "next/cache";
import {
  defaultAssignedEmployees,
  DEFAULT_DAILY_ROSTER,
} from "@/components/crew-lead/crewLeadStorage";
import { createDataClient } from "@/lib/auth-access";
import {
  buildLaborEntriesFromState,
  encodeLaborDescription,
  hourlyRateForRole,
  laborTotals,
  parseLaborDescription,
  type VisitLaborEntry,
} from "@/lib/crew-hours";
import { getViewRole, roleIsReadOnlyCrew } from "@/lib/demo-role";
import { DEMO_CREW_MEMBER } from "@/lib/types";

export type SyncVisitLaborInput = {
  visitId: string;
  status?: string;
  employees: { id: string; name: string; hours: number }[];
  assignedEmployees: { id: string; name: string; role: string }[];
  jobStartedAt?: string | null;
  jobEndedAt?: string | null;
};

function isMissingLaborTable(error: { message?: string; code?: string } | null) {
  if (!error) return false;
  const msg = (error.message || "").toLowerCase();
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    msg.includes("visit_labor_entries") ||
    msg.includes("does not exist") ||
    msg.includes("schema cache")
  );
}

async function upsertVisitCostLabor(
  visitId: string,
  entries: VisitLaborEntry[]
) {
  const supabase = await createDataClient();
  const totals = laborTotals(entries);
  const description = encodeLaborDescription(entries);

  const { data: existing } = await supabase
    .from("visit_costs")
    .select("id")
    .eq("visit_id", visitId)
    .eq("cost_type", "labor");

  if (existing && existing.length > 0) {
    const primaryId = existing[0].id;
    await supabase
      .from("visit_costs")
      .update({
        description,
        amount: totals.amount,
        quantity: totals.hours,
      })
      .eq("id", primaryId);

    const extras = existing.slice(1).map((row) => row.id);
    if (extras.length > 0) {
      await supabase.from("visit_costs").delete().in("id", extras);
    }
    return;
  }

  if (totals.hours <= 0) return;

  await supabase.from("visit_costs").insert({
    visit_id: visitId,
    cost_type: "labor",
    description,
    amount: totals.amount,
    quantity: totals.hours,
  });
}

async function upsertLaborEntries(entries: VisitLaborEntry[], visitId: string) {
  const supabase = await createDataClient();

  const { error: deleteError } = await supabase
    .from("visit_labor_entries")
    .delete()
    .eq("visit_id", visitId);

  if (deleteError && isMissingLaborTable(deleteError)) {
    return { tableAvailable: false as const };
  }

  if (entries.length === 0) {
    return { tableAvailable: !deleteError as boolean };
  }

  const { error: insertError } = await supabase.from("visit_labor_entries").insert(
    entries.map((entry) => ({
      visit_id: entry.visit_id,
      member_demo_id: entry.member_demo_id,
      member_name: entry.member_name,
      member_role: entry.member_role,
      hours: entry.hours,
      hourly_rate: entry.hourly_rate,
      started_at: entry.started_at ?? null,
      ended_at: entry.ended_at ?? null,
      updated_at: new Date().toISOString(),
    }))
  );

  if (insertError && isMissingLaborTable(insertError)) {
    return { tableAvailable: false as const };
  }

  return { tableAvailable: !insertError as boolean, error: insertError };
}

/**
 * Sync crew-lead logged hours into visit_labor_entries (when available)
 * and visit_costs labor quantity/amount for accountant billing.
 * Crew members cannot write via this path (use syncMemberSelfClockLabor).
 */
export async function syncVisitLabor(
  input: SyncVisitLaborInput
): Promise<{ ok: boolean; error?: string }> {
  const role = await getViewRole();
  if (roleIsReadOnlyCrew(role) || role === "customer") {
    return { ok: false, error: "read_only" };
  }

  if (!input.visitId) {
    return { ok: false, error: "missing_visit" };
  }

  const entries = buildLaborEntriesFromState(
    input.visitId,
    {
      employees: input.employees,
      assignedEmployees: input.assignedEmployees,
      jobStartedAt: input.jobStartedAt ?? null,
      jobEndedAt: input.jobEndedAt ?? null,
    },
    input.status
  ).filter((entry) => entry.hours > 0);

  await upsertLaborEntries(entries, input.visitId);
  await upsertVisitCostLabor(input.visitId, entries);

  revalidatePath("/visits");
  revalidatePath("/dashboard");
  revalidatePath("/schedule");
  revalidatePath("/contracts");
  revalidatePath("/reports/profitability");

  return { ok: true };
}

export type SyncMemberSelfClockInput = {
  visitId: string;
  memberId: string;
  memberName: string;
  memberRole: string;
  hours: number;
  startedAt?: string | null;
  endedAt?: string | null;
};

async function loadExistingLaborEntries(
  visitId: string
): Promise<VisitLaborEntry[]> {
  const supabase = await createDataClient();

  const { data, error } = await supabase
    .from("visit_labor_entries")
    .select(
      "visit_id, member_demo_id, member_name, member_role, hours, hourly_rate, started_at, ended_at"
    )
    .eq("visit_id", visitId);

  if (!error && data) {
    return data.map((row) => ({
      visit_id: row.visit_id,
      member_demo_id: row.member_demo_id,
      member_name: row.member_name,
      member_role: row.member_role,
      hours: Number(row.hours) || 0,
      hourly_rate: Number(row.hourly_rate) || hourlyRateForRole(row.member_role),
      started_at: row.started_at ?? null,
      ended_at: row.ended_at ?? null,
    }));
  }

  if (error && !isMissingLaborTable(error)) {
    return [];
  }

  const { data: cost } = await supabase
    .from("visit_costs")
    .select("description")
    .eq("visit_id", visitId)
    .eq("cost_type", "labor")
    .maybeSingle();

  return parseLaborDescription(visitId, cost?.description) ?? [];
}

/**
 * Crew-member write exception (like time-off): sync only the logged-in
 * demo member's own clocked hours into labor / billing. Other members'
 * existing rows are preserved.
 */
export async function syncMemberSelfClockLabor(
  input: SyncMemberSelfClockInput
): Promise<{ ok: boolean; error?: string }> {
  const role = await getViewRole();
  if (role === "customer") {
    return { ok: false, error: "read_only" };
  }

  if (role === "crew_member") {
    if (input.memberId !== DEMO_CREW_MEMBER.id) {
      return { ok: false, error: "self_only" };
    }
  } else if (roleIsReadOnlyCrew(role)) {
    return { ok: false, error: "read_only" };
  }

  if (!input.visitId) {
    return { ok: false, error: "missing_visit" };
  }

  const hours = Number(input.hours);
  if (Number.isNaN(hours) || hours < 0) {
    return { ok: false, error: "invalid_hours" };
  }

  const existing = await loadExistingLaborEntries(input.visitId);
  const others = existing.filter(
    (entry) => entry.member_demo_id !== input.memberId
  );

  const selfEntry: VisitLaborEntry = {
    visit_id: input.visitId,
    member_demo_id: input.memberId,
    member_name: input.memberName,
    member_role: input.memberRole || "Crew Member",
    hours: Number(hours.toFixed(2)),
    hourly_rate: hourlyRateForRole(input.memberRole || "Crew Member"),
    started_at: input.startedAt ?? null,
    ended_at: input.endedAt ?? null,
  };

  const merged =
    hours > 0 ? [...others, selfEntry] : others.filter((e) => e.hours > 0);

  await upsertLaborEntries(
    merged.filter((entry) => entry.hours > 0),
    input.visitId
  );
  await upsertVisitCostLabor(
    input.visitId,
    merged.filter((entry) => entry.hours > 0)
  );

  revalidatePath("/visits");
  revalidatePath("/dashboard");
  revalidatePath("/schedule");
  revalidatePath("/contracts");
  revalidatePath("/reports/profitability");

  return { ok: true };
}

/**
 * Ensure completed visits have per-person labor synced for accountant hourly billing.
 * Uses the same deterministic completed-hours model as VisitWorkPanel.
 * Skips visits that already have LABOR_V1 visit_costs or labor entries.
 */
export async function ensureCompletedVisitLaborSynced(
  visitIds: string[]
): Promise<{ synced: number }> {
  const role = await getViewRole();
  if (roleIsReadOnlyCrew(role) || role === "customer") {
    return { synced: 0 };
  }

  const ids = [...new Set(visitIds.filter(Boolean))];
  if (ids.length === 0) return { synced: 0 };

  const supabase = await createDataClient();
  const [{ data: visits }, { data: costs }, laborResult] = await Promise.all([
    supabase
      .from("service_visits")
      .select("id, status")
      .in("id", ids)
      .eq("status", "completed"),
    supabase
      .from("visit_costs")
      .select("visit_id, cost_type, description, quantity")
      .in("visit_id", ids)
      .eq("cost_type", "labor"),
    (async () => {
      const { data, error } = await supabase
        .from("visit_labor_entries")
        .select("visit_id")
        .in("visit_id", ids);
      if (error && isMissingLaborTable(error)) {
        return { data: [] as Array<{ visit_id: string }> };
      }
      return { data: data ?? [] };
    })(),
  ]);

  const costsByVisit = new Map(
    (costs ?? []).map((row) => [row.visit_id, row] as const)
  );
  const laborVisitIds = new Set((laborResult.data ?? []).map((row) => row.visit_id));
  let synced = 0;

  for (const visit of visits ?? []) {
    const cost = costsByVisit.get(visit.id);
    const hasEncoded =
      typeof cost?.description === "string" &&
      cost.description.startsWith("LABOR_V1|");
    if (hasEncoded || laborVisitIds.has(visit.id)) continue;

    const assigned = defaultAssignedEmployees(visit.id, DEFAULT_DAILY_ROSTER);
    const quantity =
      cost?.quantity != null && Number(cost.quantity) > 0
        ? Number(cost.quantity)
        : null;
    const employees =
      quantity != null && assigned.length > 0
        ? assigned.map((member) => ({
            id: member.id,
            name: member.name,
            hours: Number((quantity / assigned.length).toFixed(2)),
          }))
        : [];

    const entries = buildLaborEntriesFromState(
      visit.id,
      {
        employees,
        assignedEmployees: assigned,
        jobStartedAt: null,
        jobEndedAt: null,
      },
      "completed"
    ).filter((entry) => entry.hours > 0);

    await upsertLaborEntries(entries, visit.id);
    await upsertVisitCostLabor(visit.id, entries);
    synced += 1;
  }

  // Callers that sync during page render already refetch when synced > 0.
  // Avoid revalidatePath fan-out here — it retriggers heavy RSC routes while
  // the visits page is still loading.

  return { synced };
}
