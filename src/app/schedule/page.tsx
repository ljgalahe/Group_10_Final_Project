import { redirect } from "next/navigation";
import { requireAppAccess, createDataClient } from "@/lib/auth-access";
import { AppShell } from "@/components/AppShell";
import { ServiceHoldBanner } from "@/components/ServiceHoldBanner";
import { ServiceHoldAuditSync } from "@/components/ServiceHoldDashboardCard";
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
import { fetchVisitCostsByVisitIds } from "@/lib/queries";
import {
  applyServiceHoldToScheduleJobs,
  buildCustomerServiceHolds,
  heldCustomerIdSet,
} from "@/lib/service-hold";
import type { VisitCost } from "@/lib/types";
import { buildJobRows } from "@/lib/visit-jobs";
import { defaultVisitPeriod } from "@/lib/visit-period";

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
    const windowStart = (() => {
      const d = new Date(`${todayDateOnly()}T00:00:00.000Z`);
      d.setUTCDate(d.getUTCDate() - 14);
      return d.toISOString().slice(0, 10);
    })();
    const windowEnd = (() => {
      const d = new Date(`${todayDateOnly()}T00:00:00.000Z`);
      d.setUTCDate(d.getUTCDate() + 90);
      return d.toISOString().slice(0, 10);
    })();
    const [{ data: visitRows }, { data: contractRows }] = await Promise.all([
      supabase
        .from("service_visits")
        .select(
          "id, scheduled_date, status, visit_kind, crew_lead_name, crew_notes, contract_id, contracts(id, title, customer_id, customers(name, address, property_type))"
        )
        .gte("scheduled_date", windowStart)
        .lte("scheduled_date", windowEnd)
        .order("scheduled_date", { ascending: true }),
      supabase
        .from("contracts")
        .select("id, title, status, customers(name)")
        .in("status", ["active", "draft"])
        .order("title"),
    ]);
    const enrichedVisits = (visitRows ?? []).map((v) => {
      const contract = Array.isArray(v.contracts) ? v.contracts[0] : v.contracts;
      const customers = contract?.customers;
      const customer = Array.isArray(customers) ? customers[0] : customers;
      return {
        id: v.id,
        scheduled_date: v.scheduled_date,
        status: v.status,
        contract_id: v.contract_id,
        crew_notes: v.crew_notes ?? null,
        contracts: contract
          ? {
              title: contract.title,
              customer_id: contract.customer_id,
              customers: customer
                ? {
                    name: customer.name,
                    address: customer.address,
                    property_type: customer.property_type,
                  }
                : null,
            }
          : null,
      };
    });
    const { data: allCosts } = await fetchVisitCostsByVisitIds(
      enrichedVisits.map((v) => v.id)
    );

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

    // Same JobRow / ScheduleCalendar data Manager Visits used.
    const costsByVisit = new Map<string, VisitCost[]>();
    for (const cost of allCosts) {
      const list = costsByVisit.get(cost.visit_id) ?? [];
      list.push(cost as VisitCost);
      costsByVisit.set(cost.visit_id, list);
    }
    const calendarJobs = buildJobRows(
      enrichedVisits as Parameters<typeof buildJobRows>[0],
      costsByVisit,
      defaultVisitPeriod()
    );

    return (
      <AppShell>
        <PageHeader
          title="Scheduling"
          description="Company scheduling hub - calendar, create/assign visits, location routing, missed-visit reschedule, and crew time-off."
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
            calendarJobs={calendarJobs}
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
      .gte(
        "scheduled_date",
        (() => {
          const d = new Date(`${todayDateOnly()}T00:00:00.000Z`);
          d.setUTCDate(d.getUTCDate() - 14);
          return d.toISOString().slice(0, 10);
        })()
      )
      .lte(
        "scheduled_date",
        (() => {
          const d = new Date(`${todayDateOnly()}T00:00:00.000Z`);
          d.setUTCDate(d.getUTCDate() + 90);
          return d.toISOString().slice(0, 10);
        })()
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
            ? "Monthly schedule calendar with company, employee, job, and status filters - visits assigned to you (read-only)."
            : undefined
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
