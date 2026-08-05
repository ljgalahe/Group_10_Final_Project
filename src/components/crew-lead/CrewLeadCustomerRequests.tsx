import { Card, EmptyState, StatusBadge } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { SupportRequestQueueItem } from "@/lib/queries";
import { CREW_APPLICABLE_SUPPORT_CATEGORIES } from "@/lib/types";

function formatCategoryLabel(category: string) {
  return (
    CREW_APPLICABLE_SUPPORT_CATEGORIES.find((c) => c.value === category)
      ?.label ??
    category.replaceAll("_", " ").replace(/\b\w/g, (ch) => ch.toUpperCase())
  );
}

function formatCreatedDate(iso: string) {
  return formatDate(iso.slice(0, 10));
}

/**
 * Dashboard section listing customer Contact Us requests that apply to crew
 * (questions, concerns, complaints — same records customers submit).
 */
export function CrewLeadCustomerRequests({
  requests,
}: {
  requests: SupportRequestQueueItem[];
}) {
  const openCount = requests.filter(
    (r) => r.status === "Open" || r.status === "In Progress"
  ).length;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-green-950">
          Customer Field Requests
        </h2>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
          {openCount} open
        </span>
      </div>

      {requests.length === 0 ? (
        <div className="mt-4">
          <EmptyState message="No customer questions, concerns, or complaints yet." />
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-stone-100 border-t border-stone-100">
          {requests.map((req) => (
            <li key={req.id} className="py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-green-950">
                    {req.customer_name}
                  </p>
                  <p className="mt-0.5 text-sm text-stone-600">
                    {formatCategoryLabel(req.category)} ·{" "}
                    {formatCreatedDate(req.created_at)}
                  </p>
                  {req.linked_label ? (
                    <p className="mt-0.5 text-sm text-stone-500">
                      Linked: {req.linked_label}
                    </p>
                  ) : null}
                </div>
                <StatusBadge status={req.status.toLowerCase()} />
              </div>
              <p className="mt-3 rounded-lg bg-stone-50 p-3 text-sm text-stone-700">
                {req.message}
              </p>
              {req.resolution_notes ? (
                <p className="mt-2 text-sm text-stone-500">
                  <span className="font-medium text-stone-700">
                    Resolution:{" "}
                  </span>
                  {req.resolution_notes}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
