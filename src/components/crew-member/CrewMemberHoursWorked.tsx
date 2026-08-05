"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, StatCard } from "@/components/ui";
import { loadVisitWorkState } from "@/components/crew-lead/crewLeadStorage";
import type { ScheduleJob } from "@/components/crew-lead/schedule-types";
import {
  hourlyRateForRole,
  resolveMemberHours,
  rollupHours,
  type VisitHoursRow,
  type VisitLaborEntry,
} from "@/lib/crew-hours";
import { DEMO_CREW_MEMBER } from "@/lib/types";

function formatShort(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function CrewMemberHoursWorked({
  jobs,
  today,
  laborEntries = [],
  laborByVisit = {},
}: {
  jobs: ScheduleJob[];
  today: string;
  laborEntries?: VisitLaborEntry[];
  laborByVisit?: Record<
    string,
    { quantity: number | null; description: string | null }
  >;
}) {
  const [rows, setRows] = useState<VisitHoursRow[]>([]);

  const entriesByVisit = useMemo(() => {
    const map = new Map<string, VisitLaborEntry[]>();
    for (const entry of laborEntries) {
      const list = map.get(entry.visit_id) ?? [];
      list.push(entry);
      map.set(entry.visit_id, list);
    }
    return map;
  }, [laborEntries]);

  useEffect(() => {
    const next: VisitHoursRow[] = jobs
      .filter((job) => job.status !== "cancelled")
      .map((job) => {
        const costMeta = laborByVisit[job.id];
        const hours = resolveMemberHours({
          visitId: job.id,
          status: job.status,
          memberId: DEMO_CREW_MEMBER.id,
          localState: loadVisitWorkState(job.id),
          dbEntries: entriesByVisit.get(job.id) ?? [],
          laborQuantity: costMeta?.quantity,
          laborDescription: costMeta?.description,
        });
        const rate = hourlyRateForRole(DEMO_CREW_MEMBER.roleTitle);
        return {
          visitId: job.id,
          scheduledDate: job.scheduledDate,
          customerName: job.customerName,
          contractTitle: job.contractTitle,
          status: job.status,
          hours,
          hourlyRate: rate,
          laborCost: Number((hours * rate).toFixed(2)),
        };
      })
      .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));
    setRows(next);
  }, [jobs, entriesByVisit, laborByVisit]);

  const { todayHours, weekHours, visitCountWithHours } = rollupHours(
    rows,
    today
  );
  const recentWithHours = rows.filter((row) => row.hours > 0).slice(0, 8);

  return (
    <Card className="border-green-800/20 bg-stone-50">
      <h2 className="text-lg font-semibold text-green-950">Hours worked</h2>
      <p className="mt-1 text-sm text-stone-500">
        Your logged hours by visit, with running totals for today and this week.
        Hours are recorded by your crew lead and sync to accountant billing.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <StatCard
          compact
          label="Today"
          value={`${todayHours.toFixed(1)} hrs`}
          hint={today}
        />
        <StatCard
          compact
          label="This week"
          value={`${weekHours.toFixed(1)} hrs`}
          hint="Sunday–Saturday running total"
        />
        <StatCard
          compact
          label="Visits with hours"
          value={visitCountWithHours}
          hint="Across your assigned jobs"
        />
      </div>

      {recentWithHours.length === 0 ? (
        <p className="mt-4 text-sm text-stone-500">
          No hours logged on your assigned visits yet. When your crew lead clocks
          the job or saves labor hours, totals appear here.
        </p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-lg border border-stone-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs text-stone-500">
              <tr>
                <th className="px-3 py-2 font-medium">Visit</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Hours</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentWithHours.map((row) => (
                <tr
                  key={row.visitId}
                  className="border-t border-stone-100 text-stone-800"
                >
                  <td className="px-3 py-2">
                    <p className="font-medium text-green-950">
                      {row.customerName}
                    </p>
                    <p className="text-xs text-stone-500">{row.contractTitle}</p>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatShort(row.scheduledDate)}
                  </td>
                  <td className="px-3 py-2 font-semibold">
                    {row.hours.toFixed(1)}
                  </td>
                  <td className="px-3 py-2 capitalize text-stone-600">
                    {row.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
