import { jsPDF } from "jspdf";
import { formatCurrency } from "@/lib/format";
import {
  periodLabel,
  scaleForPeriod,
  statementTitle,
  type FinancialStatementInputs,
  type PeriodType,
  type StatementType,
} from "@/app/reports/profitability/lib/financial-statement-data";

type PdfLine = { label: string; amount: number; indent?: number; bold?: boolean };

function money(amount: number) {
  return formatCurrency(amount);
}

function addHeader(
  doc: jsPDF,
  title: string,
  subtitle: string,
  left: number
): number {
  let y = 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("GreenScape Commercial", left, y);
  y += 8;
  doc.setFontSize(13);
  doc.text(title, left, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(subtitle, left, y);
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Generated ${new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })}`,
    left,
    y
  );
  doc.setTextColor(0, 0, 0);
  return y + 12;
}

function addLines(doc: jsPDF, lines: PdfLine[], startY: number, left: number) {
  let y = startY;
  const amountX = 190;

  for (const line of lines) {
    if (y > 270) {
      doc.addPage();
      y = 22;
    }
    const indent = left + (line.indent ?? 0) * 8;
    doc.setFont("helvetica", line.bold ? "bold" : "normal");
    doc.setFontSize(line.bold ? 10 : 9);
    doc.text(line.label, indent, y);
    doc.text(money(line.amount), amountX, y, { align: "right" });
    y += line.bold ? 8 : 6;
  }

  return y;
}

function buildIncomeStatementPdf(
  inputs: FinancialStatementInputs,
  periodType: PeriodType
) {
  const doc = new jsPDF();
  const left = 20;
  const scaled = scaleForPeriod(inputs, periodType);
  const netIncome = scaled.margin - scaled.operatingExpenses;

  let y = addHeader(
    doc,
    statementTitle("income_statement"),
    periodLabel(periodType),
    left
  );

  y = addLines(
    doc,
    [
      { label: "Service revenue", amount: scaled.revenue },
      { label: "Direct labor and job costs", amount: -scaled.costs, indent: 1 },
      { label: "Gross profit", amount: scaled.margin, bold: true },
      { label: "General and administrative", amount: -scaled.operatingExpenses, indent: 1 },
      { label: "Net income", amount: netIncome, bold: true },
    ],
    y,
    left
  );

  if (inputs.report.length > 0) {
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Revenue by contract", left, y);
    y += 8;
    const factor =
      periodType === "year_end" || inputs.totalRevenue <= 0
        ? 1
        : scaled.revenue / inputs.totalRevenue;
    for (const row of inputs.report) {
      if (y > 265) {
        doc.addPage();
        y = 22;
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(row.title, left + 8, y, { maxWidth: 130 });
      doc.text(money(row.revenue * factor), 190, y, { align: "right" });
      y += 6;
    }
  }

  return doc;
}

function buildBalanceSheetPdf(
  inputs: FinancialStatementInputs,
  periodType: PeriodType
) {
  const doc = new jsPDF();
  const left = 20;
  const scaled = scaleForPeriod(inputs, periodType);
  const netIncome = scaled.margin - scaled.operatingExpenses;
  const cash = Math.max(0, scaled.collected);
  const accountsReceivable = Math.max(0, scaled.outstandingBalance);
  const equipment = scaled.equipment;
  const totalAssets = cash + accountsReceivable + equipment;
  const accountsPayable = Math.max(0, scaled.costs * 0.12);
  const totalLiabilities = accountsPayable;
  const retainedEarnings = totalAssets - totalLiabilities;

  let y = addHeader(
    doc,
    statementTitle("balance_sheet"),
    periodLabel(periodType),
    left
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Assets", left, y);
  y += 8;

  y = addLines(
    doc,
    [
      { label: "Cash and cash equivalents", amount: cash, indent: 1 },
      { label: "Accounts receivable", amount: accountsReceivable, indent: 1 },
      { label: "Property and equipment, net", amount: equipment, indent: 1 },
      { label: "Total assets", amount: totalAssets, bold: true },
    ],
    y,
    left
  );

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Liabilities and equity", left, y);
  y += 8;

  y = addLines(
    doc,
    [
      { label: "Accounts payable", amount: accountsPayable, indent: 1 },
      { label: "Total liabilities", amount: totalLiabilities, bold: true },
      { label: "Retained earnings", amount: retainedEarnings - netIncome, indent: 1 },
      { label: "Current period net income", amount: netIncome, indent: 1 },
      { label: "Total equity", amount: retainedEarnings, bold: true },
      {
        label: "Total liabilities and equity",
        amount: totalLiabilities + retainedEarnings,
        bold: true,
      },
    ],
    y,
    left
  );

  return doc;
}

function buildCashFlowsPdf(
  inputs: FinancialStatementInputs,
  periodType: PeriodType
) {
  const doc = new jsPDF();
  const left = 20;
  const scaled = scaleForPeriod(inputs, periodType);
  const netIncome = scaled.margin - scaled.operatingExpenses;
  const depreciation = scaled.equipment * 0.05;
  const changeInAr =
    periodType === "monthly" ? scaled.outstandingBalance * 0.05 : 0;
  const cashFromOperations = netIncome + depreciation - changeInAr;
  const equipmentPurchases = periodType === "year_end" ? scaled.equipment * 0.1 : 0;
  const cashFromInvesting = -equipmentPurchases;
  const cashFromFinancing = 0;
  const netChange = cashFromOperations + cashFromInvesting + cashFromFinancing;

  let y = addHeader(
    doc,
    statementTitle("cash_flows"),
    periodLabel(periodType),
    left
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Cash flows from operating activities", left, y);
  y += 8;

  y = addLines(
    doc,
    [
      { label: "Net income", amount: netIncome, indent: 1 },
      { label: "Depreciation and amortization", amount: depreciation, indent: 1 },
      { label: "Change in accounts receivable", amount: -changeInAr, indent: 1 },
      { label: "Net cash from operations", amount: cashFromOperations, bold: true },
    ],
    y,
    left
  );

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Cash flows from investing activities", left, y);
  y += 8;

  y = addLines(
    doc,
    [
      { label: "Equipment purchases", amount: cashFromInvesting, indent: 1 },
      { label: "Net cash from investing", amount: cashFromInvesting, bold: true },
    ],
    y,
    left
  );

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Cash flows from financing activities", left, y);
  y += 8;

  y = addLines(
    doc,
    [
      { label: "Owner distributions / contributions", amount: cashFromFinancing, indent: 1 },
      { label: "Net cash from financing", amount: cashFromFinancing, bold: true },
      { label: "Net increase (decrease) in cash", amount: netChange, bold: true },
    ],
    y,
    left
  );

  return doc;
}

export function generateFinancialStatementPdf(
  inputs: FinancialStatementInputs,
  statementType: StatementType,
  periodType: PeriodType
): jsPDF {
  switch (statementType) {
    case "income_statement":
      return buildIncomeStatementPdf(inputs, periodType);
    case "balance_sheet":
      return buildBalanceSheetPdf(inputs, periodType);
    case "cash_flows":
      return buildCashFlowsPdf(inputs, periodType);
  }
}

export function financialStatementFilename(
  statementType: StatementType,
  periodType: PeriodType
): string {
  const slug = statementType.replace(/_/g, "-");
  const period = periodType === "monthly" ? "monthly" : "year-end";
  const stamp = new Date().toISOString().slice(0, 7);
  return `GreenScape-${slug}-${period}-${stamp}.pdf`;
}

export function downloadFinancialStatementPdf(
  inputs: FinancialStatementInputs,
  statementType: StatementType,
  periodType: PeriodType
) {
  const doc = generateFinancialStatementPdf(inputs, statementType, periodType);
  doc.save(financialStatementFilename(statementType, periodType));
}
