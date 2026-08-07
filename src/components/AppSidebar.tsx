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

const ASIDE_BASE =
  "gs-sidebar relative z-40 flex w-full flex-col border-b border-white/10 transition-[width] duration-300 ease-out md:fixed md:inset-y-0 md:left-0 md:h-dvh md:overflow-hidden md:border-b-0 md:border-r md:border-white/10";
const ASIDE_EXPANDED = `${ASIDE_BASE} md:w-60`;
const ASIDE_COLLAPSED = `${ASIDE_BASE} md:w-10`;

const HEADER_BASE =
  "flex shrink-0 items-start justify-between gap-3 px-3 pb-4 pt-5 md:flex-col md:items-stretch";
const HEADER_EXPANDED = `${HEADER_BASE} md:px-4`;
const HEADER_COLLAPSED = `${HEADER_BASE} md:items-center md:px-0 md:pb-0 md:pt-4`;

const TOGGLE_BASE =
  "hidden h-9 shrink-0 items-center justify-center border border-white/15 text-[#c9c4b8] transition hover:border-[var(--champagne)]/40 hover:bg-white/5 hover:text-[#faf8f4] md:inline-flex";
const TOGGLE_EXPANDED = `${TOGGLE_BASE} w-9`;
const TOGGLE_COLLAPSED =
  `${TOGGLE_BASE} w-full rounded-none border-x-0 border-t-0 border-b-white/10`;

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
  // Always start expanded so SSR HTML matches the first client paint.
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") {
        setCollapsed(true);
      }
    } catch {
      /* ignore */
    }
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
      // Ignore stored preference until after mount to avoid hydration mismatch.
      collapsed: mounted ? collapsed : false,
      toggleCollapsed,
    }),
    [collapsed, mounted, toggleCollapsed]
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
      className={collapsed ? ASIDE_COLLAPSED : ASIDE_EXPANDED}
      data-sidebar={collapsed ? "collapsed" : "expanded"}
      suppressHydrationWarning
    >
      <div
        className={collapsed ? HEADER_COLLAPSED : HEADER_EXPANDED}
        suppressHydrationWarning
      >
        {!collapsed ? (
          <div className="relative min-w-0 md:pl-1">
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
          </div>
        ) : null}

        <button
          type="button"
          onClick={toggleCollapsed}
          className={collapsed ? TOGGLE_COLLAPSED : TOGGLE_EXPANDED}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          suppressHydrationWarning
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
            className={
              collapsed
                ? "rotate-180 transition duration-300"
                : "transition duration-300"
            }
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
        ) : null}
      </div>

      {!collapsed ? (
        <div className="gs-sidebar-scroll min-h-0 flex-1 px-1.5 pb-3 md:overflow-y-auto">
          <AppNavLinks items={items} />
        </div>
      ) : (
        <div className="hidden min-h-0 flex-1 md:block" aria-hidden />
      )}

      {!collapsed ? (
        <div className="mt-auto shrink-0 space-y-3 border-t border-white/10 px-3 py-4">
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
        </div>
      ) : null}
    </aside>
  );
}
