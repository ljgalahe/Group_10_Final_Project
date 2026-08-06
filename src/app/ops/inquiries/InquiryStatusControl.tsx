"use client";

import { scheduleInquirySiteSurvey } from "@/app/ops/inquiries/actions";

/**
 * One pipeline stage for the Pre-Service Site Survey column:
 * Needs Scheduling → Survey Scheduled → Survey Completed → Quote.
 */
export function InquiryStatusControl({
  inquiryId,
  quoteId,
  surveyStatus,
  surveyId,
}: {
  inquiryId: string;
  currentStatus?: string;
  quoteId: string | null;
  surveyStatus?: string | null;
  surveyId?: string | null;
}) {
  const survey = surveyStatus ?? "needs_scheduling";
  const hasSurvey = Boolean(surveyId);
  const quoteReady = survey === "completed" && Boolean(quoteId);

  if (!hasSurvey || survey === "needs_scheduling") {
    return (
      <form action={scheduleInquirySiteSurvey}>
        <input type="hidden" name="id" value={inquiryId} />
        <button
          type="submit"
          className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
        >
          Needs Scheduling
        </button>
      </form>
    );
  }

  if (survey === "scheduled") {
    return (
      <div className="flex flex-col gap-1">
        <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">
          Survey Scheduled
        </span>
        <a
          href={`/ops/site-surveys/${surveyId}`}
          className="text-xs font-medium text-green-800 underline"
        >
          Open Site Survey
        </a>
      </div>
    );
  }

  if (survey === "completed") {
    return (
      <div className="flex flex-col gap-1">
        <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
          Survey Completed
        </span>
        <a
          href={`/ops/site-surveys/${surveyId}`}
          className="text-xs font-medium text-green-800 underline"
        >
          View Survey
        </a>
        {quoteReady ? (
          <a
            href={`/quotes/${quoteId}`}
            className="text-xs font-medium text-green-800 underline"
          >
            Open Quote
          </a>
        ) : (
          <a
            href={`/ops/site-surveys/${surveyId}`}
            className="text-xs font-medium text-green-800 underline"
          >
            Draft Quote From Survey
          </a>
        )}
      </div>
    );
  }

  return (
    <form action={scheduleInquirySiteSurvey}>
      <input type="hidden" name="id" value={inquiryId} />
      <button
        type="submit"
        className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
      >
        Needs Scheduling
      </button>
    </form>
  );
}
