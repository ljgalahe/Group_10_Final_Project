"use client";

import { useMemo, useState } from "react";
import {
  assignVisitCrewLead,
  autoGroupVisitsByLocation,
  createServiceVisit,
} from "@/app/actions/operations-schedule";
import { Card } from "@/components/ui";
import { locationKey } from "@/lib/location-group";
import { DEMO_CREW_LEADS } from "@/lib/types";

export type OpsVisitRow = {
  id: string;
  scheduled_date: string;
  status: string;
  visit_kind: string | null;
  crew_lead_name: string | null;
  contract_id: string;
  contract_title: string;
  customer_name: string;
  address: string | null;
};

export type OpsContractOption = {
  id: string;
  title: string;
  customer_name: string;
};

export function OperationsScheduleBoard({
  visits,
  contracts,
  today,
}: {
  visits: OpsVisitRow[];
  contracts: OpsContractOption[];
  today: string;
}) {
  const [filterLead, setFilterLead] = useState("all");

  const clusters = useMemo(() => {
    const map = new Map<string, OpsVisitRow[]>();
    for (const v of visits.filter((x) => x.status === "scheduled")) {
      const key = locationKey(v.address);
      const list = map.get(key) ?? [];
      list.push(v);
      map.set(key, list);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [visits]);

  const visible = visits.filter(
    (v) => filterLead === "all" || v.crew_lead_name === filterLead
  );

  const unassigned = visits.filter(
    (v) => v.status === "scheduled" && !v.crew_lead_name
  );

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-semibold text-green-950">
          Efficient same-day routing
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Groups unassigned visits by location (ZIP / city) onto one day with one
          Crew Lead — prefer nearby properties together.
        </p>
        <form
          action={autoGroupVisitsByLocation}
          className="mt-4 flex flex-wrap items-end gap-3"
        >
          <label className="text-sm">
            <span className="text-stone-600">Target date</span>
            <input
              type="date"
              name="target_date"
              required
              defaultValue={today}
              className="mt-1 block rounded-md border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="text-stone-600">Crew Lead</span>
            <select
              name="crew_lead_name"
              className="mt-1 block rounded-md border border-stone-300 px-3 py-2"
              defaultValue={DEMO_CREW_LEADS[0]}
            >
              {DEMO_CREW_LEADS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-md bg-green-900 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
          >
            Auto-group largest cluster ({unassigned.length} unassigned)
          </button>
        </form>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {clusters.slice(0, 6).map(([key, list]) => (
            <div
              key={key}
              className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
            >
              <p className="font-medium text-green-950">Area {key}</p>
              <p className="text-stone-600">
                {list.length} visit{list.length === 1 ? "" : "s"}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-green-950">
          Create service visit
        </h2>
        <form
          action={createServiceVisit}
          className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <label className="text-sm sm:col-span-2">
            <span className="text-stone-600">Contract</span>
            <select
              name="contract_id"
              required
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
              defaultValue=""
            >
              <option value="" disabled>
                Select contract
              </option>
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.customer_name} — {c.title}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-stone-600">Date</span>
            <input
              type="date"
              name="scheduled_date"
              required
              defaultValue={today}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="text-stone-600">Crew Lead</span>
            <select
              name="crew_lead_name"
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
              defaultValue={DEMO_CREW_LEADS[0]}
            >
              {DEMO_CREW_LEADS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <input type="hidden" name="visit_kind" value="service" />
          <div className="sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              className="rounded-md bg-green-900 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
            >
              Schedule visit
            </button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-green-950">
            Visit board
          </h2>
          <label className="text-sm">
            Filter by Crew Lead{" "}
            <select
              value={filterLead}
              onChange={(e) => setFilterLead(e.target.value)}
              className="ml-2 rounded-md border border-stone-300 px-2 py-1"
            >
              <option value="all">All</option>
              {DEMO_CREW_LEADS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-stone-200 text-xs uppercase text-stone-500">
              <tr>
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Kind</th>
                <th className="py-2 pr-3">Customer / job</th>
                <th className="py-2 pr-3">Location</th>
                <th className="py-2 pr-3">Crew Lead</th>
                <th className="py-2">Assign</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {visible.map((v) => (
                <tr key={v.id}>
                  <td className="py-3 pr-3 whitespace-nowrap">
                    {v.scheduled_date}
                  </td>
                  <td className="py-3 pr-3 capitalize">
                    {v.visit_kind || "service"}
                  </td>
                  <td className="py-3 pr-3">
                    <p className="font-medium text-green-950">
                      {v.customer_name}
                    </p>
                    <p className="text-xs text-stone-500">{v.contract_title}</p>
                  </td>
                  <td className="max-w-[12rem] py-3 pr-3 text-stone-600">
                    {v.address || "—"}
                  </td>
                  <td className="py-3 pr-3">
                    {v.crew_lead_name || (
                      <span className="text-amber-700">Unassigned</span>
                    )}
                  </td>
                  <td className="py-3">
                    <form
                      action={assignVisitCrewLead}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <input type="hidden" name="visit_id" value={v.id} />
                      <input
                        type="date"
                        name="scheduled_date"
                        defaultValue={v.scheduled_date}
                        className="rounded border border-stone-300 px-2 py-1 text-xs"
                      />
                      <select
                        name="crew_lead_name"
                        defaultValue={v.crew_lead_name || DEMO_CREW_LEADS[0]}
                        className="rounded border border-stone-300 px-2 py-1 text-xs"
                      >
                        {DEMO_CREW_LEADS.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded bg-green-900 px-2 py-1 text-xs font-medium text-white"
                      >
                        Save
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 ? (
            <p className="py-6 text-sm text-stone-500">No visits to show.</p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
