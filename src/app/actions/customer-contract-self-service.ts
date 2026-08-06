"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createDataClient } from "@/lib/auth-access";
import {
  getViewCustomerId,
  getViewRole,
  roleCanSignContracts,
} from "@/lib/demo-role";
import type { SupportCategory } from "@/lib/types";

function todayIsoDate() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function toIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** +1 calendar month; used for service_paused_until extensions. */
function addOneCalendarMonth(from: Date) {
  const d = new Date(from);
  d.setMonth(d.getMonth() + 1);
  return d;
}

async function requireCustomerOwnedContract(contractId: string) {
  const role = await getViewRole();
  if (!roleCanSignContracts(role)) {
    redirect("/dashboard");
  }
  const customerId = await getViewCustomerId();
  if (!customerId) {
    redirect("/contracts");
  }

  const supabase = await createDataClient();
  const { data: contract } = await supabase
    .from("contracts")
    .select(
      "id, customer_id, status, approval_state, customer_signed_at, service_paused_until"
    )
    .eq("id", contractId)
    .maybeSingle();

  // If service_paused_until column is missing, retry without it.
  if (!contract) {
    const { data: fallback } = await supabase
      .from("contracts")
      .select("id, customer_id, status, approval_state, customer_signed_at")
      .eq("id", contractId)
      .maybeSingle();
    if (!fallback || fallback.customer_id !== customerId) {
      redirect("/contracts");
    }
    return {
      supabase,
      customerId,
      role,
      contract: { ...fallback, service_paused_until: null as string | null },
    };
  }

  if (contract.customer_id !== customerId) {
    redirect("/contracts");
  }

  return { supabase, customerId, role, contract };
}

/** Pause active signed contract by +1 calendar month. */
export async function pauseCustomerContract(
  formData: FormData
): Promise<void> {
  const contractId = String(formData.get("contract_id") ?? "").trim();
  if (!contractId) redirect("/contracts");

  const { supabase, role, contract } =
    await requireCustomerOwnedContract(contractId);

  if (contract.status !== "active") {
    redirect(`/contracts/${contractId}?error=pause`);
  }

  const today = todayIsoDate();
  const currentPause =
    typeof contract.service_paused_until === "string" &&
    contract.service_paused_until
      ? new Date(`${contract.service_paused_until}T00:00:00`)
      : null;
  const base =
    currentPause && currentPause.getTime() > today.getTime()
      ? currentPause
      : today;
  const pausedUntil = toIsoDate(addOneCalendarMonth(base));

  const { error } = await supabase
    .from("contracts")
    .update({ service_paused_until: pausedUntil })
    .eq("id", contractId);

  if (error) {
    redirect(
      `/contracts/${contractId}?error=${encodeURIComponent(error.message)}`
    );
  }

  await supabase.from("contract_audit_logs").insert({
    contract_id: contractId,
    action: "contract_paused_by_customer",
    actor_role: role,
    details: { service_paused_until: pausedUntil },
  });

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${contractId}`);
  revalidatePath("/dashboard");
  revalidatePath("/schedule");
  redirect(`/contracts/${contractId}?paused=1`);
}

/** Resume service by clearing service_paused_until. */
export async function unpauseCustomerContract(
  formData: FormData
): Promise<void> {
  const contractId = String(formData.get("contract_id") ?? "").trim();
  if (!contractId) redirect("/contracts");

  const { supabase, role, contract } =
    await requireCustomerOwnedContract(contractId);

  if (contract.status !== "active") {
    redirect(`/contracts/${contractId}?error=unpause`);
  }

  const today = todayIsoDate();
  const currentPause =
    typeof contract.service_paused_until === "string" &&
    contract.service_paused_until
      ? new Date(`${contract.service_paused_until}T00:00:00`)
      : null;
  if (!currentPause || currentPause.getTime() < today.getTime()) {
    redirect(`/contracts/${contractId}?error=unpause`);
  }

  const { error } = await supabase
    .from("contracts")
    .update({ service_paused_until: null })
    .eq("id", contractId);

  if (error) {
    redirect(
      `/contracts/${contractId}?error=${encodeURIComponent(error.message)}`
    );
  }

  await supabase.from("contract_audit_logs").insert({
    contract_id: contractId,
    action: "contract_unpaused_by_customer",
    actor_role: role,
    details: {},
  });

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${contractId}`);
  revalidatePath("/dashboard");
  revalidatePath("/schedule");
  redirect(`/contracts/${contractId}?unpaused=1`);
}

/** Customer contract inquiry via support_requests. */
export async function submitContractInquiry(
  formData: FormData
): Promise<void> {
  const contractId = String(formData.get("contract_id") ?? "").trim();
  const categoryRaw = String(formData.get("category") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!contractId || !message) {
    redirect(`/contracts/${contractId || ""}?error=inquiry`);
  }

  const category =
    categoryRaw === "concern" ? "concern" : ("question" as SupportCategory);
  if (categoryRaw !== "question" && categoryRaw !== "concern") {
    redirect(`/contracts/${contractId}?error=inquiry`);
  }

  const { supabase, customerId, role, contract } =
    await requireCustomerOwnedContract(contractId);

  if (contract.status === "cancelled") {
    redirect(`/contracts/${contractId}?error=inquiry`);
  }

  await supabase.from("support_requests").insert({
    customer_id: customerId,
    category,
    message,
    linked_type: "contract",
    linked_id: contractId,
    status: "Open",
  });

  await supabase.from("contract_audit_logs").insert({
    contract_id: contractId,
    action: "contract_inquiry_by_customer",
    actor_role: role,
    details: { category },
  });

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${contractId}`);
  revalidatePath("/contact");
  revalidatePath("/support");
  revalidatePath("/dashboard");
  redirect(`/contracts/${contractId}?inquiry=1`);
}

/** Cancel active contract after client confirm. */
export async function cancelCustomerContract(
  formData: FormData
): Promise<void> {
  const contractId = String(formData.get("contract_id") ?? "").trim();
  if (!contractId) redirect("/contracts");

  const { supabase, role, contract } =
    await requireCustomerOwnedContract(contractId);

  if (contract.status !== "active") {
    redirect(`/contracts/${contractId}?error=cancel`);
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("contracts")
    .update({
      status: "cancelled",
    })
    .eq("id", contractId);

  if (error) {
    redirect(
      `/contracts/${contractId}?error=${encodeURIComponent(error.message)}`
    );
  }

  await supabase.from("contract_audit_logs").insert({
    contract_id: contractId,
    action: "contract_cancelled_by_customer",
    actor_role: role,
    details: { cancelled_at: now },
  });

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${contractId}`);
  revalidatePath("/dashboard");
  revalidatePath("/schedule");
  redirect(`/contracts/${contractId}?cancelled=1`);
}
