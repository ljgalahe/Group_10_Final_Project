import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui";
import { requireAppAccess } from "@/lib/auth-access";
import { getViewRole, roleCanViewInventory } from "@/lib/demo-role";
import { InventoryReport } from "./InventoryReport";
import { fetchInventoryItems } from "./queries";

export default async function InventoryPage() {
  await requireAppAccess();

  const role = await getViewRole();
  if (!roleCanViewInventory(role)) redirect("/dashboard");

  const items = await fetchInventoryItems();

  return (
    <AppShell>
      <PageHeader
        title="Inventory"
      />
      <InventoryReport items={items} />
    </AppShell>
  );
}
