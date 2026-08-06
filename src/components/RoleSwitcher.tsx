"use client";

import { useEffect, useRef, useState } from "react";
import { switchDemoRole } from "@/app/actions/auth";
import { ViewRoleSelect } from "@/components/ViewRoleSelect";
import { DEMO_ROLES, type UserRole } from "@/lib/types";

export function RoleSwitcher({ currentRole }: { currentRole: UserRole }) {
  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState<UserRole>(currentRole);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setRole(currentRole);
  }, [currentRole]);

  const currentLabel =
    DEMO_ROLES.find((item) => item.role === currentRole)?.label ?? "Manager";

  if (!mounted) {
    return (
      <div>
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-[#8a9080]">
          View as
        </p>
        <p className="border-b border-white/20 py-2.5 font-display text-[0.95rem] tracking-[0.02em] text-[#f3f0ea]">
          {currentLabel}
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} action={switchDemoRole}>
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-[#8a9080]">
        View as
      </p>
      <ViewRoleSelect
        id="role"
        name="role"
        value={role}
        options={DEMO_ROLES}
        variant="sidebar"
        onChange={(next) => {
          setRole(next);
          // Let the hidden input update, then submit for redirect.
          queueMicrotask(() => formRef.current?.requestSubmit());
        }}
      />
    </form>
  );
}
