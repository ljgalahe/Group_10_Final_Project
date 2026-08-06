import {
  approveContractChangeRequest,
  approveExtraWork,
  rejectContractChangeRequest,
} from "@/app/actions/business";
import { StatusBadge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";

export type ChangeRequestRow = {
  id: string;
  contract_id: string;
  summary: string | null;
  created_at: string;
  proposed_contract: Record<string, unknown>;
  proposed_customer: Record<string, unknown> | null;
};

export type AuditLogRow = {
  id: string;
  contract_id: string;
  action: string;
  actor_role: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

export type ChangeOrderRow = {
  id: string;
  title: string;
  description: string | null;
  quoted_amount: number;
  status: string;
};

function actionLabel(action: string) {
  return action.replaceAll("_", " ");
}

export function ContractInternalControls({
  contractId,
  pendingRequests,
  auditLogs,
  changeOrders,
  openVisitCount,
  invoiceError,
}: {
  contractId: string;
  pendingRequests: ChangeRequestRow[];
  auditLogs: AuditLogRow[];
  changeOrders: ChangeOrderRow[];
  openVisitCount: number;
  invoiceError?: string | null;
}) {
  const quotedOrders = changeOrders.filter((order) => order.status === "quoted");

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-semibold">Accountant Internal Controls</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-900">
          <li>Contract edits require manager approval before they apply</li>
          <li>Change orders follow a quoted → approved workflow</li>
          <li>Role permissions: only accountant can submit contract edits here</li>
          <li>All actions are written to the contract audit log</li>
          <li>Invoicing is blocked while scheduled visits remain incomplete</li>
        </ul>
        {openVisitCount > 0 ? (
          <p className="mt-3 font-medium text-red-700">
            Invoice blocked: {openVisitCount} scheduled visit
            {openVisitCount === 1 ? "" : "s"} still incomplete.
          </p>
        ) : (
          <p className="mt-3 font-medium text-green-800">
            Invoice ready: no incomplete scheduled visits on this contract.
          </p>
        )}
        {invoiceError === "incomplete_visits" ? (
          <p className="mt-2 rounded-md bg-red-100 px-3 py-2 text-red-800">
            Generate Invoice was blocked until all visits are marked complete.
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-green-950">
            Manager Approval Queue
          </h3>
          <p className="mt-1 text-xs text-stone-500">
            Pending contract edits await manager approval.
          </p>
          {pendingRequests.length === 0 ? (
            <p className="mt-3 text-sm text-stone-500">No pending edit requests.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {pendingRequests.map((request) => (
                <li
                  key={request.id}
                  className="rounded-lg border border-stone-200 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge status="pending" />
                    <span className="text-xs text-stone-400">
                      {formatDate(request.created_at.slice(0, 10))}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-stone-700">
                    {request.summary ?? "Contract edit request"}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    Value:{" "}
                    {request.proposed_contract.monthly_fee != null
                      ? formatCurrency(
                          Number(request.proposed_contract.monthly_fee)
                        )
                      : "—"}{" "}
                    · Customer:{" "}
                    {String(request.proposed_customer?.name ?? "—")}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <form action={approveContractChangeRequest}>
                      <input type="hidden" name="request_id" value={request.id} />
                      <button
                        type="submit"
                        className="gs-btn-approve rounded-md px-3 py-1.5 text-xs font-medium"
                      >
                        Approve as Manager
                      </button>
                    </form>
                    <form action={rejectContractChangeRequest}>
                      <input type="hidden" name="request_id" value={request.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
                      >
                        Reject
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-green-950">
            Change Order Workflow
          </h3>
          <p className="mt-1 text-xs text-stone-500">
            Quoted change orders must be approved before billing.
          </p>
          {changeOrders.length === 0 ? (
            <p className="mt-3 text-sm text-stone-500">No change orders.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {changeOrders.map((order) => (
                <li
                  key={order.id}
                  className="rounded-lg border border-stone-200 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-stone-800">
                      {order.title}
                    </p>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="mt-1 text-sm font-semibold text-green-900">
                    {formatCurrency(Number(order.quoted_amount))}
                  </p>
                  {order.status === "quoted" ? (
                    <form action={approveExtraWork} className="mt-2">
                      <input
                        type="hidden"
                        name="extra_work_id"
                        value={order.id}
                      />
                      <button
                        type="submit"
                        className="gs-btn-approve rounded-md px-3 py-1.5 text-xs font-medium"
                      >
                        Approve change order
                      </button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {quotedOrders.length > 0 ? (
            <p className="mt-3 text-xs text-amber-800">
              {quotedOrders.length} change order
              {quotedOrders.length === 1 ? "" : "s"} awaiting approval.
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-green-950">Audit Log</h3>
          <p className="mt-1 text-xs text-stone-500">
            History of contract changes and control actions.
          </p>
          {auditLogs.length === 0 ? (
            <p className="mt-3 text-sm text-stone-500">No audit events yet.</p>
          ) : (
            <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">
              {auditLogs.map((log) => (
                <li
                  key={log.id}
                  className="rounded-lg border border-stone-200 px-3 py-2"
                >
                  <p className="text-sm font-medium capitalize text-stone-800">
                    {actionLabel(log.action)}
                  </p>
                  <p className="text-xs text-stone-500">
                    {log.actor_role} ·{" "}
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="text-xs text-stone-400">
        Contract control scope: accountant contracts only ({contractId.slice(0, 8)}
        …)
      </p>
    </div>
  );
}
