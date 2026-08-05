import { redirect } from "next/navigation";
import { requireAppAccess, createDataClient } from "@/lib/auth-access";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui";
import { CrewLeadSchedule } from "@/components/crew-lead/CrewLeadSchedule";
import { CrewMemberSchedule } from "@/components/crew-member/CrewMemberSchedule";
import {
  OperationsScheduleBoard,
  type OpsContractOption,
  type OpsVisitRow,
} from "@/components/operations/OperationsScheduleBoard";
import { OperationsMemberSchedulingPanel } from "@/components/operations/OperationsMemberSchedulingPanel";
import {
  buildCrewSchedule,
  todayDateOnly,
} from "@/components/crew-lead/buildCrewSchedule";
import type { ExtraWorkItem } from "@/components/crew-lead/schedule-types";
import { filterJobsForCrewMember } from "@/lib/crew-member";
import {
  getViewRole,
  roleCanAccessCrewSchedule,
  roleCanAccessSchedule,
  roleCanManageCompanySchedule,
} from "@/lib/demo-role";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{
    assigned?: string;
    grouped?: string;
    created?: string;
    rescheduled?: string;
    error?: string;
  }>;
}) {
  await requireAppAccess();

  const role = await getViewRole();
  if (!roleCanAccessSchedule(role)) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const supabase = await createDataClient();

  if (roleCanManageCompanySchedule(role)) {
    const [{ data: visitRows }, { data: contractRows }] = await Promise.all([
      supabase
        .from("service_visits")
        .select(
          "id, scheduled_date, status, visit_kind, crew_lead_name, contract_id, contracts(id, title, customers(name, address))"
        )
        .order("scheduled_date", { ascending: true }),
      supabase
        .from("contracts")
        .select("id, title, status, customers(name)")
        .in("status", ["active", "draft"])
        .order("title"),
    ]);

    const visits: OpsVisitRow[] = (visitRows ?? []).map((v) => {
      const contract = Array.isArray(v.contracts) ? v.contracts[0] : v.contracts;
      const customers = contract?.customers;
      const customer = Array.isArray(customers) ? customers[0] : customers;
      return {
        id: v.id,
        scheduled_date: v.scheduled_date,
        status: v.status,
        visit_kind: v.visit_kind ?? "service",
        crew_lead_name: v.crew_lead_name,
        contract_id: v.contract_id,
        contract_title: contract?.title ?? "Contract",
        customer_name: customer?.name ?? "Customer",
        address: customer?.address ?? null,
      };
    });

    const contracts: OpsContractOption[] = (contractRows ?? []).map((c) => {
      const customers = c.customers;
      const customer = Array.isArray(customers) ? customers[0] : customers;
      return {
        id: c.id,
        title: c.title,
        customer_name: customer?.name ?? "Customer",
      };
    });

    return (
      <AppShell>
        <PageHeader
          title="Scheduling"
          description="Company scheduling hub — calendar, create/assign visits, location routing, missed-visit reschedule, and crew time-off."
        />
        {params.assigned === "1" ? (
          <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            Visit assignment saved.
          </p>
        ) : null}
        {params.created === "1" ? (
          <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            Visit created.
          </p>
        ) : null}
        {params.rescheduled === "1" ? (
          <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            Visit rescheduled and restored to the active board.
          </p>
        ) : null}
        {params.grouped ? (
          <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            Grouped {params.grouped} nearby visit(s) onto the target day.
          </p>
        ) : null}
        {params.error ? (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Could not complete scheduling action.
          </p>
        ) : null}
        <div className="space-y-6">
          <OperationsScheduleBoard
            visits={visits}
            contracts={contracts}
            today={todayDateOnly()}
          />
          <div id="crew-availability" className="scroll-mt-24">
            <OperationsMemberSchedulingPanel />
          </div>
        </div>
      </AppShell>
    );
  }

  if (!roleCanAccessCrewSchedule(role)) {
    redirect("/dashboard");
  }

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
            ? "Monthly schedule calendar with company, employee, job, and status filters — visits assigned to you (read-only)."
            : "Your assigned visits for execution — Operations owns company-wide scheduling and Crew Lead assignment."
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
