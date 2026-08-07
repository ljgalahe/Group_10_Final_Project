import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui";
import { requireAppAccess } from "@/lib/auth-access";
import { getViewRole } from "@/lib/demo-role";
import { summarizeDsoKpi } from "@/app/reports/ar-aging/ar-kpis";
import { loadAccountantArAgingData } from "@/app/reports/ar-aging/load-ar-aging";
import { ApPayableReport } from "./ApPayableReport";
import { getMockApInvoices } from "./ap-mock-data";

function toIsoDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default async function ApAgingPage() {
  await requireAppAccess();

  const role = await getViewRole();
  if (role !== "accountant") redirect("/dashboard");

  const asOfDate = new Date();
  const asOf = toIsoDate(asOfDate);
  const invoices = getMockApInvoices(asOfDate);

  const { invoices: arInvoices, asOf: arAsOf } =
    await loadAccountantArAgingData(asOfDate);
  const dsoKpi = summarizeDsoKpi(arInvoices, arAsOf);
  const dso = dsoKpi.current.dso;

  return (
    <AppShell>
      <PageHeader
        title="Accounts Payable"
      />
      <ApPayableReport invoices={invoices} asOf={asOf} dso={dso} />
    </AppShell>
  );
}
