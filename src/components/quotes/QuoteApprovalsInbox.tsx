"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  approveQuote,
  requestQuoteChanges,
} from "@/app/actions/quote-approvals";
import { formatCurrency, formatDate } from "@/lib/format";

export type QuoteApprovalItem = {
  id: string;
  service_description: string;
  status: string;
  monthly_fee?: number | null;
  submitted_for_approval_at?: string | null;
  created_at: string;
  season_start?: string | null;
  season_end?: string | null;
  notes?: string | null;
  customers?: {
    name?: string | null;
  } | null;
  /** Present for demo-only rows (not in DB). */
  demo?: boolean;
  companyName?: string;
  quoteTitle?: string;
};

const DEMO_QUOTE_DECISIONS_KEY = "greenscape-manager-quote-approvals";

function loadDemoDecisions(): Record<string, "approved" | "rejected"> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(DEMO_QUOTE_DECISIONS_KEY);
    return raw
      ? (JSON.parse(raw) as Record<string, "approved" | "rejected">)
      : {};
  } catch {
    return {};
  }
}

function saveDemoDecision(id: string, status: "approved" | "rejected") {
  const next = { ...loadDemoDecisions(), [id]: status };
  window.localStorage.setItem(DEMO_QUOTE_DECISIONS_KEY, JSON.stringify(next));
  return next;
}

function buildDemoQuoteApprovals(): QuoteApprovalItem[] {
  return [
    {
      id: "demo-ops-quote-harbor",
      service_description: "Harbor View HOA — seasonal grounds package",
      status: "pending_manager_approval",
      monthly_fee: 920,
      submitted_for_approval_at: "2026-06-15T12:00:00.000Z",
      created_at: "2026-06-15T12:00:00.000Z",
      season_start: "2026-09-01",
      season_end: "2027-03-31",
      notes:
        "New seasonal quote formed by Operations — ready for manager sign-off.",
      demo: true,
      companyName: "Harbor View HOA",
      quoteTitle: "Harbor View HOA — seasonal grounds package",
    },
    {
      id: "demo-ops-quote-summit",
      service_description: "Summit Retail Center — revised scope quote",
      status: "pending_manager_approval",
      monthly_fee: 875,
      submitted_for_approval_at: "2026-06-14T12:00:00.000Z",
      created_at: "2026-06-14T12:00:00.000Z",
      season_start: "2026-09-01",
      season_end: "2027-03-31",
      notes: "Operations submitted updated quote terms for manager approval.",
      demo: true,
      companyName: "Summit Retail Center",
      quoteTitle: "Summit Retail Center — revised scope quote",
    },
  ];
}

/**
 * Shared Quote Approvals queue used on Contracts and the manager dashboard.
 * Same Approve / Request Changes / View quote controls in both places.
 */
export function QuoteApprovalsInbox({
  pendingQuotes = [],
  companyFilter = "overall",
  emptyHint = "No quote approvals waiting. When Operations forms or revises a quote, it appears here for you to Approve or Request Changes.",
}: {
  pendingQuotes?: QuoteApprovalItem[];
  /** Optional company filter (Contracts page). */
  companyFilter?: string;
  emptyHint?: string;
}) {
  const [demoDecisions, setDemoDecisions] = useState<
    Record<string, "approved" | "rejected">
  >({});
  const [message, setMessage] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDemoDecisions(loadDemoDecisions());
    setReady(true);
  }, []);

  const approvals = useMemo(() => {
    const pending = pendingQuotes ?? [];
    const real = pending.map((q) => ({
      ...q,
      companyName:
        q.companyName ??
        (q.customers as { name?: string } | null)?.name ??
        "Customer",
      quoteTitle:
        q.quoteTitle ?? q.service_description.slice(0, 80) ?? "Quote",
    }));

    const demo =
      ready && real.length === 0
        ? buildDemoQuoteApprovals().filter((d) => !demoDecisions[d.id])
        : [];

    return [...real, ...demo]
      .filter((a) => {
        if (a.demo && demoDecisions[a.id]) return false;
        if (companyFilter === "overall") return true;
        return (a.companyName ?? "") === companyFilter;
      })
      .sort((a, b) => {
        const aDate = a.submitted_for_approval_at ?? a.created_at ?? "";
        const bDate = b.submitted_for_approval_at ?? b.created_at ?? "";
        const byDate = bDate.localeCompare(aDate);
        if (byDate !== 0) return byDate;
        return (a.id ?? "").localeCompare(b.id ?? "");
      });
  }, [pendingQuotes, companyFilter, demoDecisions, ready]);

  function decideDemo(id: string, status: "approved" | "rejected") {
    setDemoDecisions(saveDemoDecision(id, status));
    setMessage(
      status === "approved"
        ? "Quote approved. Operations can draft the contract."
        : "Change request sent. Operations will revise the quote."
    );
  }

  return (
    <div>
      {message ? (
        <p className="mb-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
          {message}
        </p>
      ) : null}

      {approvals.length === 0 ? (
        <p className="text-sm text-stone-600">{emptyHint}</p>
      ) : (
        <ul className="max-h-[20rem] space-y-3 overflow-y-auto pr-1">
          {approvals.map((request) => {
            const fee = request.monthly_fee;
            const submitted = (
              request.submitted_for_approval_at ?? request.created_at
            ).slice(0, 10);
            return (
              <li
                key={request.id}
                className="rounded-lg border border-stone-200 bg-stone-50/80 p-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-stone-900">
                    {request.quoteTitle}
                  </p>
                  <p className="text-xs text-stone-500">
                    {request.companyName}
                    {fee != null
                      ? ` · ${formatCurrency(Number(fee))} / Mo`
                      : ""}
                    {" · "}
                    Submitted {formatDate(submitted)}
                  </p>
                </div>
                {request.notes ? (
                  <p className="mt-2 text-sm text-stone-700">{request.notes}</p>
                ) : null}
                {request.season_start && request.season_end ? (
                  <p className="mt-1 text-xs text-stone-500">
                    Season {formatDate(request.season_start)} –{" "}
                    {formatDate(request.season_end)}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {request.demo ? (
                    <>
                      <button
                        type="button"
                        onClick={() => decideDemo(request.id, "approved")}
                        className="gs-btn-approve inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium"
                      >
                        Approve
                      </button>
                      <input
                        type="text"
                        placeholder="Request Changes…"
                        aria-label="Request Changes"
                        className="h-8 min-w-[11rem] flex-1 rounded-md border border-amber-700 bg-transparent px-2 text-xs text-amber-950 placeholder:text-amber-800/70 focus:outline-none focus:ring-1 focus:ring-amber-700"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            decideDemo(request.id, "rejected");
                          }
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <form action={approveQuote} className="inline-flex">
                        <input
                          type="hidden"
                          name="quote_id"
                          value={request.id}
                        />
                        <button
                          type="submit"
                          className="gs-btn-approve inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium"
                        >
                          Approve
                        </button>
                      </form>
                      <form
                        action={requestQuoteChanges}
                        className="min-w-[11rem] flex-1"
                      >
                        <input
                          type="hidden"
                          name="quote_id"
                          value={request.id}
                        />
                        <input
                          name="change_notes"
                          placeholder="Request Changes…"
                          aria-label="Request Changes"
                          required
                          className="h-8 w-full rounded-md border border-amber-700 bg-transparent px-2 text-xs text-amber-950 placeholder:text-amber-800/70 focus:outline-none focus:ring-1 focus:ring-amber-700"
                        />
                      </form>
                    </>
                  )}
                  <Link
                    href={
                      request.demo ? "/contracts" : `/quotes/${request.id}`
                    }
                    className="inline-flex h-8 items-center justify-center rounded-md border border-green-800 px-3 text-xs font-medium text-green-900 hover:bg-green-50"
                  >
                    View quote
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Count of pending quote approvals (real rows, or demo when empty). */
export function countPendingQuoteApprovals(
  pendingQuotes: QuoteApprovalItem[] | undefined
): number {
  const real = pendingQuotes?.length ?? 0;
  if (real > 0) return real;
  if (typeof window === "undefined") return 0;
  const decided = loadDemoDecisions();
  return buildDemoQuoteApprovals().filter((d) => !decided[d.id]).length;
}
