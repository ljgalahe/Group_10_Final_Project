/** Helpers for demo customer payment methods (no real card processing). */

export function extractLastFour(accountDetails: string): string | null {
  const digits = accountDetails.replace(/\D/g, "");
  if (digits.length < 4) return null;
  return digits.slice(-4);
}

export function buildPaymentMethodDisplayLabel(
  nickname: string | null | undefined,
  accountDetails: string
): string | null {
  const last4 = extractLastFour(accountDetails);
  if (!last4) return null;

  const nick = nickname?.trim();
  const base = `Card ending in ${last4}`;
  return nick ? `${nick} · ${base}` : base;
}
