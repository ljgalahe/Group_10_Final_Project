"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createDataClient } from "@/lib/auth-access";
import { getViewRole, roleCanManageCompanySchedule } from "@/lib/demo-role";
import { locationKey } from "@/lib/location-group";
import { DEMO_CREW_LEAD_NAME } from "@/lib/types";

export async function assignVisitCrewLead(formData: FormData): Promise<void> {
  const role = await getViewRole();
  if (!roleCanManageCompanySchedule(role)) {
    redirect("/dashboard");
  }

  const visitId = (formData.get("visit_id") as string) || "";
  const crewLead =
    ((formData.get("crew_lead_name") as string) || "").trim() ||
    DEMO_CREW_LEAD_NAME;
  const scheduledDate = (formData.get("scheduled_date") as string) || "";

  if (!visitId) redirect("/schedule");

  const supabase = await createDataClient();
  const patch: Record<string, unknown> = { crew_lead_name: crewLead };
  if (scheduledDate) patch.scheduled_date = scheduledDate;

  await supabase.from("service_visits").update(patch).eq("id", visitId);

  revalidatePath("/schedule");
  revalidatePath("/visits");
  redirect("/schedule?assigned=1");
}

export async function autoGroupVisitsByLocation(
  formData: FormData
): Promise<void> {
  const role = await getViewRole();
  if (!roleCanManageCompanySchedule(role)) {
    redirect("/dashboard");
  }

  const targetDate = (formData.get("target_date") as string) || "";
  const crewLead =
    ((formData.get("crew_lead_name") as string) || "").trim() ||
    DEMO_CREW_LEAD_NAME;

  if (!targetDate) redirect("/schedule?error=date");

  const supabase = await createDataClient();
  const { data: visits } = await supabase
    .from("service_visits")
    .select(
      "id, scheduled_date, status, crew_lead_name, contracts(customers(address))"
    )
    .eq("status", "scheduled")
    .order("scheduled_date", { ascending: true });

  const unassigned = (visits ?? []).filter((v) => !v.crew_lead_name);
  if (unassigned.length === 0) {
    redirect("/schedule?grouped=0");
  }

  // Pick the largest location cluster among unassigned, schedule them same day
  const buckets = new Map<string, typeof unassigned>();
  for (const v of unassigned) {
    const contract = Array.isArray(v.contracts) ? v.contracts[0] : v.contracts;
    const customers = contract?.customers;
    const customer = Array.isArray(customers) ? customers[0] : customers;
    const key = locationKey(customer?.address);
    const list = buckets.get(key) ?? [];
    list.push(v);
    buckets.set(key, list);
  }

  let best: typeof unassigned = [];
  for (const list of buckets.values()) {
    if (list.length > best.length) best = list;
  }

  for (const v of best) {
    await supabase
      .from("service_visits")
      .update({
        scheduled_date: targetDate,
        crew_lead_name: crewLead,
      })
      .eq("id", v.id);
  }

  revalidatePath("/schedule");
  revalidatePath("/visits");
  redirect(`/schedule?grouped=${best.length}`);
}

export async function createServiceVisit(formData: FormData): Promise<void> {
  const role = await getViewRole();
  if (!roleCanManageCompanySchedule(role)) {
    redirect("/dashboard");
  }

  const contractId = (formData.get("contract_id") as string) || "";
  const scheduledDate = (formData.get("scheduled_date") as string) || "";
  const crewLead =
    ((formData.get("crew_lead_name") as string) || "").trim() ||
    DEMO_CREW_LEAD_NAME;
  const visitKind = ((formData.get("visit_kind") as string) || "service").trim();

  if (!contractId || !scheduledDate) {
    redirect("/schedule?error=create");
  }

  const supabase = await createDataClient();
  await supabase.from("service_visits").insert({
    contract_id: contractId,
    scheduled_date: scheduledDate,
    status: "scheduled",
    visit_kind: visitKind === "survey" ? "survey" : "service",
    crew_lead_name: crewLead,
  });

  revalidatePath("/schedule");
  revalidatePath("/visits");
  redirect("/schedule?created=1");
}

/** Put a missed/cancelled/overdue visit back on the schedule. */
export async function rescheduleServiceVisit(formData: FormData): Promise<void> {
  const role = await getViewRole();
  if (!roleCanManageCompanySchedule(role)) {
    redirect("/dashboard");
  }

  const visitId = (formData.get("visit_id") as string) || "";
  const scheduledDate = (formData.get("scheduled_date") as string) || "";
  const crewLead =
    ((formData.get("crew_lead_name") as string) || "").trim() ||
    DEMO_CREW_LEAD_NAME;

  if (!visitId || !scheduledDate) {
    redirect("/schedule?error=reschedule");
  }

  const supabase = await createDataClient();
  await supabase
    .from("service_visits")
    .update({
      scheduled_date: scheduledDate,
      crew_lead_name: crewLead,
      status: "scheduled",
    })
    .eq("id", visitId);

  revalidatePath("/schedule");
  revalidatePath("/visits");
  redirect("/schedule?rescheduled=1");
}
