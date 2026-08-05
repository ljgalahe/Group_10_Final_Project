/** Customer notes (dogs, parking, access) shown to crew from the customer profile. */

import { CREW_CUSTOMER_NOTES_HELPER } from "@/lib/customer-notes";

export function CrewSiteNotes({
  notes,
  compact = false,
}: {
  notes: string[];
  compact?: boolean;
}) {
  if (notes.length === 0) return null;

  if (compact) {
    return (
      <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-900">
          Customer notes
        </p>
        <ul className="mt-1 list-inside list-disc text-xs text-amber-950/90">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-amber-950">
        Customer notes
      </h4>
      <p className="mt-1 text-xs text-amber-900/80">
        {CREW_CUSTOMER_NOTES_HELPER}
      </p>
      <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-amber-950">
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
}
