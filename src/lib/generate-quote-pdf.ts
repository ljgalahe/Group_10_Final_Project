import { jsPDF } from "jspdf";
import { formatCurrency, formatDate } from "@/lib/format";
import type { QuoteLineItem } from "@/lib/service-pricing";

export type QuotePdfData = {
  id: string;
  customerName: string;
  propertyAddress: string;
  serviceDescription: string;
  status: string;
  lineItems: QuoteLineItem[];
  visitsPerWeek: number | null;
  visitFrequencyNotes: string | null;
  seasonStart: string | null;
  seasonEnd: string | null;
  monthlyFee: number | null;
  notes: string | null;
  submittedAt: string | null;
  createdAt: string;
};

function ensureSpace(doc: jsPDF, y: number, need: number) {
  if (y + need > 280) {
    doc.addPage();
    return 20;
  }
  return y;
}

export function generateQuotePdf(data: QuotePdfData): jsPDF {
  const doc = new jsPDF();
  const left = 20;
  let y = 22;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("GreenScape Commercial", left, y);
  y += 8;
  doc.setFontSize(13);
  doc.text("Service Quote", left, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const meta = [
    `Customer: ${data.customerName}`,
    `Property: ${data.propertyAddress || "—"}`,
    `Status: ${data.status.replace(/_/g, " ")}`,
    `Created: ${formatDate(data.createdAt.slice(0, 10))}`,
    data.submittedAt
      ? `Submitted For Approval: ${formatDate(data.submittedAt.slice(0, 10))}`
      : null,
  ].filter(Boolean) as string[];

  for (const line of meta) {
    doc.text(line, left, y);
    y += 6;
  }

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text("Services Requested", left, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  const descLines = doc.splitTextToSize(
    data.serviceDescription || "—",
    170
  ) as string[];
  for (const line of descLines) {
    y = ensureSpace(doc, y, 6);
    doc.text(line, left, y);
    y += 5;
  }

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Proposed Line Items", left, y);
  y += 7;
  doc.setFont("helvetica", "normal");

  if (data.lineItems.length === 0) {
    doc.text("No line items listed.", left, y);
    y += 6;
  } else {
    doc.setFont("helvetica", "bold");
    doc.text("Service", left, y);
    doc.text("Acres", left + 85, y);
    doc.text("Unit", left + 110, y);
    doc.text("Total", left + 145, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    for (const li of data.lineItems) {
      y = ensureSpace(doc, y, 8);
      const label = doc.splitTextToSize(li.label, 80) as string[];
      doc.text(label[0] ?? li.label, left, y);
      doc.text(String(li.acres), left + 85, y);
      doc.text(formatCurrency(li.unitPrice), left + 110, y);
      doc.text(formatCurrency(li.lineTotal), left + 145, y);
      y += 6;
      for (let i = 1; i < label.length; i++) {
        y = ensureSpace(doc, y, 6);
        doc.text(label[i], left, y);
        y += 5;
      }
    }
  }

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Quote Terms", left, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  const terms = [
    `Visits Per Week: ${data.visitsPerWeek ?? "—"}`,
    data.visitFrequencyNotes
      ? `Frequency Notes: ${data.visitFrequencyNotes}`
      : null,
    data.seasonStart && data.seasonEnd
      ? `Season: ${formatDate(data.seasonStart)} – ${formatDate(data.seasonEnd)}`
      : null,
    `Monthly Fee: ${
      data.monthlyFee != null ? formatCurrency(data.monthlyFee) : "—"
    }`,
  ].filter(Boolean) as string[];

  for (const line of terms) {
    y = ensureSpace(doc, y, 6);
    const wrapped = doc.splitTextToSize(line, 170) as string[];
    for (const w of wrapped) {
      doc.text(w, left, y);
      y += 5;
    }
  }

  if (data.notes) {
    y += 4;
    y = ensureSpace(doc, y, 12);
    doc.setFont("helvetica", "bold");
    doc.text("Notes", left, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const noteLines = doc.splitTextToSize(data.notes, 170) as string[];
    for (const line of noteLines) {
      y = ensureSpace(doc, y, 6);
      doc.text(line, left, y);
      y += 5;
    }
  }

  y = ensureSpace(doc, y, 16);
  y += 8;
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(
    "This quote is proposed for management review. Pricing is based on surveyed acreage and GreenScape service rates.",
    left,
    y
  );

  return doc;
}

export function quotePdfFilename(customerName: string, quoteId: string) {
  const slug = customerName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  return `GreenScape-Quote-${slug || "Customer"}-${quoteId.slice(0, 8)}.pdf`;
}
