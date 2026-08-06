"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { UserRole } from "@/lib/types";

type RoleOption = { role: UserRole; label: string };

export function ViewRoleSelect({
  id,
  name = "role",
  value,
  options,
  onChange,
  variant = "welcome",
}: {
  id?: string;
  name?: string;
  value: UserRole;
  options: readonly RoleOption[];
  onChange: (role: UserRole) => void;
  variant?: "welcome" | "sidebar";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const generatedId = useId();
  const triggerId = id ?? generatedId;

  const current =
    options.find((item) => item.role === value)?.label ?? options[0]?.label;

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const welcome = variant === "welcome";

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        id={triggerId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={
          welcome
            ? "inline-flex min-w-[9.5rem] items-center justify-between gap-3 border-0 border-b border-white/35 bg-transparent pb-1.5 pr-1 font-display text-[1.05rem] italic tracking-[0.03em] text-[#faf8f4] outline-none transition hover:border-[#c4b7a0] focus:border-[#c4b7a0]"
            : "inline-flex w-full items-center justify-between gap-3 border-0 border-b border-white/25 bg-transparent py-2.5 pr-1 font-display text-[0.95rem] tracking-[0.02em] text-[#f3f0ea] outline-none transition hover:border-[var(--champagne)]/50 focus:border-[var(--champagne)]/50"
        }
      >
        <span>{current}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          aria-hidden
          className={`shrink-0 opacity-70 transition ${open ? "rotate-180" : ""}`}
        >
          <path
            fill="currentColor"
            d="M3 4.5L6 8l3-3.5"
          />
        </svg>
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-labelledby={triggerId}
          className={
            welcome
              ? "absolute bottom-[calc(100%+0.55rem)] left-1/2 z-50 min-w-[12.5rem] -translate-x-1/2 border border-white/20 bg-[#1f241c]/96 py-2 shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-md"
              : "absolute bottom-[calc(100%+0.45rem)] left-0 z-50 w-full min-w-[11rem] border border-white/15 bg-[#1f241c] py-2 shadow-[0_16px_36px_rgba(0,0,0,0.4)]"
          }
        >
          {options.map((item) => {
            const selected = item.role === value;
            return (
              <li key={item.role} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(item.role);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center px-5 py-3 text-left font-display text-[1.02rem] leading-none tracking-[0.03em] transition ${
                    selected
                      ? "bg-white/12 text-[#faf8f4]"
                      : "text-[#e8e4dc] hover:bg-white/8 hover:text-[#faf8f4]"
                  }`}
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
