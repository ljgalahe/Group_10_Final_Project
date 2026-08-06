"use client";

import { useEffect, useState } from "react";
import { switchDemoRole } from "@/app/actions/auth";
import { DEMO_ROLES, type UserRole } from "@/lib/types";

const selectClassName =
  "w-full border border-white/15 bg-[#1f241c] px-3 py-2 text-[12px] tracking-wide text-[#f3f0ea] outline-none transition focus:border-[#c4b7a0]/60";

export function RoleSwitcher({ currentRole }: { currentRole: UserRole }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentLabel =
    DEMO_ROLES.find((item) => item.role === currentRole)?.label ?? "Manager";

  if (!mounted) {
    return (
      <div className={selectClassName} aria-hidden>
        View as: {currentLabel}
      </div>
    );
  }

  return (
    <form action={switchDemoRole}>
      <label
        htmlFor="role"
        className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.2em] text-[#8a9080]"
      >
        View as
      </label>
      <select
        id="role"
        name="role"
        defaultValue={currentRole}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className={selectClassName}
      >
        {DEMO_ROLES.map((item) => (
          <option key={item.role} value={item.role}>
            {item.label}
          </option>
        ))}
      </select>
    </form>
  );
}
