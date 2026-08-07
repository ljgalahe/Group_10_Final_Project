"use client";

import { useId, useState } from "react";
import { CenteredModal } from "@/components/CenteredModal";

export type AccountingReviewInput = {
  contractApproved: boolean;
  pricingVerified: boolean;
  billingScheduleVerified: boolean;
  changeOrdersReviewed: boolean;
  profitabilityAboveTarget: boolean;
};

function CheckRow({
  ok,
  label,
}: {
  ok: boolean;
  label: string;
}) {
  return (
    <li className="flex items-start gap-2 text-sm text-stone-800">
      <span
        className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
          ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        }`}
      >
        {ok ? "✓" : "✕"}
      </span>
      <span>{label}</span>
    </li>
  );
}

export function AccountingReviewButton({
  review,
}: {
  review: AccountingReviewInput;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const readyForClose =
    review.contractApproved &&
    review.pricingVerified &&
    review.billingScheduleVerified &&
    review.changeOrdersReviewed &&
    review.profitabilityAboveTarget;

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-800 hover:bg-stone-200"
      >
        Accounting Review
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <CenteredModal
        open={open}
        onClose={() => setOpen(false)}
        labelledBy={panelId}
        backdropClassName="bg-stone-900/40"
      >
        <div
          id={panelId}
          className="w-72 rounded-xl border border-stone-200 bg-stone-100 p-4 shadow-lg"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
            Accounting review
          </p>
          <ul className="space-y-2">
            <CheckRow
              ok={review.contractApproved}
              label="Contract Approved"
            />
            <CheckRow ok={review.pricingVerified} label="Pricing Verified" />
            <CheckRow
              ok={review.billingScheduleVerified}
              label="Billing Schedule Verified"
            />
            <CheckRow
              ok={review.changeOrdersReviewed}
              label="Change Orders Reviewed"
            />
            <CheckRow
              ok={review.profitabilityAboveTarget}
              label="Profitability Above Target"
            />
          </ul>
          <div
            className={`mt-4 rounded-lg px-3 py-2 text-xs font-semibold ${
              readyForClose
                ? "bg-green-100 text-green-900"
                : "bg-stone-200 text-stone-600"
            }`}
          >
            {readyForClose
              ? "Ready for Month-End Close"
              : "Not Ready for Month-End Close"}
          </div>
        </div>
      </CenteredModal>
    </>
  );
}

export function hasControlsBreach(review: AccountingReviewInput) {
  return (
    !review.contractApproved ||
    !review.pricingVerified ||
    !review.billingScheduleVerified ||
    !review.changeOrdersReviewed ||
    !review.profitabilityAboveTarget
  );
}

export function buildAccountingReview(input: {
  status: string;
  monthlyFee: number | null;
  billingMethod: string | null;
  seasonStart: string | null;
  seasonEnd: string | null;
  hasPendingEdits: boolean;
  hasQuotedChangeOrders: boolean;
  unprofitable: boolean;
}): AccountingReviewInput {
  return {
    contractApproved: input.status === "active" && !input.hasPendingEdits,
    pricingVerified: Number(input.monthlyFee ?? 0) > 0,
    billingScheduleVerified: Boolean(
      input.billingMethod && input.seasonStart && input.seasonEnd
    ),
    changeOrdersReviewed: !input.hasQuotedChangeOrders,
    profitabilityAboveTarget: !input.unprofitable,
  };
}
