/** Customer profile helpers: payment methods & notification prefs (demo). */

export type PaymentMethodType = "card" | "bank";

export type NotificationChannel = "email" | "phone" | "both";

export type NotificationTopicKey =
  | "invoice_reminders"
  | "visit_reminders"
  | "support_updates"
  | "renewal_notices";

export type NotificationTopicPref = {
  enabled: boolean;
  channel: NotificationChannel;
  /** Destination email when channel is email or both */
  email: string;
  /** Destination phone when channel is phone or both */
  phone: string;
};

export type NotificationPrefs = Partial<
  Record<NotificationTopicKey, NotificationTopicPref>
>;

export const NOTIFICATION_TOPICS: {
  key: NotificationTopicKey;
  label: string;
  description: string;
}[] = [
  {
    key: "invoice_reminders",
    label: "Invoice & payment reminders",
    description: "New invoices, due dates, and past-due notices.",
  },
  {
    key: "visit_reminders",
    label: "Upcoming service visits",
    description: "Heads-up before a scheduled maintenance visit.",
  },
  {
    key: "support_updates",
    label: "Support request updates",
    description: "When GreenScape replies to a Contact Us request.",
  },
  {
    key: "renewal_notices",
    label: "Contract renewal notices",
    description: "When a seasonal agreement is nearing its end date.",
  },
];

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  invoice_reminders: {
    enabled: true,
    channel: "email",
    email: "",
    phone: "",
  },
  visit_reminders: {
    enabled: true,
    channel: "email",
    email: "",
    phone: "",
  },
  support_updates: {
    enabled: true,
    channel: "email",
    email: "",
    phone: "",
  },
  renewal_notices: {
    enabled: false,
    channel: "email",
    email: "",
    phone: "",
  },
};

export function extractLastFour(accountDetails: string): string | null {
  const digits = accountDetails.replace(/\D/g, "");
  if (digits.length < 4) return null;
  return digits.slice(-4);
}

export function buildPaymentMethodDisplayLabel(
  nickname: string | null | undefined,
  accountDetails: string,
  methodType: PaymentMethodType = "card"
): string | null {
  const last4 = extractLastFour(accountDetails);
  if (!last4) return null;

  const nick = nickname?.trim();
  const base =
    methodType === "bank"
      ? `Bank account ending in ${last4}`
      : `Card ending in ${last4}`;
  return nick ? `${nick} · ${base}` : base;
}

export function mergeNotificationPrefs(
  raw: unknown,
  fallbackEmail: string,
  fallbackPhone: string
): Record<NotificationTopicKey, NotificationTopicPref> {
  const src =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const result = {} as Record<NotificationTopicKey, NotificationTopicPref>;

  for (const topic of NOTIFICATION_TOPICS) {
    const def = DEFAULT_NOTIFICATION_PREFS[topic.key]!;
    const row = src[topic.key];
    if (row && typeof row === "object" && !Array.isArray(row)) {
      const r = row as Record<string, unknown>;
      const channel =
        r.channel === "phone" || r.channel === "both" || r.channel === "email"
          ? r.channel
          : def.channel;

      // Prefer explicit email/phone; migrate legacy single `contact` field
      const legacyContact =
        typeof r.contact === "string" ? r.contact.trim() : "";
      const legacyIsEmail = legacyContact.includes("@");

      let email =
        typeof r.email === "string" && r.email.trim()
          ? r.email.trim()
          : legacyIsEmail
            ? legacyContact
            : fallbackEmail;
      let phone =
        typeof r.phone === "string" && r.phone.trim()
          ? r.phone.trim()
          : !legacyIsEmail && legacyContact
            ? legacyContact
            : fallbackPhone;

      email = email || fallbackEmail || "";
      phone = phone || fallbackPhone || "";

      result[topic.key] = {
        enabled: Boolean(r.enabled),
        channel,
        email,
        phone,
      };
    } else {
      result[topic.key] = {
        ...def,
        email: fallbackEmail || "",
        phone: fallbackPhone || "",
      };
    }
  }

  return result;
}

/** Human-readable destinations for a saved preference. */
export function formatNotificationDestinations(
  pref: NotificationTopicPref
): string {
  if (pref.channel === "email") {
    return pref.email || "—";
  }
  if (pref.channel === "phone") {
    return pref.phone || "—";
  }
  const parts = [pref.email, pref.phone].filter(
    (v) => typeof v === "string" && v.trim()
  );
  return parts.length > 0 ? parts.join(" · ") : "—";
}

export function formatMethodExpiry(
  month: number | null | undefined,
  year: number | null | undefined
): string | null {
  if (!month || !year) return null;
  if (month < 1 || month > 12) return null;
  const yy = year >= 100 ? year % 100 : year;
  return `${String(month).padStart(2, "0")}/${String(yy).padStart(2, "0")}`;
}
