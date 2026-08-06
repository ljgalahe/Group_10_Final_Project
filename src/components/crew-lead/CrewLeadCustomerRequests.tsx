"use client";

import { useState } from "react";
import { EmptyState, StatusBadge } from "@/components/ui";
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
  const [open, setOpen] = useState(true);
  const openCount = requests.filter(
    (r) => r.status === "Open" || r.status === "In Progress"
  ).length;

  return (
    <section className="rounded-xl border border-stone-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left sm:px-5"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-green-950">
              Customer Field Requests
            </h2>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
              {openCount} open
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm text-stone-500">
            {requests.length === 0
              ? "No field questions or concerns yet"
              : `${requests.length} request${requests.length === 1 ? "" : "s"} from customers`}
          </p>
        </div>
        <span className="shrink-0 text-xs font-medium text-stone-500">
          {open ? "Collapse" : "Expand"}
        </span>
      </button>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
        aria-hidden={!open}
      >
        <div
          className={`min-h-0 overflow-hidden ${open ? "" : "pointer-events-none"}`}
        >
          {open ? (
            <div className="border-t border-stone-100 px-4 py-4 sm:px-5">
              {requests.length === 0 ? (
                <EmptyState message="No customer questions, concerns, or complaints yet." />
              ) : (
                <ul className="max-h-80 divide-y divide-stone-100 overflow-y-auto overscroll-contain border-t border-stone-100 pr-1">
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
            </div>
          ) : (
            <div className="border-t border-transparent px-4 py-0 sm:px-5" />
          )}
        </div>
      </div>
    </section>
  );
}
