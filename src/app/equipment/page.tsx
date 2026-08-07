import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui";
import { requireAppAccess } from "@/lib/auth-access";
import { getViewRole, roleCanViewEquipment } from "@/lib/demo-role";
import { EquipmentReport } from "./EquipmentReport";
import { loadEquipmentPageData } from "./queries";

type PageProps = {
  searchParams: Promise<{ from?: string; to?: string }>;
};

export default async function EquipmentPage({ searchParams }: PageProps) {
  await requireAppAccess();

  const role = await getViewRole();
  if (!roleCanViewEquipment(role)) redirect("/dashboard");

  const params = await searchParams;
  const dateFrom = typeof params.from === "string" ? params.from : "";
  const dateTo = typeof params.to === "string" ? params.to : "";

  // Depreciation journals are posted when hours are logged (not on every page load).
  const { report, usage, visits, companyRevenueInView } =
    await loadEquipmentPageData({ dateFrom, dateTo });

  return (
    <AppShell>
      <PageHeader
        title="Equipment"
      />
      <EquipmentReport
        report={report}
        usage={usage}
        visits={visits}
        dateFrom={dateFrom}
        dateTo={dateTo}
        companyRevenueInView={companyRevenueInView}
      />
    </AppShell>
  );
}
