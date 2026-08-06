import { redirect } from "next/navigation";
import { requireAppAccess, createDataClient } from "@/lib/auth-access";
import { AppShell } from "@/components/AppShell";
import { ServiceHoldBanner } from "@/components/ServiceHoldBanner";
import { ServiceHoldAuditSync } from "@/components/ServiceHoldDashboardCard";
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
import {
  applyServiceHoldToScheduleJobs,
  buildCustomerServiceHolds,
  heldCustomerIdSet,
} from "@/lib/service-hold";

export default async function SchedulePage() {
  await requireAppAccess();

  const role = await getViewRole();
  if (!roleCanAccessCrewSchedule(role)) {
    redirect("/dashboard");
  }

  const supabase = await createDataClient();
  const [
    { data: contracts },
    { data: visits },
    { data: extraWorkRows },
    { data: invoices },
  ] = await Promise.all([
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
    supabase
      .from("invoices")
      .select(
        "id, invoice_number, customer_id, total, amount_paid, status, due_date, customers(name)"
      ),
  ]);

  const today = todayDateOnly();
  const contractCustomerById = new Map(
    (contracts ?? []).map((contract) => [
      contract.id,
      String(contract.customer_id),
    ])
  );
  const holds = buildCustomerServiceHolds(
    (invoices ?? []).map((invoice) => ({
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      customer_id: String(invoice.customer_id),
      total: Number(invoice.total),
      amount_paid: Number(invoice.amount_paid),
      status: invoice.status,
      due_date: invoice.due_date,
      customers: Array.isArray(invoice.customers)
        ? invoice.customers[0]
          ? { name: invoice.customers[0].name }
          : null
        : invoice.customers
          ? { name: (invoice.customers as { name: string }).name }
          : null,
    })),
    (visits ?? []).map((visit) => ({
      id: visit.id,
      contract_id: visit.contract_id,
      status: visit.status,
      scheduled_date: visit.scheduled_date,
    })),
    { today, contractCustomerById }
  );
  const heldIds = heldCustomerIdSet(holds);

  const allJobs = applyServiceHoldToScheduleJobs(
    buildCrewSchedule(contracts ?? [], visits ?? []),
    heldIds,
    today
  );
  const scheduleJobs =
    role === "crew_member" ? filterJobsForCrewMember(allJobs) : allJobs;
  const extraWork: ExtraWorkItem[] = (extraWorkRows ?? []).map((row) => ({
    id: row.id,
    contractId: row.contract_id,
    title: row.title,
    description: row.description,
    quotedAmount: Number(row.quoted_amount),
    status: row.status,
  }));
  const heldOnSchedule = holds.filter((hold) =>
    scheduleJobs.some((job) => job.customerId === hold.customerId)
  );

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
      <ServiceHoldAuditSync holds={holds} />
      {heldOnSchedule.length > 0 ? (
        <div className="mb-6 space-y-3">
          {heldOnSchedule.slice(0, 3).map((hold) => (
            <ServiceHoldBanner
              key={hold.customerId}
              customerName={hold.customerName}
              reason={hold.reason}
            />
          ))}
        </div>
      ) : null}
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
