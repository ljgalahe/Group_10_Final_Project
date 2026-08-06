"use client";

import {
  convertInquiryToQuote,
  updateInquiryStatus,
} from "@/app/ops/inquiries/actions";

const STATUSES = [
  "New",
  "Under review",
  "Closed - Won",
  "Closed - Lost",
] as const;

export function InquiryStatusControl({
  inquiryId,
  currentStatus,
  quoteId,
}: {
  inquiryId: string;
  currentStatus: string;
  quoteId: string | null;
}) {
  const converted = currentStatus === "Converted to quote";

  return (
    <div className="flex flex-col items-start gap-2">
      {converted ? (
        <>
          <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
            Converted to quote
          </span>
          {quoteId ? (
            <a
              href={`/quotes/${quoteId}`}
              className="text-xs font-medium text-green-800 underline"
            >
              Open in Quotes
            </a>
          ) : null}
        </>
      ) : (
        <>
          <form action={updateInquiryStatus} className="inline-flex">
            <input type="hidden" name="id" value={inquiryId} />
            <select
              name="status"
              defaultValue={
                STATUSES.includes(currentStatus as (typeof STATUSES)[number])
                  ? currentStatus
                  : "New"
              }
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              className="rounded-md border border-stone-300 bg-white px-2 py-1.5 text-xs font-medium text-stone-800 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-700/20"
              aria-label="Inquiry status"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </form>
          <form action={convertInquiryToQuote}>
            <input type="hidden" name="id" value={inquiryId} />
            <button
              type="submit"
              className="rounded-md bg-green-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
            >
              Convert to Quote
            </button>
          </form>
        </>
      )}
    </div>
  );
}
