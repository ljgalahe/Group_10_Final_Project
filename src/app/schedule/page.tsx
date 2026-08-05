import { redirect } from "next/navigation";
import { requireAppAccess, createDataClient } from "@/lib/auth-access";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui";
import { CrewLeadSchedule } from "@/components/crew-lead/CrewLeadSchedule";
import { CrewMemberSchedule } from "@/components/crew-member/CrewMemberSchedule";
import {
  buildCrewSchedule,
  todayDateOnly,
} from "@/components/crew-lead/buildCrewSchedule";
import type { ExtraWorkItem } from "@/components/crew-lead/schedule-types";
import { filterJobsForCrewMember } from "@/lib/crew-member";
import { getViewRole, roleCanAccessCrewSchedule } from "@/lib/demo-role";

export default async function SchedulePage() {
  await requireAppAccess();

  const role = await getViewRole();
  if (!roleCanAccessCrewSchedule(role)) {
    redirect("/dashboard");
  }

  const supabase = await createDataClient();
  const [{ data: contracts }, { data: visits }, { data: extraWorkRows }] =
    await Promise.all([
      supabase
        .from("contracts")
        .select(
          "id, title, status, visits_per_week, season_start, season_end, customer_id, customers(id, name, address, customer_notes), contract_services(service_name, included)"
        )
        .eq("status", "active"),
      supabase
        .from("service_visits")
        .select(
          "id, scheduled_date, status, contract_id, contracts(id, title, customer_id, customers(id, name, address, customer_notes), contract_services(service_name, included))"
        )
        .order("scheduled_date", { ascending: true }),
      supabase
        .from("extra_work_orders")
        .select("id, contract_id, title, description, quoted_amount, status"),
    ]);

  const allJobs = buildCrewSchedule(contracts ?? [], visits ?? []);
  const scheduleJobs =
    role === "crew_member" ? filterJobsForCrewMember(allJobs) : allJobs;
  const today = todayDateOnly();
  const extraWork: ExtraWorkItem[] = (extraWorkRows ?? []).map((row) => ({
    id: row.id,
    contractId: row.contract_id,
    title: row.title,
    description: row.description,
    quotedAmount: Number(row.quoted_amount),
    status: row.status,
  }));

  return (
    <AppShell>
      <PageHeader
        title="Schedule"
        description={
          role === "crew_member"
            ? "Day and week views of visits assigned to you (read-only)."
            : "Monthly schedule calendar with company, employee, job, and status filters — plus today's route and visit work tracking."
        }
      />
      {role === "crew_member" ? (
        <CrewMemberSchedule
          jobs={scheduleJobs}
          today={today}
          extraWork={extraWork}
        />
      ) : (
        <CrewLeadSchedule
          jobs={scheduleJobs}
          today={today}
          extraWork={extraWork}
        />
      )}
    </AppShell>
  );
}
