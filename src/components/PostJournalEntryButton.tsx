"use client";

import Link from "next/link";
import { useActionState } from "react";
import { postAutomatedJournalEntry } from "@/app/actions/journal";
import { journalEntryListHref } from "@/lib/journal-source-href";
import type { JournalSource, JournalStatus } from "@/lib/journal";

type State = { ok: boolean; error?: string } | null;

function ReadyBadge({ ready, label }: { ready: boolean; label: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        ready ? "bg-amber-100 text-amber-900" : "bg-stone-200 text-stone-700"
      }`}
    >
      {label}
    </span>
  );
}

export function PostJournalEntryButton({
  source,
  sourceId,
  journalStatus,
  disabledReason,
  readOnly = false,
}: {
  source: Exclude<JournalSource, "manual">;
  sourceId: string;
  journalStatus?: JournalStatus | null;
  disabledReason?: string;
  /** Show journal status without create / edit actions (manager review). */
  readOnly?: boolean;
}) {
  const [state, action, pending] = useActionState(
    async (_prev: State, formData: FormData): Promise<State> => {
      const result = await postAutomatedJournalEntry(formData);
      if (!result.ok) return { ok: false, error: result.error };
      return { ok: true };
    },
    null
  );

  if (journalStatus || state?.ok) {
    return (
      <div className="flex flex-col items-start gap-1">
        <span className="inline-flex rounded-md border px-2 py-0.5 text-xs font-medium gs-complete-badge">
          Journal Created
        </span>
        {!readOnly ? (
          <Link
            href={journalEntryListHref(sourceId)}
            className="text-xs font-medium text-green-800 hover:underline"
          >
            Edit Journal Entry
          </Link>
        ) : null}
      </div>
    );
  }

  if (disabledReason) {
    return (
      <div className="flex flex-col items-start gap-1">
        <ReadyBadge ready={false} label="Not ready to post" />
        <span className="max-w-[12rem] text-xs text-stone-500">{disabledReason}</span>
      </div>
    );
  }

  if (readOnly) {
    return <ReadyBadge ready label="Ready to post" />;
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <ReadyBadge ready label="Ready to post" />
      <form action={action}>
        <input type="hidden" name="source" value={source} />
        <input type="hidden" name="source_id" value={sourceId} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-green-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create journal entry"}
        </button>
      </form>
      {state?.error ? (
        <span className="text-xs text-red-700">{state.error}</span>
      ) : null}
    </div>
  );
}
