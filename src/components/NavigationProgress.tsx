"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/** Thin progress bar while route content is resolving. */
export function NavigationProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const done = window.setTimeout(() => setVisible(false), 450);
    return () => window.clearTimeout(done);
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden bg-transparent md:left-60"
      aria-hidden
    >
      <div className="gs-nav-progress h-full w-full origin-left bg-[var(--champagne-bright)]" />
    </div>
  );
}
