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

  const canApprove = role === "manager";
  // Keep Approve available while pending so Manager can finalize rows that
  // were stamped under the old dual-approval flow.
  const showApproveButton = canApprove && pending;

  return (
    <Card>
      <h2 className="text-lg font-semibold text-green-950">
        Management Approval
      </h2>
      <ul className="mt-4 space-y-2 text-sm">
        <li className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              approvalState === "approved" && managerApprovedAt
                ? "bg-green-600"
                : "bg-stone-300"
            }`}
          />
          Manager{" "}
          {approvalState === "approved" && managerApprovedAt
            ? "approved"
            : "pending"}
        </li>
        <li className="text-stone-600">
          State:{" "}
          <span className="font-medium text-green-950">
            {approvalState === "pending_approvals"
              ? "Waiting For Approval"
              : approvalState === "changes_requested"
                ? "Changes Requested"
                : approvalState === "approved"
                  ? "Approved"
                  : (approvalState ?? "approved")}
          </span>
        </li>
      </ul>

      {showApproveButton ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <form action={approveContractDraft}>
            <input type="hidden" name="contract_id" value={contractId} />
            <button
              type="submit"
              className="rounded-md bg-green-900 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
            >
              Approve as Manager
            </button>
          </form>
          <form
            action={requestContractDraftChanges}
            className="flex flex-wrap items-end gap-2"
          >
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
