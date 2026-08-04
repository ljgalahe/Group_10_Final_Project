"use client";

import { switchDemoRole } from "@/app/actions/auth";
import { DEMO_ROLES, type UserRole } from "@/lib/types";

export function RoleSwitcher({ currentRole }: { currentRole: UserRole }) {
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
        className="rounded-md border border-green-600 bg-green-950 px-3 py-2 text-sm text-white"
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
