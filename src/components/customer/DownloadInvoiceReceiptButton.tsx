"use client";

import { jsPDF } from "jspdf";
import { formatCurrency, formatDate } from "@/lib/format";

export type ReceiptLine = {
  description: string;
  amount: number;
  line_type: string | null;
};

export type ReceiptPayment = {
  amount: number;
  payment_date: string;
  payment_method: string;
};

export type InvoiceReceiptData = {
  invoiceNumber: string;
  customerName: string;
  contractTitle: string;
  issueDate: string;
  dueDate: string;
  total: number;
  amountPaid: number;
  balance: number;
  lines: ReceiptLine[];
  payments: ReceiptPayment[];
};

function buildReceiptPdf(data: InvoiceReceiptData) {
  const doc = new jsPDF();
  const left = 20;
  let y = 22;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("GreenScape Commercial", left, y);
  y += 8;
  doc.setFontSize(12);
  doc.text("Payment Receipt", left, y);
  y += 12;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const meta = [
    `Invoice: ${data.invoiceNumber}`,
    `Customer: ${data.customerName}`,
    `Contract: ${data.contractTitle}`,
    `Issue date: ${formatDate(data.issueDate)}`,
    `Due date: ${formatDate(data.dueDate)}`,
  ];
  for (const line of meta) {
    doc.text(line, left, y);
    y += 6;
  }

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Line items", left, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  for (const line of data.lines) {
    const typeLabel = line.line_type?.replace("_", " ") ?? "line";
    const text = `${line.description} (${typeLabel})`;
    const amount = formatCurrency(Number(line.amount));
    doc.text(text, left, y, { maxWidth: 130 });
    doc.text(amount, 190, y, { align: "right" });
    y += 7;
    if (y > 270) {
      doc.addPage();
      y = 22;
    }
  }

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text("Payments received", left, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  for (const payment of data.payments) {
    let methodLabel = payment.payment_method.trim();
    if (/simulated/i.test(methodLabel)) {
      methodLabel =
        methodLabel
          .replace(/simulated[_ ]?/gi, "")
          .replaceAll("_", " ")
          .trim() || "Card ending in 4242";
      if (methodLabel.toLowerCase() === "card") {
        methodLabel = "Card ending in 4242";
      }
    }
    doc.text(
      `${formatDate(payment.payment_date)} · ${methodLabel}`,
      left,
      y
    );
    doc.text(formatCurrency(Number(payment.amount)), 190, y, {
      align: "right",
    });
    y += 7;
    if (y > 270) {
      doc.addPage();
      y = 22;
    }
  }

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text(`Invoice total: ${formatCurrency(data.total)}`, left, y);
  y += 6;
  doc.text(`Amount paid: ${formatCurrency(data.amountPaid)}`, left, y);
  y += 6;
  doc.text(`Balance due: ${formatCurrency(data.balance)}`, left, y);
  y += 12;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    "Thank you for your payment. This receipt is for your records.",
    left,
    y
  );

  return doc;
}

export function DownloadInvoiceReceiptButton({
  data,
  className,
  label = "Download receipt (PDF)",
}: {
  data: InvoiceReceiptData;
  className?: string;
  label?: string;
}) {
  function handleDownload() {
    const doc = buildReceiptPdf(data);
    doc.save(`GreenScape-Receipt-${data.invoiceNumber}.pdf`);
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className={
        className ??
        "rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
      }
    >
      {label}
    </button>
  );
}
