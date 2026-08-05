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
  const patch: Record<string, unknown> = {};

  if (role === "manager") {
    patch.manager_approved_at = now;
  }
  if (role === "accountant") {
    patch.accountant_approved_at = now;
  }

  const managerOk =
    role === "manager" ? true : Boolean(contract.manager_approved_at);
  const accountantOk =
    role === "accountant" ? true : Boolean(contract.accountant_approved_at);

  if (managerOk && accountantOk) {
    patch.approval_state = "approved";
    patch.status = "active";
  } else {
    patch.approval_state = "pending_approvals";
  }

  await supabase.from("contracts").update(patch).eq("id", contractId);

  await supabase.from("contract_audit_logs").insert({
    contract_id: contractId,
    action:
      managerOk && accountantOk
        ? "contract_dual_approved"
        : `contract_approved_by_${role}`,
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
