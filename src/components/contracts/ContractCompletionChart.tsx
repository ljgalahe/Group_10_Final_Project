"use client";

import { useMemo, useState } from "react";
import {
  ContractProgressChart,
  PortfolioProgressChart,
} from "@/components/contracts/ContractPromiseUI";
import {
  portfolioSummary,
  type ContractProgress,
} from "@/lib/contract-controls";

export function ContractCompletionChart({
  progressList,
  showCompanyFilter = true,
}: {
  progressList: ContractProgress[];
  showCompanyFilter?: boolean;
}) {
  const [company, setCompany] = useState("overall");

  const companies = useMemo(() => {
    return [...new Set(progressList.map((p) => p.customerName))].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [progressList]);

  const filtered = useMemo(() => {
    if (!showCompanyFilter || company === "overall") return progressList;
    return progressList.filter((p) => p.customerName === company);
  }, [progressList, company, showCompanyFilter]);

  const portfolio = portfolioSummary(filtered);
  const single = filtered.length === 1 ? filtered[0] : null;

  return (
    <div>
      {showCompanyFilter ? (
        <label className="block text-sm text-stone-600">
          Filter by customer
          <select
            className="mt-1 block w-full max-w-md rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900"
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
      ) : null}

      <div className={showCompanyFilter ? "mt-6" : undefined}>
        {filtered.length === 0 ? (
          <p className="text-sm text-stone-500">No contracts for this customer.</p>
        ) : single ? (
          <ContractProgressChart
            percentComplete={single.percentComplete}
            trackStatus={single.trackStatus}
            contractStatus={single.contractStatus}
            seasonElapsedPct={single.seasonElapsedPct}
            completedVisits={single.completedVisits}
            promisedVisits={single.promisedVisits}
          />
        ) : (
          <PortfolioProgressChart
            avgComplete={portfolio.avgComplete}
            onTrack={portfolio.onTrack}
            atRisk={portfolio.atRisk}
            active={portfolio.active}
            total={portfolio.total}
          />
        )}
      </div>
    </div>
  );
}
