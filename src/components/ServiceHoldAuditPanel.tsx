"use client";

import { useEffect, useState } from "react";
import {
  auditForCustomer,
  loadServiceHoldAudit,
  syncServiceHoldAudit,
  type CustomerServiceHold,
  type ServiceHoldAuditEntry,
} from "@/lib/service-hold";

export function ServiceHoldAuditPanel({
  customerId,
  holds,
}: {
  customerId: string;
  holds: CustomerServiceHold[];
}) {
  const [entries, setEntries] = useState<ServiceHoldAuditEntry[]>([]);

  useEffect(() => {
    syncServiceHoldAudit(holds);
    setEntries(auditForCustomer(loadServiceHoldAudit(), customerId));
  }, [customerId, holds]);

  if (entries.length === 0) {
    return (
      <p className="text-sm text-stone-500">
        No credit-hold audit events recorded for this account yet.
      </p>
    );
  }

  return (
    <ul className="space-y-2 text-sm">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                entry.event === "applied"
                  ? "bg-red-100 text-red-800"
                  : "bg-green-100 text-green-800"
              }`}
            >
              {entry.event === "applied" ? "Hold applied" : "Hold released"}
            </span>
            <span className="text-xs text-stone-500">
              {new Date(entry.at).toLocaleString()}
            </span>
          </div>
          <p className="mt-1 text-stone-700">{entry.reason}</p>
        </li>
      ))}
    </ul>
  );
}
