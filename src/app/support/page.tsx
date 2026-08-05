import { redirect } from "next/navigation";
import {
  markInvoiceDisputed,
  updateSupportRequestStatus,
} from "@/app/actions/support";
import { AppShell } from "@/components/AppShell";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { requireAppAccess } from "@/lib/auth-access";
import { getViewRole } from "@/lib/demo-role";
import { formatDate } from "@/lib/format";
import { fetchAllSupportRequests } from "@/lib/queries";
import { SUPPORT_CATEGORIES } from "@/lib/types";

const STATUS_OPTIONS = ["Open", "In Progress", "Resolved"] as const;

function formatCategoryLabel(category: string) {
  return (
    SUPPORT_CATEGORIES.find((c) => c.value === category)?.label ??
    category.replaceAll("_", " ").replace(/\b\w/g, (ch) => ch.toUpperCase())
  );
}

function formatCreatedDate(iso: string) {
  return formatDate(iso.slice(0, 10));
}

function badgeStatus(status: string) {
  return status.toLowerCase();
}

export default async function CustomerSupportPage({
  searchParams,
}: {
  searchParams: Promise<{
    updated?: string;
    disputed?: string;
    error?: string;
  }>;
}) {
  await requireAppAccess();

  const role = await getViewRole();
  if (role !== "manager") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const { data: requests } = await fetchAllSupportRequests();

  return (
    <AppShell>
      <PageHeader
        title="Customer Support"
        description="Review customer questions, concerns, complaints, billing disputes, and renewal requests. Service quote requests are handled by Operations."
      />

      {params.updated === "1" ? (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          Request status updated.
        </div>
      ) : null}

      {params.disputed === "1" ? (
        <div className="mb-6 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
          Invoice marked as Disputed.
        </div>
      ) : null}

      {params.error ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Could not complete that action. Please try again.
        </div>
      ) : null}

      {requests.length === 0 ? (
        <EmptyState message="No customer support requests yet." />
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const canDisputeInvoice =
              req.category === "billing_dispute" &&
              req.linked_type === "invoice" &&
              !!req.linked_id;

            return (
              <article
                key={req.id}
                className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-green-950">
                      {req.customer_name}
                    </p>
                    <p className="mt-1 text-sm text-stone-600">
                      {formatCategoryLabel(req.category)} · Submitted{" "}
                      {formatCreatedDate(req.created_at)}
                    </p>
                    {req.linked_label ? (
                      <p className="mt-1 text-sm text-stone-500">
                        Linked: {req.linked_label}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-stone-400">
                        No linked record
                      </p>
                    )}
                  </div>
                  <StatusBadge status={badgeStatus(req.status)} />
                </div>

                <p className="mt-4 rounded-lg bg-stone-50 p-3 text-sm text-stone-700">
                  {req.message}
                </p>

                <div className="mt-4 flex flex-col gap-3 border-t border-stone-100 pt-4">
                  <form
                    action={updateSupportRequestStatus}
                    className="space-y-3"
                  >
                    <input type="hidden" name="request_id" value={req.id} />
                    <div className="flex flex-wrap items-end gap-3">
                      <div>
                        <label
                          htmlFor={`status-${req.id}`}
                          className="block text-xs font-medium text-stone-500"
                        >
                          Status
                        </label>
                        <select
                          id={`status-${req.id}`}
                          name="status"
                          defaultValue={
                            STATUS_OPTIONS.includes(
                              req.status as (typeof STATUS_OPTIONS)[number]
                            )
                              ? req.status
                              : "Open"
                          }
                          className="mt-1 rounded-lg border border-stone-300 px-3 py-2 text-sm"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="submit"
                        className="rounded-lg bg-green-800 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                      >
                        Save Update
                      </button>
                    </div>
                    <div>
                      <label
                        htmlFor={`resolution-${req.id}`}
                        className="block text-xs font-medium text-stone-500"
                      >
                        How We Resolved It{" "}
                        <span className="font-normal text-stone-400">
                          (visible to the customer)
                        </span>
                      </label>
                      <textarea
                        id={`resolution-${req.id}`}
                        name="resolution_notes"
                        rows={3}
                        defaultValue={req.resolution_notes ?? ""}
                        placeholder="Describe the fix or response the customer should see…"
                        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </form>

                  {canDisputeInvoice ? (
                    <form action={markInvoiceDisputed}>
                      <input type="hidden" name="request_id" value={req.id} />
                      <input
                        type="hidden"
                        name="invoice_id"
                        value={req.linked_id ?? ""}
                      />
                      <button
                        type="submit"
                        className="rounded-lg border border-orange-700 px-3 py-2 text-sm font-medium text-orange-900 hover:bg-orange-50"
                      >
                        Mark Invoice Disputed
                      </button>
                    </form>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
