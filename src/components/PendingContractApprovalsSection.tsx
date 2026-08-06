import Link from "next/link";
import { StatusBadge } from "@/components/ui";
import { getContractDisplayStatus } from "@/lib/contract-status";
import { formatDate } from "@/lib/format";
import type { ContractStatus } from "@/lib/types";

type PendingContract = {
  id: string;
  title: string;
  status: ContractStatus;
  approval_state?: string | null;
  season_start?: string | null;
  season_end?: string | null;
  manager_approved_at?: string | null;
  accountant_approved_at?: string | null;
  customers?: { name?: string | null } | null;
};

export function PendingContractApprovalsSection({
  title,
  description,
  contracts,
  emptyMessage,
}: {
  title: string;
  description: string;
  contracts: PendingContract[];
  emptyMessage?: string;
}) {
  return (
    <section className="mb-6 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-4 shadow-sm">
      <h2 className="text-lg font-semibold text-green-950">{title}</h2>
      <p className="mt-1 text-sm text-stone-600">{description}</p>

      {contracts.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">
          {emptyMessage ?? "No contracts awaiting approval."}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-amber-100 overflow-hidden rounded-lg border border-amber-200 bg-white">
          {contracts.map((contract) => {
            const customerName =
              (contract.customers as { name?: string } | null)?.name ?? null;
            return (
              <li
                key={contract.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <Link
                    href={`/contracts/${contract.id}`}
                    className="font-medium text-green-900 hover:underline"
                  >
                    {contract.title}
                  </Link>
                  <p className="mt-0.5 text-sm text-stone-500">
                    {customerName ? `${customerName} · ` : ""}
                    {contract.season_start && contract.season_end
                      ? `${formatDate(contract.season_start)} – ${formatDate(contract.season_end)}`
                      : "Open dual approval on the contract detail page"}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-stone-600">
                    <span>
                      Manager:{" "}
                      {contract.manager_approved_at ? "Approved" : "Pending"}
                    </span>
                    <span>
                      Accountant:{" "}
                      {contract.accountant_approved_at ? "Approved" : "Pending"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge
                    status={getContractDisplayStatus({
                      status: contract.status,
                      approval_state: contract.approval_state ?? null,
                    })}
                  />
                  <Link
                    href={`/contracts/${contract.id}`}
                    className="rounded-md bg-green-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800"
                  >
                    Review &amp; Approve
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
