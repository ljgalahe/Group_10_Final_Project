"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  REFERRAL_PARTNERS,
  type ReferralPartner,
} from "@/lib/company-capacity";
import type { AlertPriority, ManagerAlert } from "@/lib/manager-alerts";

const PRIORITY_STYLES: Record<
  AlertPriority,
  { badge: string; border: string; iconBg: string }
> = {
  critical: {
    badge: "bg-red-100 text-red-800 border-red-200",
    border: "border-red-200 hover:border-red-300",
    iconBg: "bg-red-600 text-white",
  },
  high: {
    badge: "bg-orange-100 text-orange-900 border-orange-200",
    border: "border-orange-200 hover:border-orange-300",
    iconBg: "bg-orange-500 text-white",
  },
  medium: {
    badge: "bg-amber-100 text-amber-900 border-amber-200",
    border: "border-amber-200 hover:border-amber-300",
    iconBg: "bg-amber-500 text-white",
  },
  low: {
    badge: "bg-sky-100 text-sky-900 border-sky-200",
    border: "border-stone-200 hover:border-green-300",
    iconBg: "bg-sky-600 text-white",
  },
};

const PRIORITY_LABEL: Record<AlertPriority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const PRIORITY_RANK: Record<AlertPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function AlertIcon({ icon }: { icon: ManagerAlert["icon"] }) {
  const common = "h-4 w-4";
  switch (icon) {
    case "hold":
      return (
        <svg className={common} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-4.75a.75.75 0 001.5 0v-4.5a.75.75 0 00-1.5 0v4.5zM10 6.5a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
      );
    case "warning":
      return (
        <svg className={common} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l6.518 11.59c.75 1.334-.213 2.986-1.742 2.986H3.48c-1.53 0-2.493-1.652-1.743-2.986L8.257 3.1zM10 7a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 7zm0 8a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
      );
    case "profit":
      return (
        <svg className={common} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M3 3.75A.75.75 0 013.75 3h12.5a.75.75 0 010 1.5H3.75A.75.75 0 013 3.75zM3.75 8a.75.75 0 000 1.5h8.5a.75.75 0 000-1.5h-8.5zM3.75 12.5a.75.75 0 000 1.5h5.5a.75.75 0 000-1.5h-5.5z" />
        </svg>
      );
    case "risk":
      return (
        <svg className={common} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M10 2a6 6 0 00-6 6c0 4.5 6 10 6 10s6-5.5 6-10a6 6 0 00-6-6zm0 8.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"
            clipRule="evenodd"
          />
        </svg>
      );
    case "crew":
      return (
        <svg className={common} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM2.5 16.5a5.5 5.5 0 0111 0 .75.75 0 01-.75.75h-9.5a.75.75 0 01-.75-.75zM14.5 8a2 2 0 100-4 2 2 0 000 4zM13 16.5c0-.53.07-1.04.2-1.53a4.001 4.001 0 014.55 2.28.75.75 0 01-.69 1h-3.31A.75.75 0 0113 16.5z" />
        </svg>
      );
    case "equipment":
      return (
        <svg className={common} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M11.49 3.17a.75.75 0 01.64.28l5 6.5a.75.75 0 01-.1 1.02l-7.5 6.5a.75.75 0 01-1.12-.18l-3-5.5A.75.75 0 015.9 11h2.56l1.5-2.5H7.4a.75.75 0 01-.64-1.12l3.5-5.5a.75.75 0 011.23-.01z"
            clipRule="evenodd"
          />
        </svg>
      );
    case "capacity":
      return (
        <svg className={common} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V6z"
            clipRule="evenodd"
          />
        </svg>
      );
    case "inventory":
      return (
        <svg className={common} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M3.5 3.75A1.75 1.75 0 015.25 2h9.5A1.75 1.75 0 0116.5 3.75v12.5A1.75 1.75 0 0114.75 18H5.25A1.75 1.75 0 013.5 16.25V3.75zM5.25 4.5v11.75h9.5V4.5h-9.5zM7 7.25a.75.75 0 000 1.5h6a.75.75 0 000-1.5H7zm0 3.5a.75.75 0 000 1.5h6a.75.75 0 000-1.5H7z" />
        </svg>
      );
    case "invoice":
      return (
        <svg className={common} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M4 3.75A.75.75 0 014.75 3h10.5a.75.75 0 01.75.75v12.5a.75.75 0 01-1.14.64L12 15.56l-2.86 1.33a.75.75 0 01-.64 0L5.64 15.56 4.14 16.9A.75.75 0 013 16.25V3.75z" />
        </svg>
      );
    case "contract":
    default:
      return (
        <svg className={common} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M4.5 2.75A.75.75 0 015.25 2h9.5a.75.75 0 01.75.75v14.5a.75.75 0 01-1.14.64L12 16.56l-2.36 1.33a.75.75 0 01-.64 0L6.64 16.56 4.14 17.9A.75.75 0 013.75 17.25V2.75z" />
        </svg>
      );
  }
}

function PartnerListPanel({
  partners,
  onClose,
}: {
  partners: ReferralPartner[];
  onClose: () => void;
}) {
  const [sentId, setSentId] = useState<string | null>(null);

  return (
    <div className="mt-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-green-950">
            Referral partners
          </p>
          <p className="mt-0.5 text-[11px] text-stone-500">
            Send overflow or new-customer inquiries to a trusted local partner.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[11px] font-medium text-stone-500 hover:text-stone-800"
        >
          Close
        </button>
      </div>
      <ul className="mt-2 divide-y divide-stone-200 border-t border-stone-200">
        {partners.map((partner) => (
          <li
            key={partner.id}
            className="flex flex-wrap items-start justify-between gap-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="text-xs font-medium text-green-950">{partner.name}</p>
              <p className="text-[11px] text-stone-600">{partner.focus}</p>
              <p className="mt-0.5 text-[11px] text-stone-500">
                {partner.area} · {partner.contact} · {partner.phone}
              </p>
              {sentId === partner.id ? (
                <p className="mt-1 text-[11px] font-medium text-green-800">
                  Referral noted — partner can be contacted with this info.
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setSentId(partner.id)}
              className="shrink-0 rounded-md border border-green-800 px-2.5 py-1 text-[11px] font-medium text-green-900 hover:bg-white"
            >
              {sentId === partner.id ? "Sent" : "Send referral"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AlertRow({ alert }: { alert: ManagerAlert }) {
  const styles = PRIORITY_STYLES[alert.priority];
  const hasActions = Boolean(alert.actions && alert.actions.length > 0);
  const [showPartners, setShowPartners] = useState(false);
  // !text-[11px] beats global `button { font-size: inherit }` so Link + button match.
  const actionClassName =
    "rounded-md border border-green-800/40 bg-white px-2.5 py-1 !text-[11px] !leading-[1.5] font-medium text-green-900 hover:border-green-800 hover:bg-green-50";

  return (
    <li
      className={`rounded-lg border bg-white px-3 py-2.5 transition hover:bg-green-50/40 ${styles.border}`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${styles.iconBg}`}
          aria-hidden
        >
          <AlertIcon icon={alert.icon} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-green-950">
              {alert.title}
            </p>
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${styles.badge}`}
            >
              {PRIORITY_LABEL[alert.priority]}
            </span>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-700">
              {alert.count === 1 ? "1 item" : `${alert.count} items`}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-stone-600">{alert.explanation}</p>
          {hasActions ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {alert.actions!.map((action) =>
                action.action === "open-partners" ? (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => setShowPartners((open) => !open)}
                    className={actionClassName}
                  >
                    {showPartners ? "Hide partner list" : action.label}
                  </button>
                ) : action.href ? (
                  <Link
                    key={action.id}
                    href={action.href}
                    className={actionClassName}
                  >
                    {action.label}
                  </Link>
                ) : null
              )}
            </div>
          ) : null}
          {showPartners ? (
            <PartnerListPanel
              partners={REFERRAL_PARTNERS}
              onClose={() => setShowPartners(false)}
            />
          ) : null}
        </div>
        {!hasActions ? (
          <Link
            href={alert.href}
            className="hidden shrink-0 text-xs font-medium text-green-800 hover:underline sm:inline"
          >
            Open →
          </Link>
        ) : null}
      </div>
    </li>
  );
}

export function ManagerAlertsCenter({
  alerts,
}: {
  alerts: ManagerAlert[];
}) {
  const sorted = useMemo(
    () =>
      [...alerts].sort((a, b) => {
        // Capacity always stays at the top of the list when present.
        if (a.id === "company-capacity") return -1;
        if (b.id === "company-capacity") return 1;
        const rank = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        if (rank !== 0) return rank;
        return b.count - a.count;
      }),
    [alerts]
  );

  const [sectionOpen, setSectionOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? sorted : sorted.slice(0, 3);
  const hiddenCount = Math.max(0, sorted.length - 3);

  return (
    <section
      id="manager-alerts"
      className="scroll-mt-24 rounded-xl border border-stone-200 bg-white shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={() => setSectionOpen((open) => !open)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          aria-expanded={sectionOpen}
        >
          <h2 className="text-lg font-semibold text-green-950">
            Manager Alerts Center
          </h2>
          {sorted.length > 0 ? (
            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700">
              {sorted.length} active
            </span>
          ) : null}
          <span className="ml-auto text-xs font-medium text-stone-500 sm:ml-2">
            {sectionOpen ? "Collapse" : "Expand"}
          </span>
        </button>
      </div>

      <div
        className={`grid transition-all duration-300 ease-out ${
          sectionOpen
            ? "grid-rows-[1fr] opacity-100"
            : "pointer-events-none grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-4 border-t border-stone-100 px-4 pb-4 pt-3 sm:px-5">
            {sorted.length === 0 ? (
              <div className="rounded-lg border border-dashed border-stone-200 bg-stone-50 px-4 py-6 text-center">
                <p className="text-sm font-medium text-green-950">
                  No Active Alerts
                </p>
                <p className="mt-1 text-sm text-stone-500">
                  No critical issues need attention right now.
                </p>
              </div>
            ) : null}

            {sorted.length > 0 ? (
              <>
                <ul className="space-y-2">
                  {visible.map((alert) => (
                    <AlertRow key={alert.id} alert={alert} />
                  ))}
                </ul>
                {hiddenCount > 0 || showAll ? (
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowAll((value) => !value)}
                      className="text-sm font-medium text-green-800 hover:underline"
                    >
                      {showAll
                        ? "Show top alerts"
                        : `View all alerts (${sorted.length})`}
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
