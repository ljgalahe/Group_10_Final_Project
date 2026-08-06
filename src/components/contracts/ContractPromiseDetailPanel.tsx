"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { approveExtraWork, declineExtraWork } from "@/app/actions/business";
import { ContractPromiseSummary } from "@/components/contracts/ContractPromiseUI";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  effectivePromiseStatus,
  isNotScheduledVisit,
  promiseStatusLabel,
  type ContractProgress,
  type PromiseRowStatus,
  type PromiseVisitDetail,
} from "@/lib/contract-controls";
import { crewLeadNameForCustomer } from "@/lib/visit-demo";
import {
  isExtraDemoApproved,
  isExtraDemoDeclined,
  loadContractLocalExtraApprovals,
  saveContractLocalExtraApproval,
  saveContractLocalExtraDecline,
} from "@/lib/extra-work-approvals";

type ExtraOrder = {
  id: string;
  title: string;
  description: string | null;
  quoted_amount: number;
  status: string;
};

function statusTone(status: PromiseRowStatus) {
  if (status === "complete") return "gs-complete-badge border";
  if (status === "missed") return "border border-red-200 bg-red-100 text-red-800";
  if (status === "not_scheduled")
    return "border border-stone-300 bg-stone-200 text-stone-800";
  if (status === "partially_scheduled")
    return "border border-amber-200 bg-amber-50 text-amber-950";
  if (status === "unapproved_extra")
    return "border border-amber-200 bg-amber-100 text-amber-900";
  if (status === "scheduled") return "border border-sky-200 bg-sky-100 text-sky-900";
  return "border border-stone-200 bg-stone-100 text-stone-700";
}

function matchExtraOrder(service: string, orders: ExtraOrder[]) {
  const needle = service.trim().toLowerCase();
  return (
    orders.find((o) => o.title.trim().toLowerCase() === needle) ??
    orders.find((o) => o.title.trim().toLowerCase().includes(needle)) ??
    orders.find((o) => needle.includes(o.title.trim().toLowerCase()))
  );
}

function missReason(visit: PromiseVisitDetail) {
  return (
    visit.note?.trim() ||
    "Reason not recorded — operations can confirm with the crew lead."
  );
}

/**
 * Manager contract ops: review promise vs actual and approve extra work only.
 * Scheduling is handled by the operations team after approval when needed.
 */
export function ContractPromiseDetailPanel({
  progress,
  extraWork,
}: {
  progress: ContractProgress;
  extraWork: ExtraOrder[];
}) {
  const [approvedExtras, setApprovedExtras] = useState<string[]>([]);
  const [declinedExtras, setDeclinedExtras] = useState<string[]>([]);
  const [openService, setOpenService] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const fromList = loadContractLocalExtraApprovals(progress.contractId);
    const fromDemo = progress.rows
      .filter((r) => r.status === "unapproved_extra")
      .filter((r) => isExtraDemoApproved(progress.contractId, r.service))
      .map((r) => r.service);
    const declined = progress.rows
      .filter((r) => r.status === "unapproved_extra")
      .filter((r) => isExtraDemoDeclined(progress.contractId, r.service))
      .map((r) => r.service);
    setApprovedExtras([...new Set([...fromList, ...fromDemo])]);
    setDeclinedExtras(declined);
  }, [progress.contractId, progress.rows]);

  const quotedExtras = useMemo(
    () => extraWork.filter((w) => w.status === "quoted"),
    [extraWork]
  );

  function approveLocalExtra(service: string) {
    const next = saveContractLocalExtraApproval(progress.contractId, service);
    setApprovedExtras(next);
    setDeclinedExtras((cur) => cur.filter((name) => name !== service));
    setMessage(
      `${service} approved. Operations can add it to the schedule if needed.`
    );
  }

  function declineLocalExtra(service: string) {
    saveContractLocalExtraDecline(progress.contractId, service);
    setApprovedExtras((cur) => cur.filter((name) => name !== service));
    setDeclinedExtras((cur) => [...new Set([...cur, service])]);
    setMessage(`${service} declined.`);
  }

  return (
    <div className="mt-4 space-y-4">
      <ContractPromiseSummary progress={progress} />

      {message ? (
        <p
          className={`rounded-md border px-3 py-2 text-sm ${
            message.includes("declined")
              ? "border-red-200 bg-red-50 text-red-900"
              : "border-green-200 bg-green-50 text-green-900"
          }`}
        >
          {message}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-stone-200">
        <table className="min-w-full text-sm">
          <thead className="bg-green-950 text-left text-white">
            <tr>
              <th className="px-4 py-3 font-medium">Service / job</th>
              <th className="px-4 py-3 font-medium">Contract</th>
              <th className="px-4 py-3 font-medium">Completed</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Manager Action</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {progress.rows.map((row) => {
              const open = openService === row.service;
              const missedVisits = row.visits.filter(
                (v) => v.outcome === "skipped" && !isNotScheduledVisit(v)
              );
              const extraVisits = row.visits.filter(
                (v) => v.outcome === "extra"
              );
              const matchedQuoted = matchExtraOrder(row.service, quotedExtras);
              const matchedAny = matchExtraOrder(row.service, extraWork);
              const isExtra = row.status === "unapproved_extra";
              const displayStatus = effectivePromiseStatus(row);
              const dbApproved =
                matchedAny?.status === "approved" ||
                matchedAny?.status === "completed" ||
                (isExtra && row.completed > 0);
              const dbDeclined = matchedAny?.status === "declined";
              const locallyApproved =
                approvedExtras.includes(row.service) || Boolean(dbApproved);
              const locallyDeclined =
                declinedExtras.includes(row.service) || Boolean(dbDeclined);
              const needsExtraApproval =
                isExtra && !locallyApproved && !locallyDeclined;
              const hasMisses = missedVisits.length > 0;

              return (
                <Fragment key={row.service}>
                  <tr className="border-t border-stone-100">
                    <td className="px-4 py-3 font-medium text-stone-900">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenService((cur) =>
                            cur === row.service ? null : row.service
                          )
                        }
                        className="text-left hover:underline"
                      >
                        {row.service}
                        {hasMisses ||
                        needsExtraApproval ||
                        locallyApproved ||
                        locallyDeclined ? (
                          <span className="ml-2 text-xs font-normal text-stone-500">
                            {open ? "Hide details" : "View details"}
                          </span>
                        ) : null}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {row.contractLabel}
                    </td>
                    <td className="px-4 py-3 text-stone-800">{row.completed}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${
                          locallyApproved
                            ? "gs-complete-badge border"
                            : locallyDeclined
                              ? "border border-red-200 bg-red-100 text-red-800"
                              : statusTone(displayStatus)
                        }`}
                      >
                        {locallyApproved
                          ? "Extra Approved"
                          : locallyDeclined
                            ? "Extra Declined"
                            : promiseStatusLabel(displayStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {needsExtraApproval ? (
                        <div className="flex flex-wrap gap-2">
                          {matchedQuoted ? (
                            <form action={approveExtraWork}>
                              <input
                                type="hidden"
                                name="extra_work_id"
                                value={matchedQuoted.id}
                              />
                              <button
                                type="submit"
                                onClick={() => approveLocalExtra(row.service)}
                                className="gs-btn-approve rounded-md px-3 py-1.5 text-xs font-medium"
                              >
                                Approve
                              </button>
                            </form>
                          ) : (
                            <button
                              type="button"
                              onClick={() => approveLocalExtra(row.service)}
                              className="gs-btn-approve rounded-md px-3 py-1.5 text-xs font-medium"
                            >
                              Approve
                            </button>
                          )}
                          {matchedQuoted ? (
                            <form action={declineExtraWork}>
                              <input
                                type="hidden"
                                name="extra_work_id"
                                value={matchedQuoted.id}
                              />
                              <button
                                type="submit"
                                onClick={() => declineLocalExtra(row.service)}
                                className="rounded-md border border-red-700 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-50"
                              >
                                Decline
                              </button>
                            </form>
                          ) : (
                            <button
                              type="button"
                              onClick={() => declineLocalExtra(row.service)}
                              className="rounded-md border border-red-700 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-50"
                            >
                              Decline
                            </button>
                          )}
                        </div>
                      ) : locallyApproved ? (
                        <span className="inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold gs-complete-badge">
                          Approved
                        </span>
                      ) : locallyDeclined ? (
                        <span className="text-xs text-red-800">Declined</span>
                      ) : (
                        <span className="text-xs text-stone-400">
                          No Approval Needed
                        </span>
                      )}
                    </td>
                  </tr>

                  {open && (hasMisses || isExtra) ? (
                    <tr className="border-t border-stone-100 bg-stone-50/80">
                      <td colSpan={5} className="px-4 py-4">
                        {hasMisses ? (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-red-800">
                              Missed after scheduled
                            </p>
                            <ul className="space-y-2">
                              {missedVisits.map((visit) => (
                                <li
                                  key={`${row.service}-${visit.date}`}
                                  className="rounded-lg border border-red-200 bg-white p-3"
                                >
                                  <p className="font-medium text-stone-900">
                                    Missed {formatDate(visit.date)}
                                  </p>
                                  <p className="mt-1 text-sm text-stone-600">
                                    <span className="font-medium text-stone-800">
                                      Reason:{" "}
                                    </span>
                                    {missReason(visit)}
                                  </p>
                                  <p className="mt-1 text-sm text-stone-600">
                                    <span className="font-medium text-stone-800">
                                      Crew leader:{" "}
                                    </span>
                                    {crewLeadNameForCustomer(
                                      progress.customerName
                                    )}
                                  </p>
                                  <p className="mt-1 text-xs text-stone-500">
                                    Operations will reschedule if needed.
                                  </p>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {isExtra ? (
                          <div
                            className={
                              hasMisses ? "mt-4 space-y-3" : "space-y-3"
                            }
                          >
                            <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                              Extra work —{" "}
                              {locallyApproved
                                ? "approved"
                                : locallyDeclined
                                  ? "declined"
                                  : "awaiting your approval"}
                            </p>
                            <p className="text-sm text-stone-600">
                              {locallyApproved
                                ? "Approved. Operations can add this to the schedule if needed."
                                : locallyDeclined
                                  ? "Declined. This extra work will not be scheduled."
                                  : "Approve or decline this extra-cost request. After approval, operations can schedule the work."}
                            </p>
                            {extraVisits.length > 0 ? (
                              <ul className="space-y-1 text-sm text-stone-700">
                                {extraVisits.map((visit) => (
                                  <li
                                    key={`${row.service}-extra-${visit.date}`}
                                  >
                                    Requested {formatDate(visit.date)}
                                    {visit.note ? ` · ${visit.note}` : ""}
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                            {needsExtraApproval ? (
                              matchedQuoted ? (
                                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-white p-3">
                                  <div>
                                    <p className="font-medium text-stone-900">
                                      {matchedQuoted.title}
                                    </p>
                                    <p className="text-sm text-stone-500">
                                      {matchedQuoted.description ??
                                        "Quoted extra work order"}
                                    </p>
                                  </div>
                                  <span className="font-semibold text-amber-950">
                                    {formatCurrency(
                                      Number(matchedQuoted.quoted_amount)
                                    )}
                                  </span>
                                  <form action={approveExtraWork}>
                                    <input
                                      type="hidden"
                                      name="extra_work_id"
                                      value={matchedQuoted.id}
                                    />
                                    <button
                                      type="submit"
                                      onClick={() =>
                                        approveLocalExtra(row.service)
                                      }
                                      className="gs-btn-approve rounded-md px-3 py-1.5 text-xs font-medium"
                                    >
                                      Approve
                                    </button>
                                  </form>
                                  <form action={declineExtraWork}>
                                    <input
                                      type="hidden"
                                      name="extra_work_id"
                                      value={matchedQuoted.id}
                                    />
                                    <button
                                      type="submit"
                                      onClick={() =>
                                        declineLocalExtra(row.service)
                                      }
                                      className="rounded-md border border-red-700 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-50"
                                    >
                                      Decline
                                    </button>
                                  </form>
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      approveLocalExtra(row.service)
                                    }
                                    className="gs-btn-approve rounded-md px-3 py-1.5 text-xs font-medium"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      declineLocalExtra(row.service)
                                    }
                                    className="rounded-md border border-red-700 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-50"
                                  >
                                    Decline
                                  </button>
                                </div>
                              )
                            ) : null}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
