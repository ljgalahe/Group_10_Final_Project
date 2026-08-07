"use client";

import {
  AppSidebar,
  SidebarProvider,
  useSidebar,
} from "@/components/AppSidebar";
import type { UserRole } from "@/lib/types";

function AppFrameInner({
  role,
  items,
  ops = false,
  children,
}: {
  role: UserRole;
  items: { href: string; label: string }[];
  ops?: boolean;
  children: React.ReactNode;
}) {
  const { collapsed } = useSidebar();

  return (
    <>
      <AppSidebar role={role} items={items} />
      <div
        className={
          collapsed
            ? "min-h-dvh transition-[padding] duration-300 ease-out md:pl-10"
            : "min-h-dvh transition-[padding] duration-300 ease-out md:pl-60"
        }
        suppressHydrationWarning
      >
        <main
          className={`mx-auto w-full max-w-7xl px-5 sm:px-8 ${
            ops ? "py-6 sm:py-7" : "py-8 sm:py-10"
          }`}
        >
          {children}
        </main>
      </div>
    </>
  );
}

export function AppFrame({
  role,
  items,
  ops = false,
  children,
}: {
  role: UserRole;
  items: { href: string; label: string }[];
  ops?: boolean;
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppFrameInner role={role} items={items} ops={ops}>
        {children}
      </AppFrameInner>
    </SidebarProvider>
  );
}
