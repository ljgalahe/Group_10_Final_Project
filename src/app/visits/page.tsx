import { redirect } from "next/navigation";
import { completeVisit } from "@/app/actions/business";
import { AppShell } from "@/components/AppShell";
import { VisitCostForm } from "@/components/VisitCostForm";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { getViewRole, roleCanManageVisits } from "@/lib/demo-role";
import { formatCurrency, formatDate } from "@/lib/format";
import { fetchVisitCosts, fetchVisits } from "@/lib/queries";
import { requireAppAccess } from "@/lib/auth-access";

export default async function VisitsPage() {
  await requireAppAccess();

  const role = await getViewRole();
  const { data: visits } = await fetchVisits();
  const canManage = roleCanManageVisits(role);

  return (
    <AppShell>
      <PageHeader
        title="Service Visits"
        description="Scheduled and completed crew visits with labor, materials, and equipment costs."
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
                        {contract?.customers?.name} · {formatDate(visit.scheduled_date)}
                      </p>
                      {visit.crew_notes ? (
                        <p className="mt-2 text-sm text-stone-600">{visit.crew_notes}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={visit.status} />
                      {canManage && visit.status === "scheduled" && (
                        <form action={completeVisit}>
                          <input type="hidden" name="visit_id" value={visit.id} />
                          <input type="hidden" name="notes" value="Visit completed on schedule" />
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
                            {cost.cost_type}: {cost.description ?? "—"} —{" "}
                            {formatCurrency(Number(cost.amount))}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-sm text-stone-400">No costs logged yet.</p>
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
