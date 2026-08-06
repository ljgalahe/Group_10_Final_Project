import Link from "next/link";
import { getViewRole } from "@/lib/demo-role";
import { RoleSwitcher } from "./RoleSwitcher";
import { signOut } from "@/app/actions/auth";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    roles: [
      "manager",
      "accountant",
      "operations",
      "crew_lead",
      "crew_member",
      "customer",
    ],
  },
  {
    href: "/inquiries",
    label: "Home",
    roles: ["inquiries"],
  },
  // Ops primary order: Dashboard → Inquiries → Quotes → Contracts → Scheduling → Visits
  // (Inquiries before Quotes so Operations creates quotes from inquiries first.)
  {
    href: "/ops/inquiries",
    label: "Inquiries",
    roles: ["operations"],
  },
  {
    href: "/quotes",
    label: "Quotes",
    roles: ["operations"],
  },
  {
    href: "/contracts",
    label: "Contracts",
    roles: ["manager", "accountant", "operations", "crew_lead", "customer"],
  },
  {
    href: "/schedule",
    label: "Scheduling",
    roles: ["operations", "crew_lead", "crew_member"],
  },
  {
    href: "/visits",
    label: "Visits",
    roles: [
      "manager",
      "accountant",
      "operations",
      "crew_lead",
      "crew_member",
      "customer",
    ],
  },
  {
    href: "/chat",
    label: "Chat",
    roles: ["manager", "accountant", "operations", "crew_lead", "crew_member"],
  },
  { href: "/invoices", label: "Invoices", roles: ["manager", "accountant", "customer"] },
  { href: "/contact", label: "Contact Us", roles: ["customer"] },
  { href: "/profile", label: "Profile", roles: ["customer"] },
  { href: "/support", label: "Customer Support", roles: ["manager"] },
  { href: "/payments", label: "Payments", roles: ["manager"] },
  { href: "/equipment", label: "Equipment", roles: ["accountant"] },
  { href: "/reports/ar-aging", label: "AR Aging", roles: ["manager", "accountant"] },
  { href: "/reports/profitability", label: "Profitability", roles: ["manager", "accountant"] },
  { href: "/reports/journal-entries", label: "Journal Entries", roles: ["accountant"] },
  { href: "/reports/general-ledger", label: "General Ledger", roles: ["accountant"] },
];

/** Operations top-tab order (other roles keep shared navItems order). */
const OPERATIONS_NAV_HREF_ORDER = [
  "/dashboard",
  "/ops/inquiries",
  "/quotes",
  "/contracts",
  "/schedule",
  "/visits",
  "/chat",
] as const;

export async function AppNav() {
  const role = await getViewRole();
  let visibleItems = navItems.filter((item) => item.roles.includes(role));
  if (role === "operations") {
    const rank = new Map<string, number>(
      OPERATIONS_NAV_HREF_ORDER.map((href, index) => [href, index])
    );
    visibleItems = [...visibleItems].sort((a, b) => {
      const aRank = rank.get(a.href) ?? OPERATIONS_NAV_HREF_ORDER.length + 1;
      const bRank = rank.get(b.href) ?? OPERATIONS_NAV_HREF_ORDER.length + 1;
      return aRank - bRank;
    });
  }

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
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
