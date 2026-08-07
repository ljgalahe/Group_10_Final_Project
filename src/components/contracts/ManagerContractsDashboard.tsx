"use client";

import { useMemo, useState } from "react";
import { ContractCompletionChart } from "@/components/contracts/ContractCompletionChart";
import {
  ManagerContractsDirectory,
  type DirectoryContract,
  type PendingQuoteApproval,
} from "@/components/contracts/ManagerContractsDirectory";
import { PromiseVsActualMap } from "@/components/contracts/PromiseVsActualMap";
import { SectionHeading } from "@/components/ui";
import type { ContractProgress } from "@/lib/contract-controls";

type ExtraOrder = {
  id: string;
  contract_id: string;
  title: string;
  status: string;
};

/** Shared company filter for completion, promise vs actual, and contract directory. */
export function ManagerContractsDashboard({
  progressList,
  extraWork = [],
  contracts = [],
  pendingQuotes = [],
}: {
  progressList: ContractProgress[];
  extraWork?: ExtraOrder[];
  contracts?: DirectoryContract[];
  pendingQuotes?: PendingQuoteApproval[];
}) {
  const [company, setCompany] = useState("overall");

  // Drafts (quote-linked / draft contracts) stay out of the completion circle.
  const chartProgress = useMemo(
    () => progressList.filter((p) => p.contractStatus !== "draft"),
    [progressList]
  );

  const companies = useMemo(() => {
    const names = new Set([
      ...chartProgress.map((p) => p.customerName),
      ...contracts.map((c) => c.customerName),
    ]);
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [chartProgress, contracts]);

  const filteredProgress = useMemo(() => {
    if (company === "overall") return chartProgress;
    return chartProgress.filter((p) => p.customerName === company);
  }, [chartProgress, company]);

  const filteredExtraWork = useMemo(() => {
    if (company === "overall") return extraWork;
    const ids = new Set(filteredProgress.map((p) => p.contractId));
    return extraWork.filter((e) => ids.has(e.contract_id));
  }, [extraWork, company, filteredProgress]);

  const directoryContracts = useMemo(() => {
    if (contracts.length > 0) return contracts;
    return chartProgress.map((p) => ({
      id: p.contractId,
      title: p.title,
      status: p.contractStatus,
      season_start: "",
      season_end: "",
      monthly_fee: null,
      visits_per_week: null,
      customerName: p.customerName,
    }));
  }, [contracts, chartProgress]);

  return (
    <div className="gs-stack">
      <div className="gs-index-bar">
        <label className="gs-index-field max-w-md flex-1">
          <span>Filter by customer</span>
          <select
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          >
            <option value="overall">Overall — all customers</option>
            {companies.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section className="gs-section">
        <SectionHeading
          mark="Portfolio"
          title="Contract Completion"
          description={
            company === "overall"
              ? "Percent complete and on-track status across active and completed contracts (drafts excluded)."
              : `Percent complete and on-track status for ${company} (drafts excluded).`
          }
        />
        <ContractCompletionChart
          progressList={filteredProgress}
          showCompanyFilter={false}
        />
      </section>

      <section className="gs-section">
        <SectionHeading
          mark="Promise"
          title="Contract Promise vs Actual"
          description="Promised vs completed work. Unapproved extras include Approve, Decline, and View."
        />
        <PromiseVsActualMap
          progressList={filteredProgress}
          extraWork={filteredExtraWork}
          companyFilter={company === "overall" ? "overall" : company}
          showCompanyFilter={false}
        />
      </section>

      <ManagerContractsDirectory
        contracts={directoryContracts}
        pendingQuotes={pendingQuotes}
        companyFilter={company}
      />
    </div>
  );
}
