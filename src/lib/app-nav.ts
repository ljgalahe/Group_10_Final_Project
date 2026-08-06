import type { UserRole } from "@/lib/types";

export type AppNavItem = {
  href: string;
  label: string;
  roles: UserRole[];
};

export const APP_NAV_ITEMS: AppNavItem[] = [
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
  {
    href: "/ops/inquiries",
    label: "Inquiries",
    roles: ["operations"],
  },
  {
    href: "/ops/site-surveys",
    label: "Site Survey",
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
    roles: ["manager", "operations", "crew_lead", "customer"],
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
  { href: "/inventory", label: "Inventory", roles: ["accountant"] },
  {
    href: "/reports/ar-aging",
    label: "AR Aging",
    roles: ["manager", "accountant"],
  },
  {
    href: "/reports/ap-aging",
    label: "Accounts Payable",
    roles: ["accountant"],
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

const OPERATIONS_NAV_HREF_ORDER = [
  "/dashboard",
  "/ops/inquiries",
  "/ops/site-surveys",
  "/quotes",
  "/contracts",
  "/schedule",
  "/visits",
  "/chat",
  "/support",
] as const;

export function getVisibleNavItems(role: UserRole) {
  let visible = APP_NAV_ITEMS.filter((item) => item.roles.includes(role)).map(
    ({ href, label }) => ({ href, label })
  );

  if (role === "operations") {
    const rank = new Map<string, number>(
      OPERATIONS_NAV_HREF_ORDER.map((href, index) => [href, index])
    );
    visible = [...visible].sort((a, b) => {
      const aRank = rank.get(a.href) ?? OPERATIONS_NAV_HREF_ORDER.length + 1;
      const bRank = rank.get(b.href) ?? OPERATIONS_NAV_HREF_ORDER.length + 1;
      return aRank - bRank;
    });
  }

  return visible;
}
