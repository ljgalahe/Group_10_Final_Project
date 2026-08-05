export function formatPaymentNumber(paymentNumber: string) {
  return paymentNumber;
}

export async function nextPaymentNumber(
  supabase: Awaited<ReturnType<typeof import("@/lib/auth-access").createDataClient>>
) {
  const { count } = await supabase
    .from("payments")
    .select("*", { count: "exact", head: true });
  return `CR-${String((count ?? 0) + 1).padStart(4, "0")}`;
}
