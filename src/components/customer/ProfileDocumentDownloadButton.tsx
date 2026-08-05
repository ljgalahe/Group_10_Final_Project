"use client";

import { jsPDF } from "jspdf";
import { formatDate } from "@/lib/format";

export type ProfileDocument = {
  id: string;
  title: string;
  description: string;
  issuedOn: string;
  expiresOn?: string | null;
  kind: "coi" | "w9" | "agreement";
};

function downloadPdf(doc: jsPDF, filename: string) {
  doc.save(filename);
}

function buildCoi(
  customerName: string,
  address: string,
  issuedOn: string,
  expiresOn: string
) {
  const doc = new jsPDF();
  let y = 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("CERTIFICATE OF LIABILITY INSURANCE", 20, y);
  y += 10;
  doc.setFontSize(11);
  doc.text("GreenScape Commercial Services", 20, y);
  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const lines = [
    `Certificate holder: ${customerName}`,
    `Property / operations address: ${address}`,
    `Issue date: ${formatDate(issuedOn)}`,
    `Policy period ends: ${formatDate(expiresOn)}`,
    "",
    "Coverages (demo summary):",
    "  Commercial General Liability — $2,000,000 each occurrence",
    "  Automobile Liability — $1,000,000 combined single limit",
    "  Workers' Compensation — Statutory / $1,000,000 employer liability",
    "",
    "This is a demo certificate generated for the GreenScape class project.",
    "It is not a real ACORD form and has no legal force.",
  ];
  for (const line of lines) {
    doc.text(line, 20, y);
    y += 7;
  }
  downloadPdf(doc, "GreenScape-COI-2026.pdf");
}

function buildW9(customerName: string, issuedOn: string) {
  const doc = new jsPDF();
  let y = 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Form W-9 (Request for Taxpayer Identification)", 20, y);
  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const lines = [
    "Name (as shown on income tax return): GreenScape Commercial LLC",
    "Business name: GreenScape Commercial Services",
    "Federal tax classification: Limited liability company (C-Corp election)",
    "Address: 100 Commerce Drive, Oxford, MS 38655",
    "",
    `Provided for vendor setup — ${customerName}`,
    `Document date: ${formatDate(issuedOn)}`,
    "",
    "Taxpayer Identification Number (demo): ***-**-****",
    "",
    "Demo only — not a substitute for a signed IRS W-9.",
  ];
  for (const line of lines) {
    doc.text(line, 20, y);
    y += 7;
  }
  downloadPdf(doc, "GreenScape-W9.pdf");
}

function buildAgreement(
  customerName: string,
  address: string,
  issuedOn: string
) {
  const doc = new jsPDF();
  let y = 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Seasonal Service Agreement (Summary)", 20, y);
  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const lines = [
    `Customer: ${customerName}`,
    `Service site: ${address}`,
    `Agreement year: 2026`,
    `Document date: ${formatDate(issuedOn)}`,
    "",
    "This summary confirms GreenScape Commercial's seasonal grounds",
    "maintenance package for the property above, including mowing,",
    "edging, and included service visits under active contract terms.",
    "",
    "Full commercial terms live in your Contracts portal. This PDF is a",
    "vendor-file copy for procurement / facilities records (demo).",
  ];
  for (const line of lines) {
    doc.text(line, 20, y);
    y += 7;
  }
  downloadPdf(doc, "GreenScape-Service-Agreement-2026.pdf");
}

export function ProfileDocumentDownloadButton({
  document: item,
  customerName,
  address,
}: {
  document: ProfileDocument;
  customerName: string;
  address: string;
}) {
  function handleDownload() {
    if (item.kind === "coi") {
      buildCoi(
        customerName,
        address,
        item.issuedOn,
        item.expiresOn ?? item.issuedOn
      );
      return;
    }
    if (item.kind === "w9") {
      buildW9(customerName, item.issuedOn);
      return;
    }
    buildAgreement(customerName, address, item.issuedOn);
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="rounded-lg border border-green-800 px-3 py-1.5 text-sm font-medium text-green-900 hover:bg-green-50"
    >
      Download PDF
    </button>
  );
}
