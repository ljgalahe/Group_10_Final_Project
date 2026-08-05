"use client";

import { useEffect, useState } from "react";
import { switchDemoRole } from "@/app/actions/auth";
import { DEMO_ROLES, type UserRole } from "@/lib/types";

const selectClassName =
  "rounded-md border border-green-600 bg-green-950 px-3 py-2 text-sm text-white";

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
      <label htmlFor="role" className="sr-only">
        Switch demo role
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
            View as: {item.label}
          </option>
        ))}
      </select>
    </form>
  );
}
