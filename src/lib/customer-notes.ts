/** Parse customer notes (newline-separated property access notes). */

export const DEFAULT_CUSTOMER_NOTES = [
  "Confirm Site Access And Any Posted Hazards Before Starting Work.",
  "Report Unsafe Animals, Broken Fencing, Or Access Issues To The Crew Lead Immediately.",
];

/** Hint for the profile textarea (shown while the field is empty). */
export const CUSTOMER_NOTES_PLACEHOLDER =
  "Dogs Near The Rear Fence — Please Keep The Gate Latched.\nPark Trailers In The Service Bay Only.\nGate Code Is 4521 For The Rear Entrance.";

/** Short helper under the Customer notes label on Profile. */
export const CUSTOMER_NOTES_HELPER =
  "Tell crews about dogs, parking, gate codes, hazards, and how to access the property.";

/** Short helper under Customer notes for crew visit details. */
export const CREW_CUSTOMER_NOTES_HELPER =
  "Notes the customer shared about this property — access, animals, parking, and hazards.";

/**
 * Capitalize the first letter of each word (heading style),
 * including after spaces and newlines. Leaves the rest of each word as typed.
 */
export function capitalizeWords(text: string): string {
  return text.replace(
    /(^|[\s\n])(\p{L})/gu,
    (_match, before: string, letter: string) => before + letter.toUpperCase()
  );
}

/** Format a single note line for storage/display. */
export function formatNoteLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) return "";
  return capitalizeWords(trimmed);
}

/** Normalize multi-line notes for storage. */
export function formatCustomerNotes(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map(formatNoteLine)
    .filter(Boolean)
    .join("\n");
}

export function parseCustomerNotes(
  raw: string | null | undefined
): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/\r?\n/)
    .map(formatNoteLine)
    .filter(Boolean);
}

/** For crew UI: customer notes, or generic fallbacks if empty. */
export function customerNotesForCrew(
  raw: string | null | undefined
): string[] {
  const parsed = parseCustomerNotes(raw);
  return parsed.length > 0 ? parsed : DEFAULT_CUSTOMER_NOTES;
}
