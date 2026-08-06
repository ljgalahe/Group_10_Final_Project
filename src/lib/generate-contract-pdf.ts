import { jsPDF } from "jspdf";
import { formatCurrency, formatDate } from "@/lib/format";

export type ContractPdfService = {
  service_name: string;
  included: boolean;
};

export type ContractPdfData = {
  id: string;
  title: string;
  customerName: string;
  propertyAddress: string | null;
  contactName: string | null;
  statusLabel: string;
  seasonStart: string;
  seasonEnd: string;
  monthlyFee: number | null;
  visitsPerWeek: number | null;
  billingMethod: string;
  notes: string | null;
  services: ContractPdfService[];
  customerSignedAt: string | null;
  customerSignatureName: string | null;
};

function ensureSpace(doc: jsPDF, y: number, need: number) {
  if (y + need > 280) {
    doc.addPage();
    return 20;
  }
  return y;
}

export function generateContractPdf(data: ContractPdfData): jsPDF {
  const doc = new jsPDF();
  const left = 20;
  let y = 22;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("GreenScape Commercial", left, y);
  y += 8;
  doc.setFontSize(13);
  doc.text("Service Contract", left, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const meta = [
    `Title: ${data.title}`,
    `Customer: ${data.customerName}`,
    `Property: ${data.propertyAddress || "—"}`,
    `Contact: ${data.contactName || "—"}`,
    `Status: ${data.statusLabel.replace(/_/g, " ")}`,
  ];
  for (const line of meta) {
    doc.text(line, left, y);
    y += 6;
  }

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text("Agreement Terms", left, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  const terms = [
    `Season: ${formatDate(data.seasonStart)} – ${formatDate(data.seasonEnd)}`,
    `Monthly Fee: ${
      data.monthlyFee != null ? formatCurrency(data.monthlyFee) : "—"
    }`,
    `Visit Frequency: ${
      data.visitsPerWeek != null
        ? `${data.visitsPerWeek} visits per week`
        : "—"
    }`,
    `Billing Method: ${data.billingMethod.replace(/_/g, " ")}`,
  ];
  for (const line of terms) {
    y = ensureSpace(doc, y, 6);
    doc.text(line, left, y);
    y += 6;
  }

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text("Included Services", left, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  if (data.services.length === 0) {
    doc.text("No services listed.", left, y);
    y += 6;
  } else {
    for (const service of data.services) {
      y = ensureSpace(doc, y, 6);
      doc.text(
        `• ${service.service_name} (${service.included ? "Included" : "Add-on"})`,
        left,
        y
      );
      y += 6;
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

  if (data.customerSignedAt) {
    y += 6;
    y = ensureSpace(doc, y, 14);
    doc.setFont("helvetica", "bold");
    doc.text("Customer Signature", left, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.text(
      `Signed by: ${data.customerSignatureName || "Customer"}`,
      left,
      y
    );
    y += 6;
    doc.text(
      `Signed on: ${formatDate(data.customerSignedAt.slice(0, 10))}`,
      left,
      y
    );
  }

  y = ensureSpace(doc, y, 16);
  y += 10;
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(
    "Official GreenScape commercial service agreement. Retain this PDF for your records.",
    left,
    y
  );

  return doc;
}

export function contractPdfFilename(title: string, contractId: string) {
  const slug = title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  return `GreenScape-Contract-${slug || "Agreement"}-${contractId.slice(0, 8)}.pdf`;
}
