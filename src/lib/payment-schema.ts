/** Helpers for payments table columns across evolving teammate schemas. */

export function isMissingColumnError(error: { message?: string; code?: string } | null) {
  if (!error?.message) return false;
  return (
    error.code === "PGRST204" ||
    /could not find the '.*' column/i.test(error.message) ||
    /column .* does not exist/i.test(error.message) ||
    /null value in column/i.test(error.message)
  );
}

export function buildLegacyPaymentNotes(input: {
  notes?: string | null;
  referenceNumber?: string | null;
  recordedByName?: string | null;
}) {
  const meta: string[] = [];
  if (input.referenceNumber) meta.push(`Ref: ${input.referenceNumber}`);
  if (input.recordedByName) meta.push(`Recorded by: ${input.recordedByName}`);
  return [meta.join(" · "), input.notes?.trim()].filter(Boolean).join("\n") || null;
}

export function parseLegacyPaymentNotes(notes: string | null | undefined): {
  referenceNumber: string | null;
  recordedByName: string | null;
  notes: string | null;
} {
  if (!notes) {
    return { referenceNumber: null, recordedByName: null, notes: null };
  }

  const lines = notes.split("\n");
  const metaLine = lines[0] ?? "";
  const hasMeta =
    /^(Ref:|Recorded by:)/i.test(metaLine) || metaLine.includes(" · ");

  let referenceNumber: string | null = null;
  let recordedByName: string | null = null;

  if (hasMeta) {
    const refMatch = metaLine.match(/Ref:\s*([^·]+)/i);
    const byMatch = metaLine.match(/Recorded by:\s*(.+)$/i);
    referenceNumber = refMatch?.[1]?.trim() || null;
    recordedByName = byMatch?.[1]?.trim() || null;
    const rest = lines.slice(1).join("\n").trim();
    return { referenceNumber, recordedByName, notes: rest || null };
  }

  return { referenceNumber: null, recordedByName: null, notes };
}

export function enrichPaymentRow<T extends {
  notes?: string | null;
  reference_number?: string | null;
  recorded_by_name?: string | null;
  payment_number?: string | null;
  status?: string | null;
  applied_amount?: number | null;
  amount?: number | null;
}>(payment: T) {
  const legacy = parseLegacyPaymentNotes(payment.notes);

  let status = payment.status ?? null;
  if (!status) {
    status = "applied";
  }

  return {
    ...payment,
    reference_number:
      payment.reference_number ??
      legacy.referenceNumber ??
      payment.payment_number ??
      null,
    recorded_by_name: payment.recorded_by_name ?? legacy.recordedByName,
    status,
    notes:
      payment.reference_number || payment.recorded_by_name
        ? payment.notes
        : legacy.notes,
  };
}

export async function nextPaymentNumber(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { from: (table: string) => any }
): Promise<string> {
  const { data } = await supabase
    .from("payments")
    .select("payment_number")
    .like("payment_number", "CR-%")
    .order("payment_number", { ascending: false })
    .limit(50);

  let max = 0;
  for (const row of data ?? []) {
    const match = String(row.payment_number ?? "").match(/^CR-(\d+)$/i);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `CR-${String(max + 1).padStart(4, "0")}`;
}
