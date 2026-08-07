"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export type AppNavItem = {
  href: string;
  label: string;
};

const NAV_CLASS =
  "flex flex-row gap-1 overflow-x-auto md:flex-col md:gap-1 md:overflow-visible";

const LINK_BASE =
  "group relative shrink-0 whitespace-nowrap px-3 py-2 text-[13px] leading-snug tracking-[0.05em] transition duration-200 md:shrink md:whitespace-normal";
const LINK_ACTIVE = `${LINK_BASE} bg-white/[0.07] text-[#faf8f4]`;
const LINK_IDLE = `${LINK_BASE} text-[#c9c4b8] hover:bg-white/[0.04] hover:text-[#f3f0ea]`;
const LINK_PENDING = `${LINK_ACTIVE} opacity-80`;
const RAIL_ACTIVE =
  "absolute inset-y-2 left-0 hidden w-px origin-center scale-y-100 bg-[var(--champagne-bright)] transition duration-300 md:block";
const RAIL_IDLE =
  "absolute inset-y-2 left-0 hidden w-px origin-center scale-y-50 bg-transparent transition duration-300 group-hover:scale-y-100 group-hover:bg-white/25 md:block";

export function AppNavLinks({ items }: { items: AppNavItem[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  // Do not prefetch every nav route on mount — heavy RSC pages (dashboard,
  // visits, profitability, etc.) fan out shared Supabase work and stall
  // soft navigations with "Rendering..." for the whole team.

  return (
    <nav className={NAV_CLASS} aria-label="Main" suppressHydrationWarning>
      {items.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        const pending = isPending && pendingHref === item.href;
        const linkClass = pending
          ? LINK_PENDING
          : active
            ? LINK_ACTIVE
            : LINK_IDLE;

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            title={item.label}
            onClick={(event) => {
              if (
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey ||
                event.button !== 0
              ) {
                return;
              }
              event.preventDefault();
              setPendingHref(item.href);
              startTransition(() => {
                router.push(item.href);
              });
            }}
            aria-current={active ? "page" : undefined}
            aria-busy={pending || undefined}
            aria-label={item.label}
            className={linkClass}
            suppressHydrationWarning
          >
            <span
              className={active || pending ? RAIL_ACTIVE : RAIL_IDLE}
              aria-hidden
            />
            <span className="inline-flex items-center gap-2">
              {item.label}
              {pending ? (
                <span
                  className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--champagne-bright)]"
                  aria-hidden
                />
              ) : null}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
