"use client";

import Link from "next/link";
import { useState } from "react";
import {
  declineCustomerContract,
  signCustomerContract,
} from "@/app/actions/customer-contract-sign";
import { StatusBadge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";

type ProposedContract = {
  id: string;
  title: string;
  monthly_fee?: number | null;
  season_start?: string | null;
  season_end?: string | null;
  customer_signed_at?: string | null;
};

export function ProposedContractSection({
  contracts,
}: {
  contracts: ProposedContract[];
}) {
  const proposed = contracts.filter((c) => !c.customer_signed_at);
  const [modeById, setModeById] = useState<
    Record<string, "sign" | "decline" | null>
  >({});

  function setMode(id: string, mode: "sign" | "decline" | null) {
    setModeById((prev) => ({ ...prev, [id]: mode }));
  }

  return (
    <section className="mb-6 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-4 shadow-sm">
      <h2 className="text-lg font-semibold text-green-950">
        Proposed Contract
      </h2>

      {proposed.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">
          No Proposed Contracts Need Your Signature.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-amber-100 overflow-hidden rounded-lg border border-amber-200 bg-white">
          {proposed.map((contract) => {
            const mode = modeById[contract.id] ?? null;
            return (
              <li key={contract.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/contracts/${contract.id}`}
                      className="font-medium text-green-900 hover:underline"
                    >
                      {contract.title}
                    </Link>
                    <p className="mt-0.5 text-sm text-stone-500">
                      {contract.monthly_fee != null
                        ? `${formatCurrency(Number(contract.monthly_fee))} / Mo`
                        : "Fee On Detail"}
                      {contract.season_start && contract.season_end
                        ? ` · ${formatDate(contract.season_start)} – ${formatDate(contract.season_end)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status="needs_review_and_signature" />
                    <button
                      type="button"
                      onClick={() =>
                        setMode(contract.id, mode === "sign" ? null : "sign")
                      }
                      className="rounded-md bg-green-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800"
                    >
                      Approve &amp; Sign
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setMode(
                          contract.id,
                          mode === "decline" ? null : "decline"
                        )
                      }
                      className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
                    >
                      Decline
                    </button>
                  </div>
                </div>

                {mode === "sign" ? (
                  <form
                    action={signCustomerContract}
                    className="mt-3 space-y-3 rounded-lg border border-green-100 bg-green-50/60 p-3"
                  >
                    <input type="hidden" name="contract_id" value={contract.id} />
                    <label className="block text-sm">
                      <span className="text-stone-600">
                        Full Name (Signature)
                      </span>
                      <input
                        name="signature_name"
                        required
                        className="mt-1 w-full max-w-md rounded-md border border-stone-300 px-3 py-2"
                        placeholder="Type Your Full Name"
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="submit"
                        className="rounded-md bg-green-900 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
                      >
                        Approve &amp; Sign
                      </button>
                      <Link
                        href={`/contracts/${contract.id}`}
                        className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                      >
                        View Full Contract
                      </Link>
                    </div>
                  </form>
                ) : null}

                {mode === "decline" ? (
                  <form
                    action={declineCustomerContract}
                    className="mt-3 space-y-3 rounded-lg border border-amber-100 bg-amber-50/80 p-3"
                  >
                    <input type="hidden" name="contract_id" value={contract.id} />
                    <label className="block text-sm">
                      <span className="text-stone-700 font-medium">
                        Questions Or Concerns
                      </span>
                      <textarea
                        name="decline_notes"
                        required
                        rows={3}
                        className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
                        placeholder="Share Your Questions Or Concerns"
                      />
                    </label>
                    <button
                      type="submit"
                      className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-50"
                    >
                      Decline Proposed Contract
                    </button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
