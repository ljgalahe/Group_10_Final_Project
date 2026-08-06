"use client";

import { useState, useTransition } from "react";
import {
  cancelCustomerContract,
  pauseCustomerContract,
  submitContractInquiry,
} from "@/app/actions/customer-contract-self-service";
import { formatDate } from "@/lib/format";

export function CustomerContractSelfService({
  contractId,
  servicePausedUntil,
  isActive,
}: {
  contractId: string;
  servicePausedUntil?: string | null;
  isActive: boolean;
}) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!isActive) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const pauseEnd = servicePausedUntil
    ? new Date(`${servicePausedUntil}T00:00:00`)
    : null;
  const isPaused = pauseEnd != null && pauseEnd.getTime() >= today.getTime();

  return (
    <div className="mb-6 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-green-950">
        Contract Self-Service
      </h2>
      <p className="mt-1 text-sm text-stone-600">
        Pause Service Temporarily, Send An Inquiry, Or Cancel This Contract.
      </p>

      {isPaused && servicePausedUntil ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Service Paused Until {formatDate(servicePausedUntil)}. Pausing Again
          Extends One More Month.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <form
          action={(fd) => {
            startTransition(() => {
              void pauseCustomerContract(fd);
            });
          }}
        >
          <input type="hidden" name="contract_id" value={contractId} />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-green-900 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-60"
          >
            {isPaused ? "Pause Another Month" : "Pause Contract Temporarily"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setInquiryOpen((v) => !v)}
          className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Contract Inquiry
        </button>

        <button
          type="button"
          onClick={() => setShowCancelConfirm(true)}
          className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-50"
        >
          Cancel Contract
        </button>
      </div>

      {inquiryOpen ? (
        <form
          action={(fd) => {
            startTransition(() => {
              void submitContractInquiry(fd);
            });
          }}
          className="mt-4 space-y-3 rounded-lg border border-stone-200 bg-stone-50 p-4"
        >
          <input type="hidden" name="contract_id" value={contractId} />
          <label className="block text-sm">
            <span className="font-medium text-stone-700">Category</span>
            <select
              name="category"
              defaultValue="question"
              className="mt-1 w-full max-w-md rounded-md border border-stone-300 px-3 py-2"
            >
              <option value="question">Question</option>
              <option value="concern">Concern</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-stone-700">Message</span>
            <textarea
              name="message"
              required
              rows={4}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
              placeholder="How Can We Help With This Contract?"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-green-900 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-60"
          >
            Send Inquiry
          </button>
        </form>
      ) : null}

      {showCancelConfirm ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-contract-title"
        >
          <div className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-6 shadow-lg">
            <h3
              id="cancel-contract-title"
              className="text-lg font-semibold text-green-950"
            >
              Cancel Contract
            </h3>
            <p className="mt-3 text-sm text-stone-700">
              Are you sure you would like to cancel your contract with GreenScape Commercial?
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                Keep Contract
              </button>
              <form
                action={(fd) => {
                  startTransition(() => {
                    void cancelCustomerContract(fd);
                  });
                }}
              >
                <input type="hidden" name="contract_id" value={contractId} />
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-md bg-red-800 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                >
                  Yes, Cancel Contract
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
