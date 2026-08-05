import { completeVisit } from "@/app/actions/business";
import { AppShell } from "@/components/AppShell";
import {
  VisitStatusFilter,
  type VisitStatusFilterValue,
} from "@/components/VisitStatusFilter";
import { VisitCostForm } from "@/components/VisitCostForm";
import {
  CrewLeadVisitsBoard,
  type CrewLeadVisitCardData,
} from "@/components/crew-lead/CrewLeadVisitsBoard";
import { normalizeServiceName, oxfordAddressForCustomer } from "@/components/crew-lead/buildCrewSchedule";
import type {
  ExtraWorkItem,
  ScheduleJob,
} from "@/components/crew-lead/schedule-types";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { requireAppAccess, createDataClient } from "@/lib/auth-access";
import { getViewRole, roleCanManageVisits } from "@/lib/demo-role";
import { formatCurrency, formatDate } from "@/lib/format";
import { customerNotesForCrew, parseCustomerNotes } from "@/lib/customer-notes";
import {
  fetchExtraWorkByContractIds,
  fetchVisitCosts,
  fetchVisits,
} from "@/lib/queries";

function formatVisitDescription(notes: string | null) {
  if (!notes?.trim()) {
    return "No service details were logged for this visit.";
  }
  const trimmed = notes.trim();
  const withPeriod = /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
  return withPeriod.charAt(0).toUpperCase() + withPeriod.slice(1);
}

function formatExtraWorkStatus(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseStatusFilter(raw?: string): VisitStatusFilterValue {
  if (raw === "completed" || raw === "all") return raw;
  return "scheduled";
}

export default async function VisitsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAppAccess();

  const role = await getViewRole();
  const isCustomer = role === "customer";
  const params = await searchParams;
  const statusFilter = parseStatusFilter(params.status);
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
            "id, scheduled_date, status, contract_id, contracts(id, title, customer_id, customers(id, name, address, customer_notes), contract_services(service_name, included))"
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
              | {
                  id: string;
                  name: string;
                  address: string | null;
                  customer_notes?: string | null;
                }
              | {
                  id: string;
                  name: string;
                  address: string | null;
                  customer_notes?: string | null;
                }[]
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
              | {
                  id: string;
                  name: string;
                  address: string | null;
                  customer_notes?: string | null;
                }
              | {
                  id: string;
                  name: string;
                  address: string | null;
                  customer_notes?: string | null;
                }[]
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
        customerNotes: customerNotesForCrew(customer.customer_notes),
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

  const filteredVisits =
    statusFilter === "all"
      ? visits
      : visits.filter((v) => v.status === statusFilter);

  const emptyMessage = (() => {
    if (statusFilter === "scheduled") {
      return isCustomer
        ? "No scheduled visits for your account right now."
        : "No scheduled visits. Try All visits or run the seed script.";
    }
    if (statusFilter === "completed") {
      return isCustomer
        ? "No completed visits yet."
        : "No completed visits found.";
    }
    return isCustomer
      ? "No service visits for your account yet."
      : "No visits found. Run the seed script to load demo visits.";
  })();

  const extraWorkByContract = new Map<
    string,
    {
      id: string;
      title: string;
      description: string | null;
      quoted_amount: number;
      status: string;
    }[]
  >();

  if (isCustomer) {
    const contractIds = [
      ...new Set(filteredVisits.map((v) => v.contract_id).filter(Boolean)),
    ];
    const { data: extraRows } = await fetchExtraWorkByContractIds(contractIds);
    for (const row of extraRows) {
      const list = extraWorkByContract.get(row.contract_id) ?? [];
      list.push(row);
      extraWorkByContract.set(row.contract_id, list);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Service Visits"
        description={
          isCustomer
            ? "Upcoming and completed maintenance visits for your properties."
            : "Scheduled and completed crew visits with labor, materials, and equipment costs."
        }
        action={<VisitStatusFilter value={statusFilter} />}
      />

      {filteredVisits.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <div className="space-y-4">
          {await Promise.all(
            filteredVisits.map(async (visit) => {
              const contract = visit.contracts as {
                title: string;
                customers: {
                  name: string;
                  address: string | null;
                  customer_notes?: string | null;
                } | null;
              } | null;
              const propertyName = contract?.customers?.name ?? "Property";
              const siteAddress = contract?.customers?.address;
              const customerNotes = isCustomer
                ? parseCustomerNotes(contract?.customers?.customer_notes)
                : [];
              const contractExtra = isCustomer
                ? (extraWorkByContract.get(visit.contract_id) ?? [])
                : [];
              const costs = isCustomer
                ? null
                : (await fetchVisitCosts(visit.id)).data;
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
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-green-950">
                        {contract?.title ?? "Contract"}
                      </p>
                      {isCustomer ? (
                        <>
                          <p className="mt-1 text-sm text-stone-600">
                            {propertyName}
                            {siteAddress ? ` · ${siteAddress}` : ""}
                          </p>
                          <p className="mt-1 text-sm text-stone-500">
                            Visit date: {formatDate(visit.scheduled_date)}
                          </p>
                          <p className="mt-3 text-sm text-stone-700">
                            <span className="font-medium text-stone-800">
                              Service summary:{" "}
                            </span>
                            {formatVisitDescription(visit.crew_notes)}
                          </p>
                          {customerNotes.length > 0 ? (
                            <div className="mt-4">
                              <p className="text-sm font-medium text-stone-800">
                                Customer Notes
                              </p>
                              <p className="mt-0.5 text-xs text-stone-500">
                                Details you shared for crews about this
                                property.
                              </p>
                              <ul className="mt-1.5 list-inside list-disc space-y-1 text-sm text-stone-600">
                                {customerNotes.map((note) => (
                                  <li key={note}>{note}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          {contractExtra.length > 0 ? (
                            <div className="mt-4">
                              <p className="text-sm font-medium text-stone-800">
                                Extra work for this agreement
                              </p>
                              <ul className="mt-1.5 space-y-2">
                                {contractExtra.map((work) => (
                                  <li
                                    key={work.id}
                                    className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-2 text-sm"
                                  >
                                    <p className="font-medium text-green-950">
                                      {work.title}
                                      <span className="ml-2 text-xs font-normal text-stone-500">
                                        {formatExtraWorkStatus(work.status)}
                                      </span>
                                    </p>
                                    {work.description ? (
                                      <p className="mt-0.5 text-stone-600">
                                        {work.description}
                                      </p>
                                    ) : null}
                                    <p className="mt-1 text-xs text-stone-500">
                                      {formatCurrency(
                                        Number(work.quoted_amount)
                                      )}
                                    </p>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-stone-500">
                            {propertyName} · {formatDate(visit.scheduled_date)}
                          </p>
                          {visit.crew_notes ? (
                            <p className="mt-2 text-sm text-stone-600">
                              {formatVisitDescription(visit.crew_notes)}
                            </p>
                          ) : null}
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={visit.status} />
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
                            value="Visit completed on schedule."
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

                  {!isCustomer ? (
                    <>
                      <div className="mt-4">
                        <p className="text-sm font-medium text-stone-700">
                          Visit Costs: {formatCurrency(totalCosts)}
                        </p>
                        {costs && costs.length > 0 ? (
                          <ul className="mt-2 space-y-1 text-sm text-stone-600">
                            {costs.map((cost) => (
                              <li key={cost.id}>
                                <span className="capitalize">
                                  {cost.cost_type}
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
                    </>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      )}
    </AppShell>
  );
}
