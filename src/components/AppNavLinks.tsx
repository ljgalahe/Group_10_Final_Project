"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export type AppNavItem = {
  href: string;
  label: string;
};

export function AppNavLinks({
  items,
  collapsed = false,
}: {
  items: AppNavItem[];
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  useEffect(() => {
    for (const item of items) {
      router.prefetch(item.href);
    }
  }, [items, router]);

  return (
    <nav
      className={`flex flex-row gap-1 overflow-x-auto md:overflow-visible ${
        collapsed
          ? "md:flex-col md:items-center md:gap-1"
          : "md:flex-col md:gap-1"
      }`}
      aria-label="Main"
    >
      {items.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        const pending = isPending && pendingHref === item.href;
        const short =
          item.label
            .split(/\s+/)
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || item.label.slice(0, 1);

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
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
            className={`group relative transition duration-200 ${
              collapsed
                ? "flex h-10 w-10 shrink-0 items-center justify-center text-[11px] font-medium tracking-wide md:mx-auto"
                : "shrink-0 whitespace-nowrap px-3 py-2 text-[13px] leading-snug tracking-[0.05em] md:shrink md:whitespace-normal"
            } ${
              active || pending
                ? "bg-white/[0.07] text-[#faf8f4]"
                : "text-[#c9c4b8] hover:bg-white/[0.04] hover:text-[#f3f0ea]"
            } ${pending ? "opacity-80" : ""}`}
          >
            {!collapsed ? (
              <span
                className={`absolute inset-y-2 left-0 hidden w-px origin-center transition duration-300 md:block ${
                  active || pending
                    ? "scale-y-100 bg-[var(--champagne-bright)]"
                    : "scale-y-50 bg-transparent group-hover:scale-y-100 group-hover:bg-white/25"
                }`}
                aria-hidden
              />
            ) : null}
            <span className="inline-flex items-center gap-2">
              {collapsed ? short : item.label}
              {pending && !collapsed ? (
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
