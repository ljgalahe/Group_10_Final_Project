import type { JournalSource } from "@/lib/journal";

/** Deep-link from a journal entry back to its source record in the app. */
export function journalSourceHref(
  source: JournalSource,
  sourceId: string | null
): string | null {
  if (!sourceId) {
    if (source === "depreciation") return "/equipment";
    if (source === "manual") return null;
    return null;
  }
  switch (source) {
    case "invoice":
      return `/invoices/${sourceId}`;
    case "payment":
      return `/payments/${sourceId}`;
    case "visit":
      return `/visits?visit=${encodeURIComponent(sourceId)}`;
    case "depreciation":
      return "/equipment";
    case "manual":
      return null;
    default:
      return null;
  }
}

/** Link from a posted source back to its journal entry list row. */
export function journalEntryListHref(sourceId: string) {
  return `/reports/journal-entries?sourceId=${encodeURIComponent(sourceId)}`;
}
