"use client";

import {
  approveContractDraft,
  requestContractDraftChanges,
} from "@/app/actions/contract-approvals";
import { Card } from "@/components/ui";
import type { UserRole } from "@/lib/types";

export function ContractDualApprovalPanel({
  contractId,
  approvalState,
  managerApprovedAt,
  accountantApprovedAt,
  role,
}: {
  contractId: string;
  approvalState?: string | null;
  managerApprovedAt?: string | null;
  accountantApprovedAt?: string | null;
  role: UserRole;
}) {
  const pending =
    approvalState === "pending_approvals" ||
    approvalState === "draft" ||
    approvalState === "changes_requested";

  if (!pending && approvalState !== "approved") {
    return null;
  }

  const canApprove = role === "manager" || role === "accountant";
  const alreadyApproved =
    (role === "manager" && Boolean(managerApprovedAt)) ||
    (role === "accountant" && Boolean(accountantApprovedAt));

  return (
    <Card>
      <h2 className="text-lg font-semibold text-green-950">
        Dual approval (Manager + Accountant)
      </h2>
      <p className="mt-1 text-sm text-stone-600">
        Operations drafts the contract. Both Manager and Accountant must approve
        before it is sent to the customer.
      </p>
      <ul className="mt-4 space-y-2 text-sm">
        <li className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${managerApprovedAt ? "bg-green-600" : "bg-stone-300"}`}
          />
          Manager {managerApprovedAt ? "approved" : "pending"}
        </li>
        <li className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${accountantApprovedAt ? "bg-green-600" : "bg-stone-300"}`}
          />
          Accountant {accountantApprovedAt ? "approved" : "pending"}
        </li>
        <li className="text-stone-600">
          State:{" "}
          <span className="font-medium text-green-950">
            {approvalState ?? "approved"}
          </span>
        </li>
      </ul>

      {canApprove && pending ? (
        <div className="mt-4 flex flex-wrap gap-3">
          {!alreadyApproved ? (
            <form action={approveContractDraft}>
              <input type="hidden" name="contract_id" value={contractId} />
              <button
                type="submit"
                className="rounded-md bg-green-900 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
              >
                Approve as {role === "manager" ? "Manager" : "Accountant"}
              </button>
            </form>
          ) : (
            <p className="text-sm text-green-800">
              Your approval is recorded. Waiting on the other role.
            </p>
          )}
          <form action={requestContractDraftChanges} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="contract_id" value={contractId} />
            <input
              name="change_notes"
              placeholder="Request changes…"
              className="rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-md border border-amber-700 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-50"
            >
              Request changes
            </button>
          </form>
        </div>
      ) : null}
    </Card>
  );
}
