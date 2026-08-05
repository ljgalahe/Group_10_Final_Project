"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createDataClient } from "@/lib/auth-access";
import {
  buildPaymentMethodDisplayLabel,
  extractLastFour,
  type NotificationChannel,
  type NotificationPrefs,
  type NotificationTopicKey,
  type PaymentMethodType,
} from "@/lib/customer-payment-methods";
import { getViewCustomerId, getViewRole } from "@/lib/demo-role";
import { formatCustomerNotes } from "@/lib/customer-notes";

async function requireCustomerId(): Promise<string> {
  const role = await getViewRole();
  if (role !== "customer") {
    redirect("/dashboard");
  }
  const customerId = await getViewCustomerId();
  if (!customerId) {
    redirect("/dashboard");
  }
  return customerId;
}

function revalidateProfile() {
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/invoices");
  revalidatePath("/visits");
  revalidatePath("/schedule");
}

export async function updateCustomerContact(
  formData: FormData
): Promise<void> {
  const customerId = await requireCustomerId();

  const contactName = ((formData.get("contact_name") as string) || "").trim();
  const contactEmail = ((formData.get("contact_email") as string) || "").trim();
  const contactPhone = ((formData.get("contact_phone") as string) || "").trim();

  if (!contactName || !contactEmail) {
    redirect("/profile?error=contact");
  }

  const supabase = await createDataClient();
  const { error } = await supabase
    .from("customers")
    .update({
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone || null,
    })
    .eq("id", customerId);

  if (error) {
    redirect("/profile?error=contact");
  }

  revalidateProfile();
  redirect("/profile?saved=contact");
}

export async function updateCustomerNotes(
  formData: FormData
): Promise<void> {
  const customerId = await requireCustomerId();
  const notes = formatCustomerNotes(
    ((formData.get("customer_notes") as string) || "")
  );

  const supabase = await createDataClient();
  const { error } = await supabase
    .from("customers")
    .update({ customer_notes: notes || null })
    .eq("id", customerId);

  if (error) {
    redirect("/profile?error=notes");
  }

  revalidateProfile();
  redirect("/profile?saved=notes");
}

export async function addCustomerPaymentMethod(
  formData: FormData
): Promise<void> {
  const customerId = await requireCustomerId();

  const methodTypeRaw = ((formData.get("method_type") as string) || "card").trim();
  const methodType: PaymentMethodType =
    methodTypeRaw === "bank" ? "bank" : "card";
  const accountDetails = (
    (formData.get("account_details") as string) || ""
  ).trim();
  const nickname = ((formData.get("nickname") as string) || "").trim();
  const billingName = ((formData.get("billing_name") as string) || "").trim();
  const expMonth = parseInt(
    ((formData.get("expires_month") as string) || "").trim(),
    10
  );
  const expYear = parseInt(
    ((formData.get("expires_year") as string) || "").trim(),
    10
  );
  const makeDefault = formData.get("is_default") === "1";

  const displayLabel = buildPaymentMethodDisplayLabel(
    nickname,
    accountDetails,
    methodType
  );
  const lastFour = extractLastFour(accountDetails);
  if (!displayLabel || !lastFour) {
    redirect("/profile?error=payment");
  }

  const validExpMonth =
    Number.isFinite(expMonth) && expMonth >= 1 && expMonth <= 12;
  const validExpYear = Number.isFinite(expYear) && expYear >= 2024;

  const supabase = await createDataClient();

  if (makeDefault) {
    await supabase
      .from("customer_payment_methods")
      .update({ is_default: false })
      .eq("customer_id", customerId);
  }

  const { count } = await supabase
    .from("customer_payment_methods")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId);

  const isFirst = (count ?? 0) === 0;

  const { error } = await supabase.from("customer_payment_methods").insert({
    customer_id: customerId,
    nickname: nickname || null,
    display_label: displayLabel,
    method_type: methodType,
    last_four: lastFour,
    expires_month:
      methodType === "card" && validExpMonth ? expMonth : null,
    expires_year: methodType === "card" && validExpYear ? expYear : null,
    billing_name: billingName || null,
    is_default: makeDefault || isFirst,
  });

  if (error) {
    redirect("/profile?error=payment");
  }

  revalidateProfile();
  redirect("/profile?saved=payment");
}

export async function setDefaultPaymentMethod(
  formData: FormData
): Promise<void> {
  const customerId = await requireCustomerId();
  const methodId = ((formData.get("method_id") as string) || "").trim();
  if (!methodId) {
    redirect("/profile?error=payment");
  }

  const supabase = await createDataClient();
  await supabase
    .from("customer_payment_methods")
    .update({ is_default: false })
    .eq("customer_id", customerId);

  const { error } = await supabase
    .from("customer_payment_methods")
    .update({ is_default: true })
    .eq("id", methodId)
    .eq("customer_id", customerId);

  if (error) {
    redirect("/profile?error=payment");
  }

  revalidateProfile();
  redirect("/profile?saved=payment");
}

export async function removeCustomerPaymentMethod(
  formData: FormData
): Promise<void> {
  const customerId = await requireCustomerId();
  const methodId = ((formData.get("method_id") as string) || "").trim();
  if (!methodId) {
    redirect("/profile?error=payment");
  }

  const supabase = await createDataClient();

  const { data: removed } = await supabase
    .from("customer_payment_methods")
    .delete()
    .eq("id", methodId)
    .eq("customer_id", customerId)
    .select("is_default")
    .maybeSingle();

  if (removed?.is_default) {
    const { data: next } = await supabase
      .from("customer_payment_methods")
      .select("id")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (next) {
      await supabase
        .from("customer_payment_methods")
        .update({ is_default: true })
        .eq("id", next.id)
        .eq("customer_id", customerId);
    }
  }

  revalidateProfile();
  redirect("/profile?saved=payment");
}

const TOPIC_KEYS = new Set<NotificationTopicKey>([
  "invoice_reminders",
  "visit_reminders",
  "support_updates",
  "renewal_notices",
]);

export async function updateNotificationPreference(
  formData: FormData
): Promise<void> {
  const customerId = await requireCustomerId();
  const topic = ((formData.get("topic") as string) ||
    "") as NotificationTopicKey;
  const enabled = formData.get("enabled") === "1";
  const channelRaw = ((formData.get("channel") as string) || "email").trim();
  const email = ((formData.get("email") as string) || "").trim();
  const phone = ((formData.get("phone") as string) || "").trim();
  // Legacy single-contact field still accepted
  const legacyContact = ((formData.get("contact") as string) || "").trim();

  if (!TOPIC_KEYS.has(topic)) {
    redirect("/profile?error=notifications");
  }

  const channel: NotificationChannel =
    channelRaw === "phone" || channelRaw === "both" || channelRaw === "email"
      ? channelRaw
      : "email";

  const supabase = await createDataClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("contact_email, contact_phone, notification_prefs")
    .eq("id", customerId)
    .single();

  const profileEmail = (customer?.contact_email ?? "").trim();
  const profilePhone = (customer?.contact_phone ?? "").trim();

  let nextEmail = email || profileEmail;
  let nextPhone = phone || profilePhone;

  if (legacyContact) {
    if (legacyContact.includes("@") && !email) nextEmail = legacyContact;
    if (!legacyContact.includes("@") && !phone) nextPhone = legacyContact;
  }

  if (enabled) {
    if (channel === "email" && !nextEmail) {
      redirect("/profile?error=notifications");
    }
    if (channel === "phone" && !nextPhone) {
      redirect("/profile?error=notifications");
    }
    if (channel === "both" && (!nextEmail || !nextPhone)) {
      redirect("/profile?error=notifications");
    }
  }

  const current: NotificationPrefs =
    customer?.notification_prefs &&
    typeof customer.notification_prefs === "object"
      ? (customer.notification_prefs as NotificationPrefs)
      : {};

  const next: NotificationPrefs = {
    ...current,
    [topic]: {
      enabled,
      channel,
      email: nextEmail,
      phone: nextPhone,
    },
  };

  const { error } = await supabase
    .from("customers")
    .update({ notification_prefs: next })
    .eq("id", customerId);

  if (error) {
    redirect("/profile?error=notifications");
  }

  revalidateProfile();
  redirect("/profile?saved=notifications");
}
