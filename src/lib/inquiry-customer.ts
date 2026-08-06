/** Detect existing-customer inquiries (customer "Request a quote" path). */

const RELATED_CONTRACT_RE =
  /Related contract:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
const EXISTING_SERVICE_RE =
  /^Existing client new service request:\s*(.+)$/im;

export function isExistingCustomerInquiry(inquiry: {
  converted_customer_id?: string | null;
  message?: string | null;
}): boolean {
  if (inquiry.converted_customer_id) return true;
  const message = inquiry.message ?? "";
  return EXISTING_SERVICE_RE.test(message) || RELATED_CONTRACT_RE.test(message);
}

export function relatedContractIdFromMessage(
  message: string | null | undefined
): string | null {
  const match = RELATED_CONTRACT_RE.exec(message ?? "");
  return match?.[1] ?? null;
}
