import { JOURNAL_ACCOUNTS } from "@/lib/journal";

export type AccountType =
  | "asset"
  | "liability"
  | "equity"
  | "revenue"
  | "expense";

export type ChartOfAccount = {
  code: string;
  name: string;
  accountType: AccountType;
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
  revenue: "Revenue",
  expense: "Expenses",
};

const DEFAULT_ACCOUNT_TYPES: Record<string, AccountType> = {
  "1000": "asset",
  "1200": "asset",
  "1500": "asset",
  "2000": "liability",
  "2100": "liability",
  "4000": "revenue",
  "5010": "expense",
  "5020": "expense",
  "5030": "expense",
  "5040": "expense",
  "5900": "expense",
};

export function inferAccountType(code: string): AccountType {
  const first = code.trim()[0];
  if (first === "1") return "asset";
  if (first === "2") return "liability";
  if (first === "3") return "equity";
  if (first === "4") return "revenue";
  if (first === "5") return "expense";
  return "expense";
}

export const DEFAULT_CHART_OF_ACCOUNTS: ChartOfAccount[] = JOURNAL_ACCOUNTS.map(
  (account) => ({
    code: account.code,
    name: account.name,
    accountType:
      DEFAULT_ACCOUNT_TYPES[account.code] ?? inferAccountType(account.code),
  })
);

export function accountNameFromChart(
  code: string,
  chart: ChartOfAccount[]
): string {
  return chart.find((account) => account.code === code)?.name ?? code;
}
