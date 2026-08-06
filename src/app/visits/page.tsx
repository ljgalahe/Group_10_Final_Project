import { completeVisit } from "@/app/actions/business";
import { ensureCompletedVisitLaborSynced } from "@/app/actions/labor";
import { AccountantVisitsView } from "@/components/AccountantVisitsView";
import {
  fetchEquipment,
  fetchEquipmentUsage,
} from "@/app/equipment/queries";
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
import {
  normalizeServiceName,
  oxfordAddressForCustomer,
  todayDateOnly,
} from "@/components/crew-lead/buildCrewSchedule";
import type {
  ExtraWorkItem,
  ScheduleJob,
} from "@/components/crew-lead/schedule-types";
import { OrganizedJobList } from "@/components/visits/JobList";
import {
  OrganizeToggle,
  VisitPeriodFilters,
} from "@/components/visits/VisitPeriodFilters";
import { VisitsSummaryBlocks } from "@/components/visits/VisitsSummaryBlocks";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { createDataClient, requireAppAccess } from "@/lib/auth-access";
import { jobIncludesCrewMember } from "@/lib/crew-member";
import { customerNotesForCrew, parseCustomerNotes } from "@/lib/customer-notes";
import {
  getViewRole,
  roleCanEditContractDetails,
  roleCanManageVisits,
} from "@/lib/demo-role";
import { formatCurrency, formatDate } from "@/lib/format";
import { formatVisitCostDescription } from "@/lib/crew-hours";
import {
  fetchAccountantVisits,
  fetchAllVisitCosts,
  fetchExtraWorkByContractIds,
  fetchJournalSourceStates,
  fetchVisitCosts,
  fetchVisitCostsByVisitIds,
  fetchVisits,
} from "@/lib/queries";
import {
  applyServiceHoldToScheduleJobs,
  buildCustomerServiceHolds,
  effectiveVisitDisplayStatus,
  heldCustomerIdSet,
} from "@/lib/service-hold";
import type { VisitCost } from "@/lib/types";
import {
  buildJobRows,
  groupJobsByCompany,
  groupJobsByTask,
  summaryFromJobs,
} from "@/lib/visit-jobs";
import {
  parseOrganizeMode,
  parseVisitPeriod,
  periodLabel,
} from "@/lib/visit-period";

type SearchParams = Record<string, string | string[] | undefined>;

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

function firstParam(
  value: string | string[] | undefined
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function VisitsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAppAccess();

  const role = await getViewRole();
  const isAccountant = roleCanEditContractDetails(role);

  if (isAccountant) {
    const { data: initialVisits } = await fetchAccountantVisits();
    const { synced } = await ensureCompletedVisitLaborSynced(
      initialVisits.map((visit) => visit.id)
    );
    let visits = initialVisits;
    if (synced > 0) {
      const refreshed = await fetchAccountantVisits();
      visits = refreshed.data;
    }
    const visitJournalStates = Object.fromEntries(
      (await fetchJournalSourceStates()).visit
    );
    const [equipmentReport, usageRows] = await Promise.all([
      fetchEquipment(),
      fetchEquipmentUsage(),
    ]);
    const equipmentRows = equipmentReport.assets;

    return (
      <AppShell>
        <PageHeader
          title="Visits"
          description="Accountant visit workspace with crew hours × hourly rate labor costs, profitability, variance, and audit controls."
        />
        {visits.length === 0 ? (
          <EmptyState message="No visits scheduled. Run the seed script to load demo visits." />
        ) : (
          <AccountantVisitsView
            visits={visits as any}
            todayIso={new Date().toISOString().slice(0, 10)}
            visitJournalStates={visitJournalStates}
            equipment={equipmentRows.map((item) => ({
              id: item.id,
              name: item.name,
              category: item.category,
              status: item.status,
            }))}
            equipmentUsage={usageRows.map((row) => ({
              id: row.id,
              visitId: row.visit_id,
              equipmentId: row.equipment_id,
              equipmentName: row.equipment_name,
              category:
                equipmentRows.find((item) => item.id === row.equipment_id)
                  ?.category ?? "Other",
              hours: row.hours,
              notes: row.notes,
            }))}
          />
        )}
      </AppShell>
    );
  }

  const isCustomer = role === "customer";
  const params = await searchParams;
  const { data: visits } = await fetchVisits();
  const canManage = roleCanManageVisits(role);

  let extraWork: ExtraWorkItem[] = [];
  const crewJobsByVisitId = new Map<string, ScheduleJob>();

  if (role === "crew_lead" || role === "crew_member") {
    const supabase = await createDataClient();
    const [{ data: enrichedVisits }, { data: extraWorkRows }, { data: invoices }] =
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
        supabase
          .from("invoices")
          .select(
            "id, invoice_number, customer_id, total, amount_paid, status, due_date, customers(name)"
          ),
      ]);
    const today = todayDateOnly();
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
      (enrichedVisits ?? []).map((visit) => ({
        id: visit.id,
        contract_id: visit.contract_id,
        status: visit.status,
        scheduled_date: visit.scheduled_date,
      })),
      {
        today,
        contractCustomerById: new Map(
          (enrichedVisits ?? []).flatMap((visit) => {
            const contractRaw = visit.contracts as
              | { id: string; customer_id: string }
              | { id: string; customer_id: string }[]
              | null;
            const contract = Array.isArray(contractRaw)
              ? contractRaw[0]
              : contractRaw;
            return contract
              ? [[contract.id, String(contract.customer_id)] as const]
              : [];
          })
        ),
      }
    );
    const heldIds = heldCustomerIdSet(holds);

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

      const scheduledDate = visit.scheduled_date.slice(0, 10);
      const onHold = heldIds.has(customer.id);
      crewJobsByVisitId.set(visit.id, {
        id: visit.id,
        contractId: contract.id,
        scheduledDate,
        status: effectiveVisitDisplayStatus(
          visit.status,
          scheduledDate,
          onHold,
          today
        ),
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
        serviceHold: onHold,
      });
    }

    const heldJobs = applyServiceHoldToScheduleJobs(
      Array.from(crewJobsByVisitId.values()),
      heldIds,
      today
    );
    for (const job of heldJobs) {
      crewJobsByVisitId.set(job.id, job);
    }

    const scopedVisits =
      role === "crew_member"
        ? visits.filter((visit) => jobIncludesCrewMember(visit.id))
        : visits;

    const { data: allScopedCosts } = await fetchVisitCostsByVisitIds(
      scopedVisits.map((visit) => visit.id)
    );
    const costsByVisitId = new Map<string, typeof allScopedCosts>();
    for (const cost of allScopedCosts) {
      const list = costsByVisitId.get(cost.visit_id) ?? [];
      list.push(cost);
      costsByVisitId.set(cost.visit_id, list);
    }
    const cardData: CrewLeadVisitCardData[] = scopedVisits.map((visit) => {
      const contract = visit.contracts as {
        title: string;
        customer_id?: string;
        customers: { name: string } | null;
      } | null;
      const costRows = costsByVisitId.get(visit.id) ?? [];
      const totalCosts = costRows.reduce(
        (sum, c) => sum + Number(c.amount),
        0
      );
      const crewJob = crewJobsByVisitId.get(visit.id) ?? null;
      const customerId =
        crewJob?.customerId ??
        contract?.customer_id ??
        (contract?.customers as { id?: string } | null)?.id;
      const displayStatus = effectiveVisitDisplayStatus(
        visit.status,
        visit.scheduled_date.slice(0, 10),
        Boolean(customerId && heldIds.has(customerId)),
        today
      );

      return {
        id: visit.id,
        status: displayStatus,
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
    });

    return (
      <AppShell>
        <PageHeader
          title="Visits"
          description={
            role === "crew_member"
              ? "Upcoming and completed visits assigned to you (read-only)."
              : undefined
          }
        />
        {cardData.length === 0 ? (
          <EmptyState
            message={
              role === "crew_member"
                ? "No visits assigned to you yet."
                : "No visits scheduled. Run the seed script to load demo visits."
            }
          />
        ) : (
          <CrewLeadVisitsBoard
            visits={cardData}
            extraWork={extraWork}
            readOnly={role === "crew_member"}
          />
        )}
      </AppShell>
    );
  }

  if (role === "manager") {
    const period = parseVisitPeriod(params);
    const organize = parseOrganizeMode(params);

    const { data: allCosts } = await fetchAllVisitCosts();
    const costsByVisit = new Map<string, VisitCost[]>();
    for (const cost of allCosts) {
      const list = costsByVisit.get(cost.visit_id) ?? [];
      list.push(cost);
      costsByVisit.set(cost.visit_id, list);
    }

    const jobs = buildJobRows(visits, costsByVisit, period);
    const summary = summaryFromJobs(jobs);
    const groups =
      organize === "jobs" ? groupJobsByTask(jobs) : groupJobsByCompany(jobs);

    return (
      <AppShell>
        <PageHeader
          kicker="Visits"
          title="Visits"
          description={`Summary and job list for ${periodLabel(period)}. Change the time range or organize by company or job.`}
        />

        <div className="mb-5">
          <VisitPeriodFilters period={period} organize={organize} />
        </div>

        <VisitsSummaryBlocks
          scheduled={summary.scheduled}
          completed={summary.completed}
          weatherAffected={summary.weatherAffected}
          weatherCount={summary.weatherCount}
          periodLabelText={periodLabel(period)}
          afterSummary={
            <section className="gs-section">
              <div className="gs-section-head flex flex-wrap items-end justify-between gap-3">
                <div className="max-w-xl">
                  <p className="gs-mark mb-1">Directory</p>
                  <h3 className="font-display text-xl font-semibold text-green-950 sm:text-2xl">
                    Work Directory
                  </h3>
                  <p className="gs-help">
                    {organize === "company"
                      ? "Open a company, then a job, then a visit for crew, pay, costs, and photos."
                      : "Open a job, then a visit for crew, pay, costs, and photos."}
                  </p>
                </div>
                <OrganizeToggle period={period} organize={organize} />
              </div>

              <OrganizedJobList
                groups={groups}
                organizeBy={organize}
                emptyMessage="No jobs in this time range. Try All time or June 2026."
              />
            </section>
          }
        />
      </AppShell>
    );
  }

  const statusFilter = parseStatusFilter(firstParam(params.status));
  const filteredVisits =
    statusFilter === "all"
      ? visits
      : statusFilter === "scheduled"
        ? // Rescheduled (e.g. weather) still counts as upcoming for demos.
          visits.filter(
            (v) => v.status === "scheduled" || v.status === "rescheduled"
          )
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
        title="Visits"
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
                          {visit.status === "rescheduled" ? (
                            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                              <p className="font-medium">
                                Rescheduled for weather
                              </p>
                              <p className="mt-0.5 text-amber-900/80">
                                {formatVisitDescription(visit.crew_notes)}
                              </p>
                            </div>
                          ) : null}
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
                                <span className="font-medium text-stone-800">
                                  {cost.cost_type === "labor"
                                    ? "Labor"
                                    : cost.cost_type === "materials"
                                      ? "Materials"
                                      : cost.cost_type === "equipment"
                                        ? "Equipment"
                                        : cost.cost_type}
                                </span>
                                :{" "}
                                {formatVisitCostDescription(
                                  visit.id,
                                  cost.cost_type,
                                  cost.description
                                )}{" "}
                                — {formatCurrency(Number(cost.amount))}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-1 text-sm text-stone-400">
                            No costs logged yet.
                          </p>
                        )}
                      </div>

                      {role === "manager" ? (
                        <div className="mt-4 border-t border-stone-100 pt-4">
                          <VisitCostForm visitId={visit.id} />
                        </div>
                      ) : null}
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
