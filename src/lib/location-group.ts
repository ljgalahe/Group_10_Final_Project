/** Simple zip/city token from a free-text address for proximity grouping. */
export function locationKey(address: string | null | undefined): string {
  if (!address) return "unknown";
  const zip = address.match(/\b\d{5}\b/)?.[0];
  if (zip) return zip;
  const parts = address.split(",").map((p) => p.trim().toLowerCase());
  return parts[parts.length - 2] || parts[0] || "unknown";
}
