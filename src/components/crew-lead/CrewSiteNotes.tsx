import { siteNotesForCustomer } from "@/components/crew-lead/visitWorkDefaults";

/** Crew-lead site notes (hazards, animals, access) for a visit/customer. */
export function CrewSiteNotes({
  customerId,
  compact = false,
}: {
  customerId: string;
  compact?: boolean;
}) {
  const notes = siteNotesForCustomer(customerId);

  if (compact) {
    return (
      <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-900">
          Site Notes
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
        Additional Notes
      </h4>
      <p className="mt-1 text-xs text-amber-900/80">
        Other information the crew lead should know before or during this visit.
      </p>
      <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-amber-950">
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
}
