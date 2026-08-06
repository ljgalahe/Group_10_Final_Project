"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createDataClient } from "@/lib/auth-access";
import { getViewRole, roleCanApproveContracts } from "@/lib/demo-role";

export async function approveContractDraft(formData: FormData): Promise<void> {
  const role = await getViewRole();
  if (!roleCanApproveContracts(role)) {
    redirect("/dashboard");
  }

  const contractId = (formData.get("contract_id") as string) || "";
  if (!contractId) redirect("/contracts");

  const supabase = await createDataClient();
  const { data: contract } = await supabase
    .from("contracts")
    .select(
      "id, approval_state, manager_approved_at, accountant_approved_at, status"
    )
    .eq("id", contractId)
    .single();

  if (!contract) redirect("/contracts");

  const now = new Date().toISOString();
  // Manager approval alone releases the contract to the customer.
  const patch: Record<string, unknown> = {
    manager_approved_at: now,
    approval_state: "approved",
    status: "active",
  };

  await supabase.from("contracts").update(patch).eq("id", contractId);

  await supabase.from("contract_audit_logs").insert({
    contract_id: contractId,
    action: "contract_approved_by_manager",
    actor_role: role,
    details: patch,
  });

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${contractId}`);
  revalidatePath("/dashboard");
  redirect(`/contracts/${contractId}?approved=1`);
}

export async function requestContractDraftChanges(
  formData: FormData
): Promise<void> {
  const role = await getViewRole();
  if (!roleCanApproveContracts(role)) {
    redirect("/dashboard");
  }

  const contractId = (formData.get("contract_id") as string) || "";
  const notes = ((formData.get("change_notes") as string) || "").trim();
  if (!contractId) redirect("/contracts");

  const supabase = await createDataClient();
  await supabase
    .from("contracts")
    .update({
      approval_state: "changes_requested",
      manager_approved_at: null,
      accountant_approved_at: null,
    })
    .eq("id", contractId);

  await supabase.from("contract_audit_logs").insert({
    contract_id: contractId,
    action: "contract_changes_requested",
    actor_role: role,
    details: { notes },
  });

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${contractId}`);
  redirect(`/contracts/${contractId}?changes=1`);
}
