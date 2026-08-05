import { completeVisit } from "@/app/actions/business";
import { AppShell } from "@/components/AppShell";
import { VisitCostForm } from "@/components/VisitCostForm";
import {
  CrewLeadVisitsBoard,
  type CrewLeadVisitCardData,
} from "@/components/crew-lead/CrewLeadVisitsBoard";
import { formatStatusLabel } from "@/components/crew-lead/visitWorkDefaults";
import { normalizeServiceName, oxfordAddressForCustomer } from "@/components/crew-lead/buildCrewSchedule";
import type {
  ExtraWorkItem,
  ScheduleJob,
} from "@/components/crew-lead/schedule-types";
import { EmptyState, PageHeader } from "@/components/ui";
import { requireAppAccess, createDataClient } from "@/lib/auth-access";
import { getViewRole, roleCanManageVisits } from "@/lib/demo-role";
import { formatCurrency, formatDate } from "@/lib/format";
import { fetchVisitCosts, fetchVisits } from "@/lib/queries";

function titleCaseCostType(costType: string): string {
  const normalized = costType.trim().toLowerCase();
  if (normalized === "labor") return "Labor";
  if (normalized === "materials") return "Materials";
  if (normalized === "equipment") return "Equipment";
  return formatStatusLabel(costType);
}

export default async function VisitsPage() {
  await requireAppAccess();

  const role = await getViewRole();
  const { data: visits } = await fetchVisits();
  const canManage = roleCanManageVisits(role);

  let extraWork: ExtraWorkItem[] = [];
  const crewJobsByVisitId = new Map<string, ScheduleJob>();

  if (role === "crew_lead") {
    const supabase = await createDataClient();
    const [{ data: enrichedVisits }, { data: extraWorkRows }] =
      await Promise.all([
        supabase
          .from("service_visits")
          .select(
            "id, scheduled_date, status, contract_id, contracts(id, title, customer_id, customers(id, name, address), contract_services(service_name, included))"
          )
          .order("scheduled_date", { ascending: true }),
        supabase
          .from("extra_work_orders")
          .select("id, contract_id, title, description, quoted_amount, status"),
      ]);

    extraWork = (extraWorkRows ?? []).map((row) => ({
      id: row.id,
      contractId: row.contract_id,
      title: row.title,
      description: row.description,
      quotedAmount: Number(row.quoted_amount),
      status: row.status,
    }));

    for (const visit of enrichedVisits ?? []) {
      const contractRaw = visit.contracts as
        | {
            id: string;
            title: string;
            customer_id: string;
            customers:
              | { id: string; name: string; address: string | null }
              | { id: string; name: string; address: string | null }[]
              | null;
            contract_services:
              | { service_name: string; included: boolean }[]
              | null;
          }
        | {
            id: string;
            title: string;
            customer_id: string;
            customers:
              | { id: string; name: string; address: string | null }
              | { id: string; name: string; address: string | null }[]
              | null;
            contract_services:
              | { service_name: string; included: boolean }[]
              | null;
          }[]
        | null;
      const contract = Array.isArray(contractRaw)
        ? contractRaw[0]
        : contractRaw;
      const customerRaw = contract?.customers;
      const customer = Array.isArray(customerRaw)
        ? customerRaw[0]
        : customerRaw;
      if (!contract || !customer) continue;

      const services = Array.from(
        new Map(
          (contract.contract_services ?? [])
            .filter((s) => s.included)
            .map((s) => {
              const name = normalizeServiceName(s.service_name);
              return [name.toLowerCase(), name] as const;
            })
        ).values()
      );

      crewJobsByVisitId.set(visit.id, {
        id: visit.id,
        contractId: contract.id,
        scheduledDate: visit.scheduled_date.slice(0, 10),
        status: visit.status,
        customerId: customer.id,
        customerName: customer.name,
        customerIdShort: customer.id.slice(-4),
        address: oxfordAddressForCustomer(customer.id, customer.address),
        contractTitle: contract.title,
        services,
        lat: 34.3665,
        lng: -89.5192,
        source: "visit",
      });
    }
  }

  if (role === "crew_lead") {
    const cardData: CrewLeadVisitCardData[] = await Promise.all(
      visits.map(async (visit) => {
        const contract = visit.contracts as {
          title: string;
          customers: { name: string } | null;
        } | null;
        const { data: costs } = await fetchVisitCosts(visit.id);
        const costRows = costs ?? [];
        const totalCosts = costRows.reduce(
          (sum, c) => sum + Number(c.amount),
          0
        );
        const crewJob = crewJobsByVisitId.get(visit.id) ?? null;

        return {
          id: visit.id,
          status: visit.status,
          customerName: contract?.customers?.name ?? "Unknown Customer",
          contractTitle: contract?.title ?? "Contract",
          scheduledDate: visit.scheduled_date,
          crewNotes: visit.crew_notes,
          totalCosts,
          costs: costRows.map((cost) => ({
            id: cost.id,
            cost_type: cost.cost_type,
            description: cost.description,
            amount: Number(cost.amount),
          })),
          crewJob,
        };
      })
    );

    return (
      <AppShell>
        <PageHeader
          title="Service Visits"
          description="Scheduled and completed crew visits with Labor, Materials, and Equipment costs."
        />
        {cardData.length === 0 ? (
          <EmptyState message="No visits scheduled. Run the seed script to load demo visits." />
        ) : (
          <CrewLeadVisitsBoard visits={cardData} extraWork={extraWork} />
        )}
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Service Visits"
        description="Scheduled and completed crew visits with Labor, Materials, and Equipment costs."
      />

      {visits.length === 0 ? (
        <EmptyState message="No visits scheduled. Run the seed script to load demo visits." />
      ) : (
        <div className="space-y-4">
          {await Promise.all(
            visits.map(async (visit) => {
              const contract = visit.contracts as {
                title: string;
                customers: { name: string } | null;
              } | null;
              const { data: costs } = await fetchVisitCosts(visit.id);
              const totalCosts = (costs ?? []).reduce(
                (sum, c) => sum + Number(c.amount),
                0
              );

              return (
                <div
                  key={visit.id}
                  className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-green-950">
                        {contract?.title ?? "Contract"}
                      </p>
                      <p className="text-sm text-stone-500">
                        {contract?.customers?.name} ·{" "}
                        {formatDate(visit.scheduled_date)}
                      </p>
                      {visit.crew_notes ? (
                        <p className="mt-2 text-sm text-stone-600">
                          {visit.crew_notes}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium capitalize text-stone-800">
                        {formatStatusLabel(visit.status)}
                      </span>
                      {canManage && visit.status === "scheduled" && (
                        <form action={completeVisit}>
                          <input
                            type="hidden"
                            name="visit_id"
                            value={visit.id}
                          />
                          <input
                            type="hidden"
                            name="notes"
                            value="Visit completed on schedule"
                          />
                          <button
                            type="submit"
                            className="rounded-md bg-green-800 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                          >
                            Mark Complete
                          </button>
                        </form>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-sm font-medium text-stone-700">
                      Visit Costs: {formatCurrency(totalCosts)}
                    </p>
                    {costs && costs.length > 0 ? (
                      <ul className="mt-2 space-y-1 text-sm text-stone-600">
                        {costs.map((cost) => (
                          <li key={cost.id}>
                            <span className="font-medium text-stone-800">
                              {titleCaseCostType(cost.cost_type)}
                            </span>
                            : {cost.description ?? "—"} —{" "}
                            {formatCurrency(Number(cost.amount))}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-sm text-stone-400">
                        No costs logged yet.
                      </p>
                    )}
                  </div>

                  {(role === "accountant" || role === "manager") && (
                    <div className="mt-4 border-t border-stone-100 pt-4">
                      <VisitCostForm visitId={visit.id} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </AppShell>
  );
}
