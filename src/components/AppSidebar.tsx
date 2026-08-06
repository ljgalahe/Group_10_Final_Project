"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { signOut } from "@/app/actions/auth";
import { AppNavLinks } from "@/components/AppNavLinks";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import type { UserRole } from "@/lib/types";

const STORAGE_KEY = "gs-sidebar-collapsed";

type SidebarCtx = {
  collapsed: boolean;
  toggleCollapsed: () => void;
};

const SidebarContext = createContext<SidebarCtx | null>(null);

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return ctx;
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      collapsed: hydrated && collapsed,
      toggleCollapsed,
    }),
    [collapsed, hydrated, toggleCollapsed]
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function AppSidebar({
  role,
  items,
}: {
  role: UserRole;
  items: { href: string; label: string }[];
}) {
  const { collapsed, toggleCollapsed } = useSidebar();

  return (
    <aside
      className={`gs-sidebar relative z-40 flex w-full flex-col border-b border-white/10 transition-[width] duration-300 ease-out md:fixed md:inset-y-0 md:left-0 md:h-dvh md:overflow-hidden md:border-b-0 md:border-r md:border-white/10 ${
        collapsed ? "md:w-[4.5rem]" : "md:w-60"
      }`}
      data-sidebar={collapsed ? "collapsed" : "expanded"}
    >
      <div
        className={`flex shrink-0 items-start justify-between gap-3 px-3 pb-4 pt-5 md:flex-col md:items-stretch ${
          collapsed ? "md:px-2 md:pt-4" : "md:px-4"
        }`}
      >
        <div
          className={`relative min-w-0 ${collapsed ? "md:text-center" : "md:pl-1"}`}
        >
          {!collapsed ? (
            <>
              <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-[var(--champagne-bright)]">
                Commercial
              </p>
              <Link
                href="/"
                className="mt-1 block font-display text-[1.7rem] leading-none tracking-tight text-[#faf8f4]"
              >
                GreenScape
              </Link>
              <p className="mt-2 max-w-[11rem] font-display text-[13px] italic leading-relaxed text-[#9a958a]">
                Commercial grounds, elevated.
              </p>
            </>
          ) : (
            <Link
              href="/"
              className="mx-auto block font-display text-2xl font-semibold leading-none text-[#faf8f4]"
              title="GreenScape"
            >
              G
            </Link>
          )}
        </div>

        <button
          type="button"
          onClick={toggleCollapsed}
          className="hidden h-9 w-9 shrink-0 items-center justify-center border border-white/15 text-[#c9c4b8] transition hover:border-[var(--champagne)]/40 hover:bg-white/5 hover:text-[#faf8f4] md:inline-flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
            className={`transition duration-300 ${collapsed ? "rotate-180" : ""}`}
          >
            <path
              d="M10 3.5L5.5 8L10 12.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {!collapsed ? (
          <div className="hidden md:block">
            <div className="my-4 h-px bg-white/10" />
            <p className="mb-2 px-1 text-[10px] font-medium uppercase tracking-[0.22em] text-[#8a9080]">
              Navigate
            </p>
          </div>
        ) : (
          <div className="my-3 hidden h-px bg-white/10 md:block" />
        )}
      </div>

      <div className="gs-sidebar-scroll min-h-0 flex-1 px-1.5 pb-3 md:overflow-y-auto">
        <AppNavLinks items={items} collapsed={collapsed} />
      </div>

      <div
        className={`mt-auto shrink-0 space-y-3 border-t border-white/10 py-4 ${
          collapsed ? "px-2" : "px-3"
        }`}
      >
        {!collapsed ? (
          <>
            <RoleSwitcher currentRole={role} />
            <form action={signOut}>
              <button
                type="submit"
                className="gs-text-link w-full justify-between border border-white/15 px-3 py-2 text-[#c9c4b8] hover:border-[var(--champagne)]/40 hover:bg-white/5 hover:text-[#faf8f4]"
              >
                Sign Out
                <span aria-hidden>→</span>
              </button>
            </form>
          </>
        ) : (
          <form action={signOut} className="flex justify-center">
            <button
              type="submit"
              className="inline-flex h-9 w-9 items-center justify-center border border-white/15 text-[11px] tracking-wide text-[#c9c4b8] transition hover:border-[var(--champagne)]/40 hover:bg-white/5 hover:text-[#faf8f4]"
              title="Sign Out"
              aria-label="Sign Out"
            >
              ⎋
            </button>
          </form>
        )}
      </div>
    </aside>
  );
}
