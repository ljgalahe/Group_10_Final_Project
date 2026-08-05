import { redirect } from "next/navigation";
import { requireAppAccess, createDataClient } from "@/lib/auth-access";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui";
import { CrewLeadSchedule } from "@/components/crew-lead/CrewLeadSchedule";
import {
  buildCrewSchedule,
  todayDateOnly,
} from "@/components/crew-lead/buildCrewSchedule";
import type { ExtraWorkItem } from "@/components/crew-lead/schedule-types";
import { getViewRole } from "@/lib/demo-role";

export default async function SchedulePage() {
  await requireAppAccess();

  const role = await getViewRole();
  if (role !== "crew_lead") {
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

  const scheduleJobs = buildCrewSchedule(contracts ?? [], visits ?? []);
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
        description="Three-month crew job calendar, filters, today's route, and per-visit work tracking."
      />
      <CrewLeadSchedule
        jobs={scheduleJobs}
        today={today}
        extraWork={extraWork}
      />
    </AppShell>
  );
}
