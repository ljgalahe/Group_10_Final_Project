import { roundMoney } from "@/lib/journal";
import type { ChartOfAccount } from "@/lib/chart-of-accounts";
import type { JournalEntry } from "@/lib/queries";

export type GeneralLedgerAccount = {
  accountCode: string;
  accountName: string;
  totalDebits: number;
  totalCredits: number;
  balance: number;
  trialDebit: number;
  trialCredit: number;
  lineCount: number;
};

export type GeneralLedgerRegisterLine = {
  entryId: string;
  entryNumber: string;
  date: string;
  memo: string;
  reference: string;
  debit: number;
  credit: number;
  runningBalance: number;
};

export function buildGeneralLedgerAccounts(
  entries: JournalEntry[],
  chart: ChartOfAccount[]
): GeneralLedgerAccount[] {
  const totals = new Map<
    string,
    { accountName: string; debits: number; credits: number; lineCount: number }
  >();

  for (const entry of entries) {
    for (const line of entry.lines) {
      const existing = totals.get(line.accountCode) ?? {
        accountName: line.accountName.split(" — ")[0] ?? line.accountName,
        debits: 0,
        credits: 0,
        lineCount: 0,
      };
      existing.debits = roundMoney(existing.debits + line.debit);
      existing.credits = roundMoney(existing.credits + line.credit);
      existing.lineCount += 1;
      totals.set(line.accountCode, existing);
    }
  }

  const chartAccounts = chart.map((account) => {
    const activity = totals.get(account.code);
    const totalDebits = activity?.debits ?? 0;
    const totalCredits = activity?.credits ?? 0;
    const balance = roundMoney(totalDebits - totalCredits);
    return {
      accountCode: account.code,
      accountName: account.name,
      totalDebits,
      totalCredits,
      balance,
      trialDebit: balance > 0 ? balance : 0,
      trialCredit: balance < 0 ? roundMoney(-balance) : 0,
      lineCount: activity?.lineCount ?? 0,
    };
  });

  const chartCodes = new Set(chart.map((account) => account.code));
  const extraCodes = [...totals.keys()].filter((code) => !chartCodes.has(code));

  for (const code of extraCodes.sort()) {
    const activity = totals.get(code)!;
    const balance = roundMoney(activity.debits - activity.credits);
    chartAccounts.push({
      accountCode: code,
      accountName: activity.accountName,
      totalDebits: activity.debits,
      totalCredits: activity.credits,
      balance,
      trialDebit: balance > 0 ? balance : 0,
      trialCredit: balance < 0 ? roundMoney(-balance) : 0,
      lineCount: activity.lineCount,
    });
  }

  return chartAccounts;
}

export function buildAccountRegister(
  entries: JournalEntry[],
  accountCode: string
): GeneralLedgerRegisterLine[] {
  const lines: Omit<GeneralLedgerRegisterLine, "runningBalance">[] = [];

  for (const entry of entries) {
    for (const line of entry.lines) {
      if (line.accountCode !== accountCode) continue;
      lines.push({
        entryId: entry.id,
        entryNumber: entry.entryNumber,
        date: entry.date,
        memo: entry.memo,
        reference: entry.reference,
        debit: line.debit,
        credit: line.credit,
      });
    }
  }

  lines.sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    return a.entryNumber.localeCompare(b.entryNumber);
  });

  let running = 0;
  return lines.map((line) => {
    running = roundMoney(running + line.debit - line.credit);
    return { ...line, runningBalance: running };
  });
}

export function summarizeGeneralLedger(accounts: GeneralLedgerAccount[]) {
  const active = accounts.filter((account) => account.lineCount > 0);
  const totalTrialDebit = roundMoney(
    active.reduce((sum, account) => sum + account.trialDebit, 0)
  );
  const totalTrialCredit = roundMoney(
    active.reduce((sum, account) => sum + account.trialCredit, 0)
  );
  return {
    activeAccountCount: active.length,
    totalTrialDebit,
    totalTrialCredit,
    balanced: Math.abs(totalTrialDebit - totalTrialCredit) < 0.005,
  };
}
