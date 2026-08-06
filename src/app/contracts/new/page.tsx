import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { NewContractForm } from "@/components/NewContractForm";
import { PageHeader } from "@/components/ui";
import { requireAppAccess } from "@/lib/auth-access";
import { getViewRole, roleCanDraftContracts } from "@/lib/demo-role";
import { fetchCustomers } from "@/lib/queries";

export default async function NewContractPage() {
  await requireAppAccess();

  const role = await getViewRole();
  // Only Operations drafts contracts (Quotes / Inquiries flow preferred).
  if (!roleCanDraftContracts(role)) {
    redirect("/contracts");
  }

  const { data: customers } = await fetchCustomers();

  return (
    <AppShell>
      <PageHeader
        title="Add Contract"
        description="Create a new seasonal maintenance agreement."
      />
      <NewContractForm customers={customers} />
    </AppShell>
  );
}
