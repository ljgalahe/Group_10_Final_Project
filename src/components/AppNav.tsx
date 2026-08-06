import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { AppNavLinks } from "@/components/AppNavLinks";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { getViewRole } from "@/lib/demo-role";

const navItems = [
  {
    href: "/chat",
    label: "Chat",
    roles: ["manager", "accountant", "operations", "crew_lead", "crew_member"],
  },
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
  // Ops primary order: Dashboard → Inquiries → Quotes → Contracts → Schedule → Visits → Chat
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
    label: "Schedule",
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
    href: "/invoices",
    label: "Invoices",
    roles: ["manager", "accountant", "customer"],
  },
  { href: "/contact", label: "Contact Us", roles: ["customer"] },
  { href: "/profile", label: "Profile", roles: ["customer"] },
  { href: "/support", label: "Customer Support", roles: ["operations"] },
  { href: "/payments", label: "Payments", roles: ["manager"] },
  { href: "/equipment", label: "Equipment", roles: ["accountant"] },
  {
    href: "/reports/ar-aging",
    label: "AR Aging",
    roles: ["manager", "accountant"],
  },
  {
    href: "/reports/profitability",
    label: "Profitability",
    roles: ["manager", "accountant"],
  },
  {
    href: "/reports/journal-entries",
    label: "Journal Entries",
    roles: ["accountant"],
  },
  {
    href: "/reports/general-ledger",
    label: "General Ledger",
    roles: ["accountant"],
  },
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
  "/support",
] as const;

export async function AppNav() {
  const role = await getViewRole();
  let visibleItems = navItems
    .filter((item) => item.roles.includes(role))
    .map(({ href, label }) => ({ href, label }));

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
    <aside className="gs-sidebar relative flex w-full flex-col border-b border-white/10 md:fixed md:inset-y-0 md:left-0 md:z-40 md:w-60 md:border-b-0 md:border-r md:border-white/10">
      <div className="flex items-start justify-between gap-4 px-5 pb-5 pt-6 md:flex-col md:items-stretch">
        <div className="relative min-w-0 pl-0 md:pl-2">
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

        <div className="hidden md:block">
          <div className="my-5 h-px bg-white/10" />
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[#8a9080]">
            Navigate
          </p>
        </div>
      </div>

      <div className="px-2 pb-3 md:flex md:min-h-0 md:flex-1 md:flex-col">
        <div className="overflow-x-auto md:overflow-visible">
          <AppNavLinks items={visibleItems} />
        </div>
      </div>

      <div className="mt-auto space-y-3 border-t border-white/10 px-4 py-4">
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
    </aside>
  );
}
