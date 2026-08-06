"use client";

import {
  contractPdfFilename,
  generateContractPdf,
  type ContractPdfData,
} from "@/lib/generate-contract-pdf";

export function DownloadContractPdfButton({
  data,
  label = "Download Contract PDF",
  className = "rounded-md border border-green-800 px-3 py-1.5 text-xs font-medium text-green-900 hover:bg-green-50",
}: {
  data: ContractPdfData;
  label?: string;
  className?: string;
}) {
  function handleDownload() {
    const doc = generateContractPdf(data);
    doc.save(contractPdfFilename(data.title, data.id));
  }

  return (
    <button type="button" onClick={handleDownload} className={className}>
      {label}
    </button>
  );
}
