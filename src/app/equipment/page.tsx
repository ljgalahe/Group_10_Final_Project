import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui";
import { requireAppAccess } from "@/lib/auth-access";
import { getViewRole, roleCanViewEquipment } from "@/lib/demo-role";
import { EquipmentReport } from "./EquipmentReport";
import {
  fetchCompletedVisitsForEquipment,
  fetchEquipment,
  fetchEquipmentUsage,
} from "./queries";

export default async function EquipmentPage() {
  await requireAppAccess();

  const role = await getViewRole();
  if (!roleCanViewEquipment(role)) redirect("/dashboard");

  const [assets, usage, visits] = await Promise.all([
    fetchEquipment(),
    fetchEquipmentUsage(),
    fetchCompletedVisitsForEquipment(),
  ]);

  return (
    <AppShell>
      <PageHeader
        title="Equipment"
        description="Fixed assets with unit-of-production depreciation from cost, salvage, estimated life hours, and hours used on visits."
      />
      <EquipmentReport assets={assets} usage={usage} visits={visits} />
    </AppShell>
  );
}
