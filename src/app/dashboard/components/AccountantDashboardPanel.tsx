"use client";

import { useEffect, useState } from "react";
import type { AccountantDashboardData } from "@/app/dashboard/accountant-dashboard-data";
import { AccountantCompanyPerformanceSection } from "@/app/dashboard/components/AccountantCompanyPerformance";

export function AccountantDashboardPanel({
  data,
}: {
  data: AccountantDashboardData;
}) {
  // Defer rich markup until after hydrate so Cursor/browser DOM attrs
  // (e.g. data-cursor-ref) cannot mismatch SSR HTML.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="mt-8 space-y-6"
        aria-busy="true"
        suppressHydrationWarning
      >
        <div className="h-72 animate-pulse rounded-xl bg-stone-100" />
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6" suppressHydrationWarning>
      <AccountantCompanyPerformanceSection data={data.companyPerformance} />
    </div>
  );
}
