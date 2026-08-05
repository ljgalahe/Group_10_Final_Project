import Link from "next/link";
import { getViewRole } from "@/lib/demo-role";
import { RoleSwitcher } from "./RoleSwitcher";
import { signOut } from "@/app/actions/auth";

const navItems = [
  { href: "/dashboard", label: "Dashboard", roles: ["manager", "accountant", "crew_lead", "customer"] },
  { href: "/contracts", label: "Contracts", roles: ["manager", "accountant", "crew_lead", "customer"] },
  { href: "/schedule", label: "Schedule", roles: ["crew_lead"] },
  { href: "/visits", label: "Visits", roles: ["manager", "accountant", "crew_lead", "customer"] },
  { href: "/chat", label: "Chat", roles: ["manager", "accountant", "crew_lead", "customer"] },
  { href: "/invoices", label: "Invoices", roles: ["manager", "accountant", "customer"] },
  { href: "/payments", label: "Payments", roles: ["manager", "accountant"] },
  { href: "/reports/ar-aging", label: "AR Aging", roles: ["manager", "accountant"] },
  { href: "/reports/profitability", label: "Profitability", roles: ["manager", "accountant"] },
];

export async function AppNav() {
  const role = await getViewRole();
  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <header className="border-b border-green-800/20 bg-green-900 text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <div>
          <Link href="/dashboard" className="text-lg font-bold tracking-tight">
            GreenScape Commercial
          </Link>
          <p className="text-xs text-green-200">Contract-to-Cash Management</p>
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          {visibleItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm hover:bg-green-800"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <RoleSwitcher currentRole={role} />
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-green-600 px-3 py-2 text-sm hover:bg-green-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
